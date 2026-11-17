// Legal references are resolved against the imported, versioned corpus.
// Ambiguous or unavailable references remain explicit source links.
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const routeFor = (doc, section, block = '') => `#/read/${encodeURIComponent(doc)}/${encodeURIComponent(section)}${block ? '?block='+encodeURIComponent(block) : ''}`;
const normalize = n => String(n).replace(/[\s\u00a0]/g,'').replace(/[（]/g,'(').replace(/[）]/g,')');
let index = null;
export function setReferenceIndex(value) { index = value; }
export function getReferenceIndex() { return index; }
function actFor(doc) { return doc.startsWith('citizenship') ? 'citizenship-act' : doc.startsWith('art-') ? 'art-act' : 'migration-act'; }
export function resolveReference(number, type, ctx, around = '') {
  if (!index) return null;
  const full = normalize(number), base = full.split('(')[0];
  let doc = ctx.docId, key = base;
  const label = (type || '').toLowerCase();
  if (/^\(/.test(full)) key = ctx.number || '';
  if (/subclass|簽證類別|子類別/.test(label)) return index.docs['migration-regulations']?.sections.some(s=>new RegExp('^Subclass\\s+'+base+'(?:\\D|$)').test(s.title)) ? {doc:'migration-regulations',visa:base,label:`Subclass ${base}`} : null;
  const namedAct=around.match(/of (?:the )?([A-Z][A-Za-z ()–—-]+? Act)(?:\s+\d{4})?/);
  if(namedAct&&!/^(?:Migration|Australian Citizenship|Administrative Review Tribunal) Act$/.test(namedAct[1]))return null;
  if(namedAct)doc=/Citizenship/.test(namedAct[1])?'citizenship-act':/Review Tribunal/.test(namedAct[1])?'art-act':'migration-act';
  else if (!/regulation|condition|criterion|criteria|附加條件|準則/.test(label)&&/\bact\s*[,，]\s*s|\bof the act\b|\bof the migration act\b|移民法/.test(around.toLowerCase())) doc = actFor(ctx.docId);
  else if (/condition|criterion|criteria|附加條件|準則/.test(label) || /^([458]\d{3})$/.test(base)) doc = 'migration-regulations';
  else if (/regulation|規例|規則/.test(label)) doc = /^(agents-regulations|citizenship-regulations|art-rules)$/.test(doc) ? doc : 'migration-regulations';
  else if (/section|^ss?\.?$|條/.test(label)) doc = doc === 'migration-regulations' ? 'migration-act' : doc;
  else if (/^\d{1,3}\.\d{2,3}[A-Za-z]*$/.test(base)&&!index.byNumber?.[doc]?.[base]) doc = 'migration-regulations';
  let candidates = index.byNumber?.[doc]?.[key] || [];
  if (/schedule|附表/.test(label)) candidates = (index.docs[doc]?.sections || []).filter(s => new RegExp(`^Schedule\\s*${base}(?:\\D|$)`,'i').test(s.title));
  if (/part|division|部|分部/.test(label)) candidates = (index.docs[doc]?.sections || []).filter(s => new RegExp(`^${/division|分部/.test(label)?'Division':'Part'}\\s*${base}(?:\\D|$)`,'i').test(s.title));
  if (!candidates.length && doc !== ctx.docId && !/act|condition|criterion|criteria|附加條件|準則/.test(label+' '+around.toLowerCase())) candidates = index.byNumber?.[ctx.docId]?.[key] || [];
  if (!candidates.length) return null;
  const sharedPath=s=>{let n=0;while(n<(s.path?.length||0)&&n<(ctx.path?.length||0)&&s.path[n]===ctx.path[n])n++;return n;};
  let chosen = candidates.find(s => s.id === ctx.sectionId) || [...candidates].sort((a,b)=>sharedPath(b)-sharedPath(a))[0];
  let suffix=full.startsWith('(')?full:full.slice(base.length);
  if(full.startsWith('(')&&ctx.ancestors?.length){
    const token=full.match(/^\(([^)]+)\)/)?.[1];
    if(token&&!/^\d/.test(token)&&/paragraph|項/.test(label)){
      const depth=/subparagraph/.test(label)||(/^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(token)&&ctx.ancestors.length>1)?2:1;
      suffix=ctx.ancestors.slice(0,depth).map(x=>'('+x+')').join('')+full;
    }
  }
  return {...chosen, doc:chosen.doc || doc, suffix, label:number};
}
export function referenceHref(target) {
  return target.visa ? `#/visa/${target.doc}/${target.visa}` : routeFor(target.doc,target.id) + (target.suffix ? '?sub='+encodeURIComponent(target.suffix) : '');
}
export function linkify(text, ctx) {
  text = String(text || '');
  const hits = [];
  // Forms are not visa subclasses. Retired paper forms point to the official
  // application guidance rather than a guessed PDF download.
  const formSources={
    '888':{url:'https://immi.homeaffairs.gov.au/form-listing/forms/888.pdf',label:'Form 888：官方現行表格'},
    '956':{url:'https://immi.homeaffairs.gov.au/form-listing/forms/956.pdf',label:'Form 956：官方委任表格'},
    '40SP':{url:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore/temporary-820',label:'Form 40SP：官方伴侶簽證申請及擔保說明（歷史表格編號）'},
    '47SP':{url:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore/temporary-820',label:'Form 47SP：官方伴侶簽證申請說明（歷史表格編號）'}
  };
  for(const mention of text.matchAll(/\b(?:Form\s*(\d+[A-Za-z]*)|((?:40|47)SP))\b/gi)){
    const form=formSources[(mention[1]||mention[2]).toUpperCase()];
    if(form)hits.push({start:mention.index,end:mention.index+mention[0].length,html:`<a href="${escapeHtml(form.url)}" class="ref-link" data-ref-external="true" data-ref-label="${escapeHtml(form.label)}" title="${escapeHtml(form.label)}" target="_blank" rel="noopener">${escapeHtml(mention[0])}</a>`});
  }
  // Visa references in Chinese often put the number before 簽證, or omit
  // that noun after an explicit verb such as 持有. Resolve only known subclasses;
  // never treat a year, duration, amount, or provision number as a visa.
  const visaNumbers='(?<![\\d.])\\d{3}(?![\\d.])(?:\\s*(?:、|，|,|/|／|及|與|或|和|and|or|&)\\s*\\d{3}(?![\\d.]))*';
  const visaPatterns=[
    new RegExp('('+visaNumbers+')\\s*(?:類(?:別)?|號)?\\s*(?:[（(][^（）()\\n]{1,45}[）)]\\s*)?(?:簽證|\\bvisas?\\b)','giu'),
    new RegExp('(?:Subclass(?:es)?|簽證子類別|簽證類別|簽證|子類別|子類)\\s*('+visaNumbers+')(?![\\d.])','giu'),
    new RegExp('(?:持有(?:過)?|獲批|申請|轉為|取得|承接)\\s*('+visaNumbers+')(?!\\s*(?:年|月|週|周|天|日|小時|人|元|澳元|份|筆|%|％|章|條|號))','gu'),
    new RegExp('('+visaNumbers+')\\s*(?:伴侶|學生|工作|訪客|永久|臨時)?\\s*(?:申請|提名|獲批|拒簽|被拒|被批准|擔保)','gu')
  ];
  for(const [kind,pattern] of visaPatterns.entries())for(const mention of text.matchAll(pattern)){
    const offset=mention.index+mention[0].indexOf(mention[1]);
    for(const number of mention[1].matchAll(/\d{3}/g)){
      const start=offset+number.index,end=start+3;
      if(hits.some(hit=>start<hit.end&&end>hit.start))continue;
      const target=resolveReference(number[0],'Subclass',ctx);
      if(target)hits.push({start,end,html:`<a href="${escapeHtml(referenceHref(target))}" class="ref-link" data-ref-doc="${escapeHtml(target.doc)}" data-ref-visa="${escapeHtml(target.visa)}" data-ref-label="${escapeHtml('Subclass '+target.visa)}">${escapeHtml(number[0])}</a>`});
      else if(kind<2&&ctx.sourceUrl)hits.push({start,end,html:`<a href="${escapeHtml(ctx.sourceUrl)}" class="ref-link" data-ref-external="true" data-ref-label="${escapeHtml('Subclass '+number[0]+'（本書庫未收錄）')}" target="_blank" rel="noopener">${escapeHtml(number[0])}</a>`});
    }
  }
  // Keep subsection suffixes as part of the exact reference rather than reducing to a heading.
  const patterns = [
    /\b(Act,\s*s\.?|subparagraphs?|subregulations?|subsections?|regulations?|paragraphs?|subclauses?|sections?|clauses?|conditions?|criteri(?:on|a)|Schedules?|Subclass(?:es)?|Parts?|Divisions?|items?)\s+((?:\d+[A-Za-z]*(?:\.\d+[A-Za-z]*)?|\([\da-zA-Z]+\))(?:\([\da-zA-Z]+\))*)/gi,
    /\b(\d{1,3}\.\d{2,3}[A-Za-z]*(?:\([\da-zA-Z]+\))*)(?![\w.])/g,
    /\b([458]\d{3})(?:\b)/g,
    /(第?\s*)(\d+[A-Za-z]*(?:\.\d+)?(?:[（(][\da-zA-Z]+[）)])*)\s*(條|款|項|附加條件|準則)/g,
    /(附表|簽證類別|子類別)\s*(\d+[A-Za-z]*)/g,
    /\b(?:Migration|Australian Citizenship|Administrative Review Tribunal|Migration Agents)\s+(?:Act|Regulations?|Rules)\s+\d{4}\b/g,
    /第\s*((?:[（(][\da-zA-Z]+[）)])(?:\s*(?:、|，|,|或|及|和)\s*(?:[（(][\da-zA-Z]+[）)]))*)\s*(款|項)/g,
    /\b(ss?\.?)\s*(\d+[A-Za-z]*(?:\([\da-zA-Z]+\))*)/g
  ];
  patterns.forEach((pattern, pi) => {
    for (const m of text.matchAll(pattern)) {
      const start=m.index, end=start+m[0].length;
      if (hits.some(h => start < h.end && end > h.start)) continue;
      if(pi===6){
        const listOffset=start+m[0].indexOf(m[1]);
        for(const n of m[1].matchAll(/[（(][\da-zA-Z]+[）)]/g)){
          const target=resolveReference(n[0],m[2],ctx);
          if(target)hits.push({start:listOffset+n.index,end:listOffset+n.index+n[0].length,html:`<a href="${escapeHtml(referenceHref(target))}" class="ref-link" data-ref-doc="${escapeHtml(target.doc)}" data-ref-section="${escapeHtml(target.id)}" data-ref-sub="${escapeHtml(target.suffix||'')}" data-ref-label="${escapeHtml('第 '+n[0]+' '+m[2])}">${escapeHtml(n[0])}</a>`});
        }
        continue;
      }
      if(pi===5){
        const name=m[0]; let doc=/Citizenship/.test(name)?(/Act/.test(name)?'citizenship-act':'citizenship-regulations'):/Review Tribunal/.test(name)?(/Act/.test(name)?'art-act':'art-rules'):/Agents/.test(name)?'agents-regulations':/Act/.test(name)?'migration-act':'migration-regulations';
        hits.push({start,end,html:`<a href="#/book/${doc}" class="ref-link" data-ref-doc="${doc}" data-ref-label="${escapeHtml(name)}">${escapeHtml(m[0])}</a>`});continue;
      }
      let number,type;
      if(pi===0||pi===7){type=m[1];number=m[2];}
      else if(pi===3){type=m[3];number=m[2];}
      else if(pi===4){type=m[1];number=m[2];}
      else {number=m[1];type='';}
      const around=text.slice(Math.max(0,start-10),Math.min(text.length,end+70));
      const target=resolveReference(number,type,ctx,around);
      // Bare numbers are only links when the imported corpus identifies them.
      if(!target && pi!==0 && pi!==3 && pi!==4 && pi!==7) continue;
      const href=target?referenceHref(target):ctx.sourceUrl;
      const attrs=target?`data-ref-doc="${escapeHtml(target.doc)}" ${target.visa?`data-ref-visa="${escapeHtml(target.visa)}"`:`data-ref-section="${escapeHtml(target.id)}" data-ref-sub="${escapeHtml(target.suffix||'')}"`}`:`data-ref-external="true" target="_blank" rel="noopener"`;
      hits.push({start,end,html:`<a href="${escapeHtml(href)}" class="ref-link" ${attrs} data-ref-label="${escapeHtml(m[0])}">${escapeHtml(m[0])}</a>`});
      if(pi===0||pi===7){
        let offset=end;
        for(let i=0;i<10;i++){
          const next=text.slice(offset).match(/^(\s*(?:,|、|and|or)\s*)((?:\d+[A-Za-z]*(?:\.\d+[A-Za-z]*)?|\([\da-zA-Z]+\))(?:\([\da-zA-Z]+\))*)/i);
          if(!next)break;
          const ns=offset+next[1].length,ne=ns+next[2].length;
          const target=resolveReference(next[2],type,ctx,around);
          if(target&&!hits.some(h=>ns<h.end&&ne>h.start))hits.push({start:ns,end:ne,html:`<a href="${escapeHtml(referenceHref(target))}" class="ref-link" data-ref-doc="${escapeHtml(target.doc)}" ${target.visa?`data-ref-visa="${escapeHtml(target.visa)}"`:`data-ref-section="${escapeHtml(target.id)}" data-ref-sub="${escapeHtml(target.suffix||'')}"`} data-ref-label="${escapeHtml(type+' '+next[2])}">${escapeHtml(next[2])}</a>`});
          offset=ne;
        }
      }
    }
  });
  hits.sort((a,b)=>a.start-b.start);
  let cursor=0,result='';
  for(const h of hits){result+=escapeHtml(text.slice(cursor,h.start))+h.html;cursor=h.end;}
  return result+escapeHtml(text.slice(cursor));
}
