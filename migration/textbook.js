import {escapeHtml as esc} from './references.js';
import {units} from './textbook-chapters.js';

const title = '《移民規例 1994》白話課本';
const path = chapter => `#/textbook${chapter ? '/'+chapter : ''}`;
const chapters = units.flatMap(unit => unit.chapters);
const appendices = [
  ['代碼與簽證索引', '#/guide/reference'],
  ['118 個簽證條件', '#/guide/conditions'],
  ['表格與填寫說明', '#/guide/forms'],
  ['《移民規例 1994》中英對照', '#/book/migration-regulations'],
];

function renderLinks(entries) {
  return `<ul class="guide-links">${entries.map(([text,href])=>`<li><a href="${esc(href)}">${esc(text)}</a></li>`).join('')}</ul>`;
}

export function textbookEntry() {
  return `<a class="case-library-entry guide-entry" href="${path()}"><div><h3>${title}</h3><p>用示範與練習學會讀法規、查代碼和分析簽證案例。</p></div><span>開始讀課本</span></a>`;
}

function renderUnit(unit, start) {
  return `<section class="textbook-unit"><h2>${esc(unit.title)}</h2><ol start="${start}">
    ${unit.chapters.map(chapter=>`<li><a href="${path(chapter.id)}">${esc(chapter.title)}</a><p>${esc(chapter.goal)}</p></li>`).join('')}
  </ol></section>`;
}

function renderContents() {
  return `<div class="library-intro guide-hero"><h1>${title}</h1><p>從澳洲移民法的基礎讀起。每章先解釋制度，再用案例示範怎麼找條文、看證據和作判斷。</p></div>
  <div class="textbook-contents"><p>本書適合第一次接觸澳洲移民法的讀者。讀完後，你應能用一張時間線和幾條法規，說明某個案件的身分、申請條件、證據及尚待確認的事。</p>
  <nav aria-label="課本閱讀方式" class="textbook-buttons"><a class="primary" href="${path(chapters[0].id)}">開始第一章</a><a class="small-button" href="${path('read')}">全書連續閱讀</a></nav>
  ${units.map(unit=>renderUnit(unit,chapters.indexOf(unit.chapters[0])+1)).join('')}
  <section><h2>查閱附錄</h2>${renderLinks(appendices)}</section></div>`;
}

function renderChapter(chapter, showAnswers = false) {
  const number = chapters.indexOf(chapter)+1;
  return `<article class="guide-article textbook-chapter" id="chapter-${chapter.id}"><header><p class="textbook-kicker">第 ${number} 章</p><h1>${esc(chapter.title)}</h1><p class="textbook-goal">${esc(chapter.goal)}</p></header>
  ${chapter.sections.map(([heading,body])=>`<section><h2>${esc(heading)}</h2><p>${esc(body)}</p></section>`).join('')}
  <section class="textbook-example"><h2>示範案例</h2><p>${esc(chapter.example[0])}</p><ol>${chapter.example[1].map(step=>`<li>${esc(step)}</li>`).join('')}</ol></section>
  <section class="textbook-questions"><h2>練習與解答</h2><ol>${chapter.questions.map(([question,answer])=>`<li><p>${esc(question)}</p><details ${showAnswers?'open':''}><summary>查看解答</summary><p>${esc(answer)}</p></details></li>`).join('')}</ol></section>
  <section><h2>對照條文與官方資料</h2>${renderLinks(chapter.sources)}</section>
  <section><h2>附錄與延伸閱讀</h2>${renderLinks(chapter.references)}</section></article>`;
}

function renderChapterNav(chapter) {
  const index = chapters.indexOf(chapter);
  const previous = chapters[index-1];
  const next = chapters[index+1];
  return `<nav class="textbook-page-nav" aria-label="上一章與下一章">
    ${previous ? `<a href="${path(previous.id)}">上一章 · ${esc(previous.title)}</a>` : `<a href="${path()}">課本目錄</a>`}
    ${next ? `<a href="${path(next.id)}">下一章 · ${esc(next.title)}</a>` : `<a href="${path()}">回到課本目錄</a>`}
  </nav>`;
}

export function renderTextbook({main,companion,slug}) {
  const chapter = chapters.find(item=>item.id===slug);
  const chapterUnit = units.find(unit=>unit.chapters.includes(chapter));
  companion.innerHTML = `<h3>移民規例課本</h3>${renderLinks([['回到課本目錄',path()],['全書連續閱讀',path('read')],...appendices])}
  ${chapterUnit ? `<h3>${esc(chapterUnit.title)}</h3>${renderLinks(chapterUnit.chapters.map(item=>[item.title,path(item.id)]))}` : ''}`;
  if (slug==='read') {
    main.innerHTML = `<div class="textbook-full"><header><h1>${title}</h1><p>全書連續閱讀</p></header>${chapters.map(item=>renderChapter(item,true)).join('')}</div>`;
  } else if (chapter) {
    main.innerHTML = `<div class="breadcrumb"><a href="${path()}">課本目錄</a><span>›</span><span>${esc(chapterUnit.title)}</span></div>${renderChapter(chapter)}${renderChapterNav(chapter)}`;
  } else {
    main.innerHTML = renderContents();
  }
  main.insertAdjacentHTML('beforeend','<p class="source-note">案例為教學假設。章末附條文及官方資料，分析時按案件日期核對適用版本。</p>');
}
