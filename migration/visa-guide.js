import {escapeHtml as esc, routeFor} from './references.js';
import {abbreviations, conditionMeanings, forms, formUrl, instruments, official, topics, visaList} from './guide-topics.js';
import {visaForms, visaGroups, visas} from './guide-visas.js';

const regulations = 'migration-regulations';
const path = slug => `#/guide${slug ? '/'+slug : ''}`;
const titleZh = entry => entry.titleZh.replace(/^簽證子類別\s+\d{3}\s*[—–-]\s*/, '');
const chapterById = new Map(topics.map(topic => [topic[0], topic]));
const common = ['study-path','work-path','partner-path','family-visit-path','bridging'];
const guideDate = '2026 年 11 月 23 日';

function links(items) {
  return `<ul class="guide-links">${items.map(([label, url]) => `<li><a href="${esc(url)}">${esc(label)}</a></li>`).join('')}</ul>`;
}

function topicTitle(id, catalog) {
  const visa = catalog.find(item => item.number === id);
  return visa ? `${id} ${titleZh(visa)}` : chapterById.get(id)?.[1] || id;
}

function topicLinks(ids, catalog) {
  return links(ids.map(id => [topicTitle(id,catalog),path(id)]));
}

export function guideEntry(label = '澳洲簽證申請指南') {
  return `<a class="case-library-entry guide-entry" href="${path()}"><div><h3>${esc(label)}</h3><p>按目的找簽證，核對資格、文件、時間與遞件步驟。</p></div><span>查看指南</span></a>`;
}

export function guideVisaLink(number) {
  return visas[number] ? `<p><a class="small-button" href="${path(number)}">查看 ${number} 白話申請指南</a></p>` : '';
}

function card(id, title, description = '', extra = '') {
  return `<a class="guide-card" href="${path(id)}"><strong>${esc(title)}</strong>${description ? `<span>${esc(description)}</span>` : ''}${extra ? `<small>${esc(extra)}</small>` : ''}</a>`;
}

function groupGrid(catalog, query = '') {
  const entries = new Map(catalog.map(item => [item.number, item]));
  return visaGroups.map(([group, rows]) => {
    const results = rows.map(([number]) => entries.get(number)).filter(Boolean).filter(entry => {
      const guide = visas[entry.number];
      return [entry.number, entry.title, titleZh(entry), guide.purpose, group].some(value => value.toLowerCase().includes(query));
    });
    if (!results.length) return '';
    return `<section><h3>${esc(group)}</h3><div class="guide-grid">${results.map(entry => {
      const guide = visas[entry.number];
      return card(entry.number, `${entry.number} ${titleZh(entry)}`, guide.purpose, guide.status || entry.title);
    }).join('')}</div></section>`;
  }).join('');
}

function codeEntries(index, data, summaries) {
  const sections = index.docs?.[regulations]?.sections || [];
  const conditions = sections.filter(section => !section.isHeading && /^\d{4}$/.test(section.number) && section.path.at(-1)?.startsWith('Schedule 8'));
  const criteria = sections.filter(section => !section.isHeading && /^\d{4}$/.test(section.number) && section.path.some(label => /^Schedule [345] —/.test(label)));
  const lodgement = sections.filter(section => !section.isHeading && /^\d{4}[A-Z]*$/.test(section.number) && section.path.some(label => /^Schedule 1 —/.test(label)));
  const divisions = sections.filter(section => section.isHeading && /^(Schedule|Part 2A|Division 1\.[45]|Division 2\.(?:6|1[3-9]))\b/.test(section.title));
  return {
    conditions: conditions.map(entry => [entry.number, conditionMeanings[entry.number] || '簽證附加條件', routeFor(regulations, entry.id), summaries?.sections?.[entry.id]?.text]),
    criteria: criteria.map(entry => [entry.number, entry.path.some(part => /^Schedule 4/.test(part)) ? '公共利益準則 PIC' : entry.path.some(part => /^Schedule 3/.test(part)) ? '境內附加準則' : '特別返澳準則', routeFor(regulations, entry.id), summaries?.sections?.[entry.id]?.text]),
    lodgement: lodgement.map(entry => {
      const category = entry.title.match(/\(Class ([A-Z]{2})\)/)?.[1];
      const title = entry.zh.replace(new RegExp('^'+entry.number+'\\s*'), '') || entry.title;
      return [category ? `${entry.number} · Class ${category}` : entry.number, title, routeFor(regulations, entry.id)];
    }),
    divisions: divisions.map(entry => [entry.title, entry.zh, `#/chapter/${regulations}/${entry.id}`]),
    documents: [...data.documents.map(entry => [entry.code, entry.titleZh || entry.title, entry.href]), ...instruments],
    forms: forms.map(([number, title, explanation]) => [number, title, formUrl(number), explanation]),
    abbreviations,
  };
}

