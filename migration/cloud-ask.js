import {escapeHtml as esc,routeFor} from './references.js';
import {createCloudClient,validateAnswer,makeMessages,CloudError,COOLDOWN_STORAGE,REQUEST_INTERVAL,PREFERRED_MODEL,cleanCallbackUrl} from './cloud-core.js';
import {retrieveLawContext} from './cloud-retrieval.js';
import {strictAnswer,referenceOnlyAnswer} from './strict-answers.js';
let studyScope='current';let locksPromise;const confirmedFacts={visaClass:'',applicationPlace:'',prior417InAustralia:''};
let services,root=null,searchPromise,timer,cooldown=0,preparing=false,authNotice='',draft='',selectedModel='',answerModel='',answer=null,context=null,lastQuestion='',error='',progress='';
const client=createCloudClient({onChange:()=>updateControls()});
const $=id=>root?.querySelector('#'+id);
function readCooldown(){try{return Math.max(cooldown,Number(localStorage.getItem(COOLDOWN_STORAGE))||0);}catch{return cooldown;}}
function setCooldown(until){cooldown=Math.max(readCooldown(),until);try{localStorage.setItem(COOLDOWN_STORAGE,String(cooldown));}catch{}updateControls();}
window.addEventListener('storage',event=>{if(event.key===COOLDOWN_STORAGE)updateControls();});
export async function initializeCloudAuth(){
 const href=location.href;
 const params=new URL(href).searchParams;
 if(params.get('cloud_auth')!=='openrouter'&&!params.has('code')&&!params.has('error'))return;
 // Remove the one-use code before loading the rest of the library or assets.
 history.replaceState(null,'',cleanCallbackUrl(href));
 const result=await client.finishAuth(href);if(!result)return;draft=result.draft;selectedModel=result.model;authNotice=result.error||'已連接你的 OpenRouter 帳戶。現在可以送出一題。';
}
function sourceCards(){return context?.sources.map(source=>`<li><a href="${routeFor(source.doc,source.sectionId,source.blocks[0]?.id)}"><strong>${esc(source.number||source.title)}</strong><span>${esc(source.document)} · ${esc(source.version)}</span></a></li>`).join('')||'';}
function answerHtml(){
 if(!answer)return '';
 const title=answer.status==='need_facts'?'先確認關鍵事實':answer.mode==='references_only'?'原文研讀資料':answer.status==='need_sources'?'還需要更多來源':'依已核對規則回答';
 return `<article class="ask-answer" aria-labelledby="ask-answer-title"><div class="ask-answer-label">${esc(answerModel)}</div><h2 id="ask-answer-title">${title}</h2><div class="ask-answer-text">${answer.answer.split(/\n+/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('')}</div>${answer.questions.length?`<ul class="ask-questions">${answer.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`:''}${answer.citations.length?`<h3>對照原文與位置</h3><div class="ask-citations">${answer.citations.map((c,i)=>`<section><a class="ask-citation-title" href="${routeFor(c.source.doc,c.source.sectionId,c.block_id)}">${i+1}. ${esc(c.source.document)} · ${esc(c.source.number)}</a><blockquote lang="en">${esc(c.quote)}</blockquote><div class="ask-citation-meta">版本 ${esc(c.source.version)} · <a href="${routeFor(c.source.doc,c.source.sectionId,c.block_id)}">定位研讀室原文</a> · <a href="${esc(c.source.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方來源</a></div></section>`).join('')}</div>`:''}<p class="ask-answer-foot">引文須能對回原文；規則回答只涵蓋所列版本及確認的前提，不代表已審核整個個案。未覆蓋規則時只列原文，不自動下法律結論。</p></article>`;
}
function renderResults(){if(!$('ask-results'))return;$('ask-results').innerHTML=answerHtml()+(context?`<details class="ask-sources"><summary>本次提供的 ${context.sources.length} 條來源</summary><ul>${sourceCards()}</ul><p>此清單是本次檢索範圍，未保證涵蓋全部相關法律、政策與例外。</p>${context.omitted.length?`<details><summary>尚未完整附上的交叉引用</summary><ul>${context.omitted.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}</details>`:'');}
function updateControls(){
 if(!root?.isConnected)return;
 const state=client.snapshot(),active=state.busy||preparing,seconds=Math.max(0,Math.ceil((readCooldown()-Date.now())/1000));
 if($('ask-auth-state'))$('ask-auth-state').textContent=state.connected?'已連接 · 憑證只保留於本分頁，重新整理後需重新登入':'尚未連接 · 登入後使用你自己的免費模型額度';
 if($('ask-login')){$('ask-login').hidden=state.connected;$('ask-login').disabled=active;}
 if($('ask-disconnect'))$('ask-disconnect').hidden=!state.connected;
 if($('ask-submit')){$('ask-submit').disabled=active||seconds>0;$('ask-submit').textContent=active?'正在處理本題':seconds>0?`請等 ${seconds} 秒再送出`:state.connected?'送出這一題':'先查規則與原文';}
 if($('ask-stop'))$('ask-stop').hidden=!state.busy;
 if($('ask-scope'))$('ask-scope').disabled=active;if($('ask-model'))$('ask-model').disabled=active;for(const select of root.querySelectorAll('#ask-facts select'))select.disabled=active;
 if($('ask-refresh-models'))$('ask-refresh-models').disabled=active;
 if($('ask-status')){$('ask-status').textContent=error||progress||authNotice||'每次只送出一題，不會自動重試或改用其他模型。';$('ask-status').classList.toggle('ask-error',!!error);}
 if($('ask-quota')){const q=state.quota;$('ask-quota').textContent=q?`服務回報今日免費請求：${q.used??'—'} / ${q.limit??'—'}${q.remaining!==undefined?`，剩餘 ${q.remaining}`:''}。實際可用性仍依供應商。`:'免費額度及模型可用性由 OpenRouter 與供應商決定。';}
}
async function populateModels(refresh=false){
 try{const models=await client.models({refresh});if(!root?.isConnected)return;
  if(!models.some(m=>m.id===selectedModel))selectedModel=models.some(m=>m.id===PREFERRED_MODEL)?PREFERRED_MODEL:models[0]?.id||'';
  const select=$('ask-model');if(select){select.replaceChildren(...models.map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name||m.id;return o;}));select.value=selectedModel;}
  if(!models.length)error='目前沒有符合零價格條件的文字模型，請稍後再查看。';
 }catch{error='免費模型清單暫時讀取失敗，請稍後按重新整理。';}updateControls();
}
async function login(){
 draft=$('ask-question')?.value||draft;error='';
 try{const url=await client.beginAuth({href:location.href,draft,model:selectedModel});location.assign(url);}catch(e){error=e.message;updateControls();}
}
async function performAsk(){
 const question=($('ask-question')?.value||draft).trim();
 if(!question){error='請先輸入一個問題。';updateControls();$('ask-question')?.focus();return;}
 if(question.length>1500){error='請把問題縮短至1500字以內，先問一個重點。';updateControls();return;}
 if(preparing||client.snapshot().busy||readCooldown()>Date.now())return;
 
 draft=question;lastQuestion=question;answer=null;context=null;error='';authNotice='';preparing=true;progress='正在書庫搜尋相關條文，尚未送出模型請求。';renderResults();updateControls();
 try{
  context=await retrieveLawContext(question,{index:services.index,loadDoc:services.loadDoc,loadSearch:()=>searchPromise ||= services.fetchJson('data/search-index.json')});renderResults();
  if(!context.sources.length)throw new CloudError('書庫沒有找到足夠明確的來源。請補上簽證類別、法條編號或更具體的問題；這次沒有送出模型請求。');
  const locks=await (locksPromise ||= services.fetchJson('data/verified-qa-rules.json'));
  const trusted=await strictAnswer(question,context.sources,{locks,facts:{...confirmedFacts},scope:studyScope});
  if(trusted){answer=validateAnswer(JSON.stringify(trusted),context.sources);answerModel='條文規則核對 · 本題未使用雲端額度';progress='本題依來源鎖定的規則處理；以你確認的事實及所列版本為前提。';renderResults();return;}
  if(!client.snapshot().connected){answer={mode:'references_only',status:'need_sources',answer:'這個問題尚未覆蓋可自動判斷的規則，先提供下方檢索原文。登入後可讓免費模型協助整理引文；本頁不直接顯示模型未經驗證的法律結論。',questions:[],citations:[]};answerModel='本機法條檢索';progress='已列出來源；本題沒有發出模型請求。';renderResults();return;}
  progress='正在整理本題的原文引述，一次只發出一個模型請求。';updateControls();
  const send=async()=>{
   if(readCooldown()>Date.now())throw new CloudError('另一個分頁剛送出問題，請等倒數結束後再問。');
   setCooldown(Date.now()+REQUEST_INTERVAL);
   const result=await client.ask({model:selectedModel,messages:makeMessages(question,context.sources,context.omitted),onText:()=>{progress='已收到回覆，正在等待完整內容並核對引文。';updateControls();}});
   answer=referenceOnlyAnswer(validateAnswer(result.text,context.sources));answerModel=result.model+' · 僅整理原文';progress='原文整理已完成；此問題尚未覆蓋已核對規則，暫不自動下結論。';renderResults();
  };
  if(navigator.locks){await navigator.locks.request('migration-room:cloud-question',{ifAvailable:true},async lock=>{if(!lock)throw new CloudError('另一個分頁正在提問，請等該題完成後再送出。');await send();});}else await send();
 }catch(e){if(e.status===429)setCooldown(Date.now()+e.retryAfter*1000);error=e instanceof CloudError?e.message:'法條資料暫時讀取失敗，請稍後再試。';progress='';}
 finally{preparing=false;updateControls();}
}
export function unmountCloudAsk(){clearInterval(timer);root=null;}
export function cloudLibraryEntry(){return '<a class="ask-library-entry" href="#/ask"><strong>問法條，找到出處。</strong><span>先確認版本與前提；免費雲端協助整理引文，沿引用讀回原文。</span></a>';}
export function renderCloudAsk({main,companion,...dependencies}){
 services=dependencies;root=main;clearInterval(timer);
 companion.innerHTML='<div class="aside-label">從問題讀回法條</div><h3>一次釐清一個重點</h3><p>描述簽證類別、申請時所在地、目前簽證及旅行時間，有助於判斷需要哪些條文。</p><hr class="side-rule"><h3>每個引用都有位置</h3><p>回答附上的引文可以直接跳到研讀室原文段落，並開啟官方版本。</p><hr class="side-rule"><p>AI 回答供研讀輔助。來源不足或事實不明時，應先補資料再判斷。</p>';
 main.innerHTML=`<div class="ask-intro"><span class="eyebrow">ASK WITH SOURCES</span><h1>問法條，找到出處。</h1><p>準確優先：已覆蓋的規則才給結論，其餘問題先讀原文、確認資料。</p></div><section class="ask-connection" aria-labelledby="ask-connection-title"><div><h2 id="ask-connection-title">使用自己的免費雲端額度</h2><p id="ask-auth-state"></p></div><div class="ask-auth-actions"><button id="ask-login" class="primary">登入 OpenRouter</button><button id="ask-disconnect" class="secondary" hidden>中斷本頁連線</button></div><p class="ask-connection-note">首次需要建立 OpenRouter 帳戶並授權。此頁只選用免費模型；憑證只保留在本分頁，授權一小時到期。</p></section><form id="ask-form" class="ask-form"><label for="ask-scope">研讀範圍</label><select id="ask-scope"><option value="current">現行個案 · 最新法規未核對完成，暫不下結論</option><option value="saved">僅研究保存版本 · 不判斷目前個案</option></select><p class="ask-data-note">保存版本：Migration Act 2026-10-08；Migration Regulations 2026-11-01。2026-11-19查看官方頁面已出現較新的規則彙編，本站尚未完成修法及過渡規定比對。</p><label for="ask-question">想釐清哪一個問題？</label><textarea id="ask-question" maxlength="1500" rows="5" placeholder="例如：我以前持417在澳洲停留，這次在台灣申請第二次417；核發時必須在哪裡？"></textarea><details id="ask-facts" class="ask-facts"><summary>確認核發所在地的事實（417／462）</summary><p>這些選項是核發所在地規則的前提；不從自由文字猜定。只查其他問題時可留空。</p><label for="ask-visa-class">簽證類別</label><select id="ask-visa-class"><option value="">尚未確認</option><option value="417">417 · Working Holiday</option><option value="462">462 · Work and Holiday</option></select><label for="ask-application-place">提出本次申請時的所在地</label><select id="ask-application-place"><option value="">尚未確認</option><option value="in_au">澳洲境內</option><option value="outside_au">澳洲境外</option></select><label for="ask-prior-417">現在或過去是否曾以417簽證持有人身分在澳洲？</label><select id="ask-prior-417"><option value="">尚未確認／不適用</option><option value="yes">是</option><option value="no">否</option></select></details><div class="ask-model-row"><div><label for="ask-model">免費模型</label><select id="ask-model"><option value="">正在讀取免費模型清單</option></select></div><button type="button" id="ask-refresh-models" class="secondary">重新整理清單</button></div><p class="ask-data-note">已核對規則可直接查閱，不消耗雲端額度。其他問題登入後可由OpenRouter及所選供應商協助整理原文；每題最多一次請求，不自動重送或切換模型。</p><div class="ask-submit-row"><button id="ask-submit" class="primary" type="submit" disabled>送出這一題</button><button id="ask-stop" class="secondary" type="button" hidden>停止本題</button></div><p id="ask-quota" class="ask-quota"></p></form><p id="ask-status" class="ask-status" role="status" aria-live="polite"></p><div id="ask-results"></div>`;
 $('ask-scope').value=studyScope;$('ask-scope').onchange=e=>{studyScope=e.target.value;answer=null;context=null;renderResults();};
 $('ask-question').value=draft;for(const [id,key]of [['ask-visa-class','visaClass'],['ask-application-place','applicationPlace'],['ask-prior-417','prior417InAustralia']]){$(id).value=confirmedFacts[key];$(id).onchange=e=>{confirmedFacts[key]=e.target.value;};}
 $('ask-question').oninput=e=>{draft=e.target.value;};
 $('ask-login').onclick=login;
 $('ask-disconnect').onclick=()=>{client.disconnect();authNotice='本頁連線憑證已清除。這次授權一小時到期；如需立即撤銷，可在 OpenRouter 帳戶管理。';progress='';error='';updateControls();};
 $('ask-refresh-models').onclick=()=>populateModels(true);
 $('ask-model').onchange=e=>{selectedModel=e.target.value;updateControls();};
 $('ask-form').onsubmit=e=>{e.preventDefault();performAsk();};
 $('ask-stop').onclick=()=>client.stop();
 renderResults();updateControls();populateModels();
 if(client.snapshot().connected)client.refreshQuota().catch(()=>{authNotice='個人額度暫時無法讀取；實際請求仍由服務端限制。';updateControls();});
 timer=setInterval(()=>{if(!root?.isConnected){clearInterval(timer);return;}updateControls();},1000);
}
