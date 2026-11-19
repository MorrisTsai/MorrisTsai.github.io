import {resolveReference} from './references.js';
const ACT='migration-act',REG='migration-regulations';
const packs=[
 {test:/打工度假|working\s*holiday|(?:417|462)(?!\d)/i,refs:[[REG,'417.411'],[REG,'417.412'],[REG,'462.411'],[REG,'462.412'],[ACT,'81'],[ACT,'82']]},
 {test:/返澳簽證|居民返澳|resident\s*return|\brrv\b|(?:155|157)(?!\d)/i,refs:[[REG,'155.211'],[REG,'155.212'],[REG,'155.213'],[REG,'155.511']]},
 {test:/8503|不得進一步停留|no\s*further\s*stay/i,refs:[[REG,'8503'],[REG,'2.05'],[ACT,'41'],[ACT,'46'],[REG,'2.06AAB']]},
 {test:/補件|不利資訊|relevant\s*information|邀請.*評論|程序公[平正]/i,refs:[[ACT,'54'],[ACT,'55'],[ACT,'56'],[ACT,'57'],[ACT,'58']]},
 {test:/學生.*(?:打工|工作)|(?:打工|工作).*學生|8105/i,refs:[[REG,'8105'],[REG,'500.611']]},
 {test:/過橋|bridging|(?:010|020)簽/i,refs:[[REG,'010.511'],[REG,'020.511'],[ACT,'82']]},
];
function terms(question){
 const stop=new Set(['可以','是否','什麼','為什麼','怎麼','如何','我的','我們','這個','那個','請問','如果','根據','只有','需要','必須','問題','申請人','澳洲','簽證','the','and','can','visa','australia']);
 const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('zh-Hant',{granularity:'word'}).segment(question)].filter(x=>x.isWordLike).map(x=>x.segment):question.match(/[a-z0-9.]+|[\p{Script=Han}]{2,}/giu)||[];
 return [...new Set(segments.map(x=>x.toLowerCase()).filter(x=>x.length>1&&!stop.has(x)))].slice(0,24);
}
export async function retrieveLawContext(question,{index,loadDoc,loadSearch,maxSources=10,maxCharacters=50000}){
 const picked=new Map(),omitted=[],seeds=[];
 const add=(doc,number,weight=500)=>{const matches=index.byNumber?.[doc]?.[number]||[];for(const s of matches.filter(s=>!s.isHeading))seeds.push({...s,doc,score:weight});};
 for(const p of packs)if(p.test.test(question))for(const [doc,n]of p.refs)add(doc,n);
 // Exact provision references rank above topic suggestions.
 for(const m of question.matchAll(/\b\d{1,3}\.\d{2,3}[A-Za-z]*\b/g))add(REG,m[0],1000);
 for(const m of question.matchAll(/(?:\bs(?:ection)?\.?\s*|第\s*)(\d+[A-Za-z]*)(?:\s*條)?/gi))add(ACT,m[1],1000);
 for(const m of question.matchAll(/\b[458]\d{3}\b/g))add(REG,m[0],1000);
 // English and Chinese text search is local. It never consumes model requests.
 if(!seeds.length){
  const queryTerms=terms(question),entries=await loadSearch();
  for(const entry of entries){if(entry.isHeading||![ACT,REG].includes(entry.doc))continue;const title=(entry.number+' '+entry.title+' '+entry.zh).toLowerCase(),body=String(entry.text||'').toLowerCase();let score=0,hits=0;for(const term of queryTerms){if(title.includes(term)){score+=12;hits++;}else if(body.includes(term)){score+=2;hits++;}}if(score&&hits>=Math.min(2,queryTerms.length))seeds.push({...entry,score});}
 }
 seeds.sort((a,b)=>b.score-a.score);let characters=0;
 async function include(ref,reason){
  const id=ref.doc+':'+ref.id;if(picked.has(id))return picked.get(id);
  if(picked.size>=maxSources){omitted.push(`${ref.doc} ${ref.number||ref.id}（超過本題來源上限）`);return null;}
  const doc=await loadDoc(ref.doc),section=doc.sections.find(s=>s.id===ref.id);if(!section||section.isHeading)return null;
  const blocks=section.blocks.filter(b=>typeof b.en==='string'&&b.en.trim()).map(b=>({id:b.id,en:b.en}));
  const size=blocks.reduce((n,b)=>n+b.en.length,0);if(!size)return null;
  if(characters+size>maxCharacters){omitted.push(`${doc.title} ${section.number}（完整條文超過本題長度上限，未截斷送出）`);return null;}
  const source={id,doc:doc.id,document:doc.title,version:doc.version,number:section.number,title:section.title,sectionId:section.id,sourceUrl:section.sourceUrl,blocks,path:section.path,reason};picked.set(id,source);characters+=size;return source;
 }
 const uniqueSeeds=[...new Map(seeds.map(s=>[s.doc+':'+s.id,s])).values()];
 for(const ref of uniqueSeeds.slice(0,8))await include(ref,'question');
 for(const ref of uniqueSeeds.slice(8))omitted.push(`${ref.doc} ${ref.number||ref.id}（其他搜尋結果，尚未附上）`);
 const initial=[...picked.values()];
 // Expand one explicit reference level, recording references left out of scope.
 for(const source of initial){
  const text=source.blocks.map(b=>b.en).join('\n');let expanded=0;
  for(const m of text.matchAll(/\b(section|subsection|regulation|subregulation|clause|subclause|condition|criterion|paragraph)\s+(\d+(?:\.\d+)?[A-Za-z]*(?:\([^)]+\))*)/gi)){
   const target=resolveReference(m[2],m[1],{docId:source.doc,number:source.number,sectionId:source.sectionId,path:source.path},text.slice(Math.max(0,m.index-15),m.index+m[0].length+70));
   if(!target||target.visa||![ACT,REG].includes(target.doc)){omitted.push(`${m[1]} ${m[2]}（交叉引用未附完整來源）`);continue;}
   if(picked.has(target.doc+':'+target.id))continue;
   if(expanded>=2){omitted.push(`${target.doc} ${target.number}（其他交叉引用，尚未展開）`);continue;}
   await include(target,'cross-reference');expanded++;
  }
 }
 return {sources:[...picked.values()],omitted:[...new Set(omitted)].slice(0,30),characters,limited:true};
}