const indexLabels = {
  conditions:'附表 8 簽證條件', criteria:'附表 3、4、5 準則', lodgement:'附表 1 申請項目',
  divisions:'規例主要部分及附表', documents:'法規與文書', forms:'表格與資訊單', abbreviations:'常見縮寫與識別碼',
};

function indexSections(codes, keys, query = '') {
  return keys.map(key => {
    const rows = codes[key].filter(item => [item[0],item[1],item[3] || ''].some(value => value.toLowerCase().includes(query)));
    if (!rows.length) return '';
    return `<details class="guide-index" ${query || keys.length === 1 ? 'open' : ''}><summary>${esc(indexLabels[key])} · ${rows.length} 筆</summary><ul>${rows.map(([number, label, url, explanation]) => `<li><a href="${esc(url)}"><strong>${esc(number)}</strong> ${esc(label)}</a>${explanation ? `<p>${esc(explanation)}</p>` : ''}</li>`).join('')}</ul></details>`;
  }).join('');
}

function exactLawLinks(index, query) {
  const act = query.match(/^(?:section|s)\s*\.?\s*(\d+[a-z]*)$/i);
  const rule = query.match(/^(?:reg(?:ulation)?\s*\.?\s*)?(\d+\.\d+[a-z]*)$/i);
  if (!act && !rule) return [];
  const doc = act ? 'migration-act' : regulations;
  const number = (act || rule)[1].toLowerCase();
  return (index.docs?.[doc]?.sections || []).filter(section => section.number.toLowerCase() === number).map(section => [
    `${act ? '移民法' : '移民規例'} ${section.number} ${section.zh === section.number ? '' : section.zh}`.trim(),routeFor(doc,section.id),
  ]);
}

function renderContents(main, catalog, codes, index) {
  main.innerHTML = `<div class="library-intro guide-hero"><h1>澳洲簽證申請指南</h1><p>把《移民規例 1994》改寫成申請人用得上的步驟。從你的目的開始，查資格、擔保、文件與期限，再回到官方流程和原文。</p></div>
  <div class="guide-pages"><section><h2>按情況找路線</h2>${topicLinks(common, catalog)}</section>
  <section><h2>準備申請</h2><div class="guide-grid">${topics.filter(([id]) => !common.includes(id)).map(([id,title]) => card(id,title)).join('')}</div></section>
  <section><h2>查簽證、條件或表格代碼</h2><label class="guide-search" for="guide-search">輸入編號或名稱</label><input class="overview-search" id="guide-search" placeholder="例如 500、8503、Form 888、伴侶"><p id="guide-match" role="status"></p><div id="guide-results"></div></section></div>`;
  const results = main.querySelector('#guide-results');
  const status = main.querySelector('#guide-match');
  const input = main.querySelector('#guide-search');
  const render = () => {
    const raw = input.value.trim().toLowerCase();
    const term = raw.replace(/^(?:form|condition|subclass|表格|條件|簽證)\s*(?=\d)/i,'').trim();
    const match = raw.match(/^(?:form|表格)\s*(?=\d)|^(?:condition|條件)\s*(?=\d)|^(?:subclass|簽證)\s*(?=\d)/i)?.[0] || '';
    const formOnly = /^(form|表格)/.test(match);
    const conditionOnly = /^(condition|條件)/.test(match);
    const visaOnly = /^(subclass|簽證)/.test(match);
    const codeKeys = formOnly ? ['forms'] : conditionOnly ? ['conditions'] : Object.keys(codes);
    const codeMatches = visaOnly ? '' : indexSections(codes, codeKeys, term);
    const matchingVisas = formOnly || conditionOnly ? '' : groupGrid(catalog, term);
    const matchingTopics = !term || match ? [] : topics.filter(([id,title]) => `${id} ${title}`.toLowerCase().includes(term));
    const provisions = exactLawLinks(index,raw);
    status.textContent = term ? '查詢結果' : `簽證索引共 ${catalog.length} 個子類別`;
    results.innerHTML = (provisions.length ? links(provisions) : '') + (matchingTopics.length ? topicLinks(matchingTopics.map(([id]) => id),catalog) : '') + codeMatches + matchingVisas || '<p>找不到這個代碼。可試輸入完整編號，或從下方官方清單查詢。</p>';
    if (term && !results.querySelector('a')) results.insertAdjacentHTML('beforeend', links([['內政部簽證清單', visaList], ['官方表格目錄', official.forms], ['研讀室全文查找', '#/find']]));
  };
  input.addEventListener('input',render);
  render();
}

