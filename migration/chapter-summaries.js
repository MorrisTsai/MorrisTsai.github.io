import {escapeHtml as esc,routeFor,linkify} from './references.js';

export function mergeSummaries(collections){
 const merged={};
 for(const collection of collections)for(const [doc,value] of Object.entries(collection||{})){
  if(!value||(!value.groups&&!value.sections))continue;
  merged[doc] ||= {groups:{},sections:{}};
  Object.assign(merged[doc].groups,value.groups||{});
  Object.assign(merged[doc].sections,value.sections||{});
 }
 return merged;
}
function commonPath(sections){
 let path=[...(sections[0]?.path||[])];
 for(const s of sections){let i=0;while(i<path.length&&s.path?.[i]===path[i])i++;path=path.slice(0,i);}
 return path;
}
export function summaryGroup(doc,sections,data,requested){
 const groups=data[doc.id]?.groups||{},path=commonPath(sections);
 if(sections.length===1){const s=sections[0];const exact=groups[s.id]||groups[s.title]||groups[JSON.stringify([...(s.path||[]),s.title])];if(exact)return{group:exact,key:s.id};}
 for(let i=path.length;i>0;i--){const prefix=path.slice(0,i);const group=groups[JSON.stringify(prefix)]||groups[prefix.at(-1)];if(group)return {group,key:JSON.stringify(prefix)};}
 for(const s of [requested,...sections].filter(Boolean)){const group=groups[s.id]||groups[s.title];if(group)return{group,key:s.id};}
 return null;
}
function sourceHeadingSummary(doc,s,title){
 const en=s.blocks.map(b=>b.en).join(' ');
 if(!s.blocks.length)return '這是章節標題。具體要求寫在下屬條文中，請由本頁目錄選讀。';
 if(/may be in or outside Australia,? but not in immigration clearance/i.test(en))return '批准時可以在澳洲境內或境外，但當時不能正在辦理入境查驗；這條處理批准當下的位置。';
 if(/All applicants must satisfy the primary criteria/i.test(en)&&/no secondary criteria/i.test(en))return '這個部分沒有另設次要條件；所有申請人都要符合主要條件。';
 if(/\bpublic interest criteri(?:a|on)\b/i.test(en)&&/^(?:\([^)]+\)\s*)?The applicant (?:satisfies|meets|must satisfy)/i.test(en)){
  const criteria=[...new Set(en.match(/\b40\d{2}[A-Z]?\b/g)||[])];
  if(criteria.length)return '申請人要符合本條列出的公共利益準則，包括 '+criteria.join('、')+'。這些編號連到各準則的具體要求，應逐一核對。';
 }
 if(/^\d{3}\.\d{3}$/.test(s.title.trim())){
  const parent=s.path?.at(-1)||'';
  if(/Criteria to be satisfied at time of application/i.test(parent))return '這是提出申請時要檢查的一項資格。它屬於本頁簽證的申請時條件，與批准時才檢查的條件分開列出。';
  if(/Criteria to be satisfied at time of decision/i.test(parent))return '這是作出決定時要檢查的一項資格。提出申請時符合要求，仍須再核對本條在批准時要求的情況。';
  if(/Conditions/i.test(parent))return '這一條指定簽證適用的附加條件。條件編號所連結的內容，決定持有人獲批後必須遵守什麼。';
 }
 const label=title.replace(new RegExp('^'+String(s.number||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\s　·—–-]*'),'').trim();
 return label&&label!==s.number?'這一條處理「'+label+'」。下方保留完整中英條文，連同限制、例外與引用一起核對。':'這一條列出本頁主題的一項具體要求；須連同它引用的分款與例外閱讀。';
}
export function buildPageSummary(doc,sections,data,requested,titleFor){
 const entry=data[doc.id]||{groups:{},sections:{}};
 const selected=summaryGroup(doc,sections,data,requested);
 const group=selected?.group;
 const seen=new Set(),rows=[];
 for(const s of sections){
  const capsule=entry.sections?.[s.id];
  const authored=typeof capsule==='string'?capsule:capsule?.text;
  const point=(group?.points||[]).find(p=>(p.sections||p.sectionIds||[]).includes(s.id)&&!seen.has(p.text));
  const text=authored||point?.text||sourceHeadingSummary(doc,s,titleFor(s));
  if(seen.has(text)){rows.find(row=>row.text===text).sections.push(s.id);continue;}seen.add(text);
  rows.push({text,sections:[s.id],method:authored?(capsule?.method||'editorial'):point?'editorial-group-point':'source-heading-guide'});
 }
 const overview=group?.overview||entry.sections?.[requested?.id]?.text||rows.find(r=>r.method!=='source-heading-guide')?.text||'';
 return {title:group?.titleZh||'這一頁在講什麼',overview,rows,caution:group?.caution||'',groupKey:selected?.key||null,hasSpecificSummary:!!overview&&!!(group||rows.some(r=>r.method!=='source-heading-guide'))};
}
function sourceLink(doc,s,label){return `<a class="ref-link summary-source" href="${routeFor(doc.id,s.id)}" data-summary-jump="${esc(s.id)}" data-ref-doc="${esc(doc.id)}" data-ref-section="${esc(s.id)}" data-ref-label="${esc(s.number||label)}">${esc(s.number||label)}</a>`;}
export function renderPageSummary(doc,sections,data,requested,titleFor){
 const summary=buildPageSummary(doc,sections,data,requested,titleFor);
 if(!summary.hasSpecificSummary)return '';
 const first=sections[0];const ctx={docId:doc.id,sectionId:first?.id,number:first?.number,path:first?.path,sourceUrl:first?.sourceUrl||doc.sourceUrl};
 const rowContext=row=>{const section=sections.find(s=>s.id===row.sections[0]);return section?{docId:doc.id,sectionId:section.id,number:section.number,path:section.path,sourceUrl:section.sourceUrl}:ctx;};
 const last=sections.at(-1);const range=first?.number?`本頁 ${first.number}${last!==first&&last?.number?' — '+last.number:''} · ${sections.length} 條規定`:'';
 // A chapter overview is a summary. Repeating an unexplained heading is not.
 summary.rows=summary.rows.filter(row=>row.method!=='source-heading-guide'||!/^這一條處理|^這一條列出本頁主題|^這是提出申請時要檢查|^這是作出決定時要檢查|^這一條指定簽證適用|^這是章節標題/.test(row.text));
 const fallbackSources=summary.rows.length?'':'<div class="summary-citations">本頁對照：'+sections.map(section=>sourceLink(doc,section,titleFor(section))).join('、')+'</div>';
 return `<section class="chapter-summary" aria-labelledby="chapter-summary-title"><div class="summary-eyebrow">先理解，再讀條文 <span>編輯摘要 · 非條文原文</span></div><h2 id="chapter-summary-title">${esc(summary.title)}</h2>${range?`<div class="summary-range">${esc(range)}</div>`:''}<p class="summary-overview">${linkify(summary.overview,ctx)}</p>${summary.rows.length?'<h3>這一頁要掌握的重點</h3>':''}<ol class="summary-points">${summary.rows.map(row=>`<li><p>${linkify(row.text,rowContext(row))}</p><div class="summary-citations">對照 ${row.sections.map(id=>{const s=doc.sections.find(s=>s.id===id);return s?sourceLink(doc,s,titleFor(s)):'';}).join('、')}</div></li>`).join('')}</ol>${fallbackSources}${summary.caution?`<p class="summary-caution"><strong>注意</strong> ${linkify(summary.caution,ctx)}</p>`:''}<footer><span>摘要選列本頁重點；完整條件與例外以原文為準。</span>${first?`<a href="${routeFor(doc.id,first.id)}" data-summary-jump="${esc(first.id)}">往下讀條文 ↓</a>`:''}</footer></section>`;
}
