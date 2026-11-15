import {escapeHtml as esc,routeFor} from './references.js';

function sharedPath(sections){let path=[...(sections[0]?.path||[])];for(const section of sections){let i=0;while(i<path.length&&section.path?.[i]===path[i])i++;path=path.slice(0,i);}return path;}
export function chapterScope(doc,sections,fallback){const path=sharedPath(sections);return doc.sections.find(section=>section.isHeading&&section.path?.length===path.length&&path.every((part,i)=>section.path[i]===part))||fallback;}
export function chapterMenuHtml(doc,sections,root,titleFor){
 const prefix=sharedPath(sections),tree={children:new Map(),sections:[]};
 for(const section of sections){let node=tree;for(const part of (section.path||[]).slice(prefix.length)){if(!node.children.has(part))node.children.set(part,{title:part,children:new Map(),sections:[],path:[...(node.path||prefix),part]});node=node.children.get(part);}node.sections.push(section);}
 const link=section=>{const title=titleFor(section),number=section.number||'',label=number&&title.startsWith(number)?title.slice(number.length).replace(/^\s*[—–-]?\s*/,''):title;return `<a class="chapter-menu-link" data-chapter-section="${esc(section.id)}" href="${routeFor(doc.id,section.id)}?focus=section&chapter=${encodeURIComponent(root.id)}"><strong>${esc(number)}</strong><span>${esc(label)}</span></a>`;};
 function render(node){return node.sections.map(link).join('')+[...node.children.values()].map(child=>{
  if(child.children.size===0&&child.sections.length===1)return link(child.sections[0]);
  const heading=doc.sections.find(section=>section.isHeading&&section.title===child.title&&section.path?.length===child.path.length&&child.path.every((part,i)=>section.path[i]===part));
  return `<details class="chapter-menu-group" data-menu-branch="${esc(JSON.stringify(child.path))}" open><summary>${esc(heading?titleFor(heading):child.title)}</summary><div>${render(child)}</div></details>`;
 }).join('');}
 return `<header><div><strong>本章目錄</strong><small>${sections.length} 個條目 · 點選直接跳轉</small></div><button class="icon-button" id="chapter-menu-close" aria-label="關閉本章目錄">×</button></header><div class="chapter-menu-scroll" id="chapter-menu-list">${render(tree)}</div>`;
}

export function bindChapterMenu({doc,sections,root,titleFor,memory,onChange}){
 const button=document.getElementById('chapter-menu-open'),menu=document.getElementById('chapter-menu');
 if(!button||!menu)return;
 const key=doc.id+'/'+root.id;
 const record=memory[key] ||= {open:{},top:0};
 menu.innerHTML=chapterMenuHtml(doc,sections,root,titleFor);
 const list=menu.querySelector('#chapter-menu-list');
 const capture=()=>{record.top=list.scrollTop;for(const branch of list.querySelectorAll('details[data-menu-branch]'))record.open[branch.dataset.menuBranch]=branch.open;onChange();};
 const close=()=>{capture();menu.hidden=true;button.setAttribute('aria-expanded','false');};
 button.onclick=()=>{
  if(!menu.hidden){close();return;}
  for(const branch of list.querySelectorAll('details[data-menu-branch]'))if(Object.hasOwn(record.open,branch.dataset.menuBranch))branch.open=record.open[branch.dataset.menuBranch];
  menu.hidden=false;button.setAttribute('aria-expanded','true');list.scrollTop=record.top||0;
 };
 menu.querySelector('#chapter-menu-close').onclick=()=>{close();button.focus({preventScroll:true});};
 list.addEventListener('toggle',capture,true);
 list.addEventListener('scroll',capture,{passive:true});
 menu.addEventListener('click',event=>{
  const link=event.target.closest('[data-chapter-section]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey)return;
  const target=document.getElementById('section-'+link.dataset.chapterSection);
  if(target){event.preventDefault();close();target.scrollIntoView({block:'start'});target.classList.add('target');setTimeout(()=>target.classList.remove('target'),1800);}
  else close();
 });
 // An AbortController keeps route changes from accumulating global listeners.
 const controller=new AbortController();
 const outside=event=>{if(!menu.hidden&&!menu.contains(event.target)&&!button.contains(event.target))close();};
 document.addEventListener('click',outside,{signal:controller.signal});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close();button.focus({preventScroll:true});}},{signal:controller.signal});
 return ()=>{if(!menu.hidden)capture();controller.abort();};
}