function renderChapter(topic, catalog, codes) {
  const [id,title,sections,related,sources] = topic;
  const indexKeys = id === 'conditions' ? ['conditions'] : id === 'forms' ? ['forms'] : id === 'codes' ? Object.keys(codes) : [];
  return `<article class="guide-article"><h1>${esc(title)}</h1>
    ${sections.map(([heading,body]) => `<section><h2>${esc(heading)}</h2><p>${esc(body)}</p></section>`).join('')}
    ${indexKeys.length ? `<section><h2>查編號</h2>${indexSections(codes,indexKeys)}</section>` : ''}
    <section><h2>接著查</h2>${topicLinks(related,catalog)}</section>
    <section><h2>官方資料及條文</h2>${links(sources)}</section></article>`;
}

function renderVisa(entry, data, summaries) {
  const number = entry.number;
  const guide = visas[number];
  const legal = summaries?.groups?.[entry.sectionId] || Object.entries(summaries?.groups || {}).find(([key]) => key.startsWith(`Subclass ${number} `))?.[1];
  const lodgement = data.lodgementItems?.[number] || [];
  const legalPoints = legal?.points?.filter(point => point.text && point.sections?.length) || [];
  const relevantForms = forms.filter(([form]) => visaForms[number]?.includes(form));
  return `<article class="guide-article"><h1>${number} ${esc(titleZh(entry))}</h1><p class="guide-en" lang="en">${esc(entry.title)}</p>
    ${guide.status ? `<p class="notice">${esc(guide.status)}</p>` : ''}
    <section><h2>這張簽證是什麼</h2><p>${esc(guide.purpose)}。</p></section>
    <section><h2>先確認什麼、準備哪些材料</h2><p>${esc(guide.preparation)}</p></section>
    <section><h2>怎麼申請或辦理</h2><p>${esc(guide.apply)}</p>${links(guide.sources)}</section>
    ${relevantForms.length ? `<section><h2>可能會用到的表格</h2><ul class="guide-law-points">${relevantForms.map(([form,title,note])=>`<li><a href="${esc(formUrl(form))}">Form ${esc(form)} ${esc(title)}</a><p>${esc(note)}</p></li>`).join('')}</ul></section>` : ''}
    ${legalPoints.length ? `<section><h2>法規重點</h2><p class="guide-en">研讀室保存版本 ${esc(data.version)}</p><ul class="guide-law-points">${legalPoints.map(point => `<li>${esc(point.text)}${links(point.sections.map(section => ['對照條文 ' + section.replace(/^v\d-/, '').replace(/-/g,'.'),routeFor(regulations,section)]) )}</li>`).join('')}</ul></section>` : ''}
    <section><h2>對照有效申請和核發規則</h2>${links([...lodgement.map(item => [`附表 1 · ${item.title.startsWith(item.number+' ') ? item.title : `${item.number} ${item.title}`}`,routeFor(regulations,item.id)]), ['附表 2 · '+number+' 完整條文',entry.href], ['聯邦法規登錄庫及修法', 'https://www.legislation.gov.au/F1996B03551/latest/text']])}</section>
    <section><h2>相關簽證和準備指南</h2>${topicLinks(guide.related,data.visas)}</section></article>`;
}

export function renderVisaGuide({main, companion, slug, data, index, summaries}) {
  const codes = codeEntries(index, data, summaries);
  const topic = chapterById.get(slug);
  const visa = data.visas.find(entry => entry.number === slug);
  companion.innerHTML = `<h3>澳洲簽證申請指南</h3>${links([['指南目錄',path()],['代碼怎麼讀',path('codes')],['簽證條件',path('conditions')],['申請表格',path('forms')],['規例原文書庫','#/book/'+regulations]])}`;
  if (!slug) renderContents(main,data.visas,codes,index);
  else {
    const content = topic ? renderChapter(topic,data.visas,codes) : visa && visas[slug] ? renderVisa(visa,data,summaries) : '<h1>找不到這一頁</h1><p>回到目錄查簽證編號或申請主題。</p>';
    main.innerHTML = `<div class="breadcrumb"><a href="${path()}">簽證申請指南</a></div>${content}`;
  }
  main.insertAdjacentHTML('beforeend', `<p class="source-note">編寫日期 ${guideDate}。簽證、表件、費用與資格可能隨修法調整。遞件前以對應分支的官方資料及適用法規核對。${slug ? ` <a href="${path()}">回到指南目錄</a>` : ''}</p>`);
}
