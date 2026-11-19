// Conclusions are rendered from narrowly scoped, source-locked rules. An LLM
// never decides the connective (and/or), supplies missing facts, or changes a rule.
const ACT='migration-act',REG='migration-regulations';
const find=(sources,doc,number)=>sources.find(s=>s.doc===doc&&s.number===number);
async function sourceMatches(source,locks){
 const lock=locks?.sources?.[source?.id];if(!source||!lock||source.version!==lock.version)return false;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({version:source.version,blocks:source.blocks.map(b=>({id:b.id,en:b.en}))})));
 const hash=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');return hash===lock.sha256;
}
function quote(source,index){const block=source?.blocks[index];if(!block)throw Error('Missing locked paragraph');return {source_id:source.id,block_id:block.id,quote:block.en};}
const result=(rule,status,answer,citations=[],questions=[])=>({mode:'verified_rule',rule,status,answer,citations,questions});
export async function strictAnswer(question,sources,{locks,facts={},scope='current'}={}){
 if(scope!=='saved')return result('current-law-unverified','need_sources','目前尚未完成現行法規及修法過渡規定的核對，不能據保存版本判斷你現在能否申請、旅行或獲批。下方僅提供保存版本供比對，本題不作現行法律結論。',[],['需要核對適用日期的官方法規、修法及過渡規定；若只研究保存版本，請明確切換研讀範圍。']);
 const q=String(question),section=(doc,n)=>find(sources,doc,n);
 const checks=async refs=>{const list=refs.map(([doc,n])=>section(doc,n));return list.every(Boolean)&&(await Promise.all(list.map(s=>sourceMatches(s,locks)))).every(Boolean);};
 const changed=()=>result('source-lock','need_sources','這項規則的來源版本或完整文字尚未通過核對，本題暫不顯示法律結論。請先查閱下方原文。',[],['需要先核對來源變更，再更新對應規則。']);
 if(/費率|費用|申請費|多少澳幣|政府.*費/.test(q)&&/20\d{2}/.test(q)){
  const latestYear=Math.max(...sources.map(s=>Number(s.version?.slice(0,4))||0));
  const future=[...q.matchAll(/20\d{2}/g)].some(m=>Number(m[0])>latestYear);
  const mentionsFee=sources.some(s=>s.blocks.some(b=>/visa application charge|\bfees?\b|\bdollars?\b|\$\s*\d/i.test(b.en)));
  if(future&&!mentionsFee)return result('future-fee','need_sources','本次提供的來源未包含足以確認所問日期之簽證申請費的費率條文，不能給出精確金額，也不能把舊費率當成未來確定金額。',[],['需要涵蓋所問日期、簽證類別及申請情況的官方費率條文或生效文書。']);
 }
 if(section(ACT,'56')&&/補件|補充/.test(q)&&/(?:一律|一定|必須|強制).{0,16}(?:先|要求|邀請).{0,12}(?:補件|補充)/.test(q)){
  if(!await checks([[ACT,'56']]))return changed();const s=section(ACT,'56');
  return result('s56-discretion','answer','只依第56條，不能得出「一律必須先要求補件才可作決定」。第56(1)條使用may：部長可以取得其認為相關的資訊；如果取得了該資訊，則必須在作決定時考慮。第56(2)條也使用may invite，賦予邀請補充資訊的權力。這兩者與普遍強制先補件的義務不同；其他程序規定在特定情況可能另有要求，不能僅憑本條一併排除。',[quote(s,0),quote(s,1)]);
 }
 if(section(ACT,'82')&&/82\s*[（(]\s*8|只准居留.*不准再入境|remain.*not.*re.?enter/i.test(q)&&/入境|回澳|效力|失效/.test(q)){
  if(!await checks([[ACT,'82']]))return changed();const s=section(ACT,'82'),i=s.blocks.findIndex(b=>/^\(8\)/.test(b.en));
  return result('s82-no-reentry','answer','依第82(8)條：在澳洲境內核發給非公民、只准居留但不准再入境澳洲的簽證，持有人離開澳洲時即停止生效。若題述事實確實符合這些前提，不能再憑原本那張簽證重新入境。本結論只處理該簽證的效力，沒有推定另有其他入境資格。',[quote(s,i)]);
 }
 if(section(REG,'155.212')&&/155|返澳|rrv/i.test(q)&&/[2兩二].{0,3}年/.test(q)&&/(?:沒有|未|不).{0,3}(?:住滿|居住滿)|住不滿|居住不足|未滿|不足/.test(q)&&/必定|一定|替代|其他|路徑/.test(q)){
  if(!await checks([[REG,'155.212']]))return changed();const s=section(REG,'155.212');
  return result('rrv-alternatives','answer','不必然。155.212(1)明列(2)、(3)、(3A)或(4)，是替代路徑；不符合(2)的居住要求，不等於已排除全部其他路徑。(3)針對境外申請人，(3A)針對境內申請人，(4)另涉及家庭單位成員；每條路徑都仍有各自的前提。尤其在(3)內，(a)與(b)也是「或」的替代關係，不是兩者都要符合。這裡只回答「是否必定不符」，沒有認定個案已滿足其中一條路徑或保證核發。',[quote(s,0),quote(s,8),quote(s,12),quote(s,13),quote(s,14),quote(s,19)]);
 }
 if(section(REG,'2.05')&&/8503/.test(q)&&/2\.05\s*[（(]\s*4\s*[）)]/.test(q)&&/唯一|只能|只有|沒有其他/.test(q)){
  if(!await checks([[REG,'2.05'],[REG,'8503'],[REG,'8534']]))return changed();const s=section(REG,'2.05');
  return result('8503-waiver-paths','answer','「8503只能依2.05(4)豁免」不正確。(4)是一組情況；(4AA)另列持有人有真實意圖申請條文明列簽證的情況；(4AB)另列與safe haven enterprise visa及2.06AAB(2)有關的情況。(5A)針對的是8534，不能拿來當作8503的同一條豁免路徑。各款使用may waive，並非保證批准。請求書面及先前拒絕後情況差異等，要按(4)(b)、(c)各自的文字與觸發前提讀，不能直接把(4)的條件擴張成(4AA)、(4AB)全部共用的門檻。個案能否豁免仍須核對所選路徑及其他適用規定。',[quote(s,8),quote(s,12),quote(s,13),quote(s,14),quote(s,22),quote(s,33)]);
 }
 if(/417|462|打工度假/.test(q)&&/核發|下簽|批准|獲批/.test(q)&&/所在地|地點|哪裡|境內|境外|回台|返台|回澳|離境|出境/.test(q)){
  const visa=['417','462'].includes(facts.visaClass)?facts.visaClass:null;
  const place=['in_au','outside_au'].includes(facts.applicationPlace)?facts.applicationPlace:null;
  const prior=['yes','no'].includes(facts.prior417InAustralia)?facts.prior417InAustralia:null;
  if(!visa)return result('wh-confirm-facts','need_facts','核發所在地需要先確認簽證類別及適用前提。請在「確認核發所在地的事實」選項中確認，這裡不從自由文字猜定你的個案事實。',[],['確認要申請417還是462；確認提出本次申請時的所在地。','若為417，確認現在或過去是否曾以417簽證持有人身分在澳洲。']);
  const named=[...new Set([...q.matchAll(/(?<![\d.])(417|462)(?![\d.])/g)].map(m=>m[1]))];
  if(named.length===1&&named[0]!==visa)return result('wh-conflicting-facts','need_facts','問題文字與確認選項的簽證類別不同，先釐清後才判斷核發所在地。',[],['請確認簽證類別，並使問題文字與選項一致。']);
  let s,i,location;
  if(visa==='417'){
   if(!await checks([[REG,'417.411'],[REG,'417.412']]))return changed();
   if(!prior||prior==='yes'&&!place)return result('wh-confirm-facts','need_facts','417須先區分現在或過去是否曾以417身分在澳洲，再確認本次申請時的所在地。請核對下方選項；這不是對整段往返旅程的許可判斷。',[],['確認現在或過去是否曾以417簽證持有人身分在澳洲。','如果是，確認本次提出申請時在澳洲境內或境外。']);
   if(prior==='no'){s=section(REG,'417.411');i=0;location='澳洲境外';}
   else{s=section(REG,'417.412');i=place==='in_au'?1:2;location=place==='in_au'?'澳洲境內':'澳洲境外';}
  }else{
   if(!await checks([[REG,'462.411'],[REG,'462.412']]))return changed();
   if(!place)return result('wh-confirm-facts','need_facts','462的核發所在地與本次提出申請時的所在地有關。請先確認該項事實。',[],['提出本次462申請時在澳洲境內，還是境外？']);
   s=section(REG,place==='in_au'?'462.412':'462.411');i=0;location=place==='in_au'?'澳洲境內，而且不得處於immigration clearance':'澳洲境外';
  }
  const limited=/只問|僅.*核發|核發.*所在地|核發.*地點|下簽.*哪裡/.test(q);
  const text=`依你確認的選項，僅就核發所在地，適用${s.number}，核發當下須在${location}。這不代表整段旅程可以往返，也沒有判斷其他核發條件是否滿足。`;
  if(!limited)return result('wh-location-with-travel-unknown','need_facts',text+'要判斷離境及返回澳洲，還需核對現有簽證與旅行安排。',[quote(s,i)],['目前持有何種簽證，是否有再入境權？','預計何時離境、何時回澳，以及屆時哪張簽證會生效？']);
  return result('wh-grant-location','answer',text,[quote(s,i)]);
 }
 return null;
}
export function referenceOnlyAnswer(validated){
 return {mode:'references_only',status:'need_sources',answer:'這個問題尚未覆蓋可自動判斷的規則。本次只列出模型選取且已比對原文的引文，暫不顯示未經驗證的法律結論。',questions:['請核對引用範圍、適用版本及是否仍缺其他相關來源。'],citations:validated.citations};
}
