(() => {
  'use strict';

  const app = document.querySelector('[data-knowledge-app]');
  if (!app) return;

  const moduleLabels = {
    grammar: '语法与改错', collocation: '核心搭配与 A/B 句型', phrasal: '短语动词',
    preposition: '固定介词搭配', wordform: '构词法与词族', writing: '写作与口语表达',
    irregular: '不规则动词', confusable: '易混词与结构'
  };
  const authStorageKey = 'rewardSchoolAeasAuthV1';
  const practiceKind = 'aeas-english-bank';
  const legacyStorageKeys = {
    favorite: 'rewardAeasKnowledgeFavoritesV1', mastered: 'rewardAeasKnowledgeMasteredV1'
  };
  const viewStorageKey = 'rewardAeasKnowledgeViewV1';
  const $ = (selector) => app.querySelector(selector);
  const $$ = (selector) => [...app.querySelectorAll(selector)];
  const controls = {
    search: $('[data-filter-search]'), module: $('[data-filter-module]'), category: $('[data-filter-category]'),
    stage: $('[data-filter-stage]'), section: $('[data-filter-section]'), evidence: $('[data-filter-evidence]'),
    progress: $('[data-filter-progress]'), sort: $('[data-sort]'), pageSize: $('[data-page-size]')
  };
  const ui = {
    list: $('[data-item-list]'), loading: $('[data-loading]'), empty: $('[data-empty]'),
    summary: $('[data-result-summary]'), pagination: $('[data-pagination]'), pageInfo: $('[data-page-info]'),
    progressCount: $('[data-progress-count]'), progressBar: $('[data-progress-bar]'),
    sessionBanner: $('[data-session-banner]'), exportButton: $('[data-export-pdf]'),
    exportStatus: $('[data-export-status]'), authGuest: $('[data-auth-guest]'),
    authUser: $('[data-auth-user]'), authName: $('[data-auth-name]'),
    syncStatus: $('[data-sync-status]'), accountFilter: $('[data-account-filter]')
  };
  const state = {
    items: [], filtered: [], page: 1, pageSize: 24,
    dailyMode: false, dailyKeys: new Set(),
    view: localStorage.getItem(viewStorageKey) || 'cards',
    favorite: new Set(), mastered: new Set(),
    auth: { status: 'guest', token: '', user: null }
  };

  let progressSyncTimer = 0;
  let progressSyncInFlight = false;
  let progressSyncPending = false;

  function readSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (_) { return new Set(); }
  }

  function authToken() {
    try { return JSON.parse(localStorage.getItem(authStorageKey) || 'null')?.token || ''; }
    catch (_) { return ''; }
  }

  function isAuthenticated() {
    return state.auth.status === 'ready' && Boolean(state.auth.token && state.auth.user);
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function shortText(value, length = 170) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > length ? `${text.slice(0, length).trim()}…` : text;
  }

  function sections(value) {
    return String(value || '').split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
  }

  function populateSelect(select, values, label, labels = {}) {
    const selected = select.value;
    select.innerHTML = `<option value="">${escapeHTML(label)}</option>${values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(labels[value] || value)}</option>`).join('')}`;
    if (values.includes(selected)) select.value = selected;
  }

  function hydrateFromURL() {
    const params = new URLSearchParams(location.search);
    controls.search.value = params.get('q') || '';
    ['module', 'category', 'stage', 'section', 'evidence', 'progress', 'sort'].forEach((key) => {
      if (params.has(key)) controls[key].value = params.get(key);
    });
    if (['24', '48', '96'].includes(params.get('size'))) controls.pageSize.value = params.get('size');
    state.pageSize = Number(controls.pageSize.value);
    state.page = Math.max(1, Number(params.get('page')) || 1);
  }

  function updateURL() {
    const params = new URLSearchParams();
    if (state.dailyMode) params.set('plan', 'daily');
    const mapping = { q: 'search', module: 'module', category: 'category', stage: 'stage', section: 'section', evidence: 'evidence', progress: 'progress', sort: 'sort' };
    Object.entries(mapping).forEach(([key, controlName]) => {
      const value = controls[controlName].value.trim();
      if (value && !(key === 'sort' && value === 'priority')) params.set(key, value);
    });
    if (state.pageSize !== 24) params.set('size', String(state.pageSize));
    if (state.page > 1) params.set('page', String(state.page));
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  }

  function renderAuthState() {
    const authenticated = isAuthenticated();
    ui.authGuest.hidden = authenticated;
    ui.authUser.hidden = !authenticated;
    ui.accountFilter.hidden = !authenticated;
    controls.progress.disabled = !authenticated;
    if (!authenticated) {
      controls.progress.value = '';
      state.favorite.clear();
      state.mastered.clear();
      return;
    }
    ui.authName.textContent = state.auth.user?.displayName
      ? `${state.auth.user.displayName} 的学习进度`
      : '账号学习进度';
  }

  async function hydrateAccountProgress() {
    const token = authToken();
    if (!token || !window.rewardSchoolApi?.getCurrentUser || !window.rewardSchoolApi?.getPracticeProgress) {
      state.auth = { status: 'guest', token: '', user: null };
      renderAuthState();
      return;
    }
    state.auth = { status: 'loading', token, user: null };
    ui.syncStatus.textContent = '正在读取云端记录…';
    try {
      const user = await window.rewardSchoolApi.getCurrentUser({ token });
      const remote = await window.rewardSchoolApi.getPracticeProgress({ token, kind: practiceKind });
      const progress = remote?.progress || {};
      const legacyFavorite = readSet(legacyStorageKeys.favorite);
      const legacyMastered = readSet(legacyStorageKeys.mastered);
      state.favorite = new Set([...(progress.favorite || progress.favorites || []), ...legacyFavorite]);
      state.mastered = new Set([...(progress.mastered || []), ...legacyMastered]);
      state.auth = { status: 'ready', token, user };
      renderAuthState();
      ui.syncStatus.textContent = '已从账号读取 · 自动跨设备同步';
      if (legacyFavorite.size || legacyMastered.size) {
        await syncProgressNow();
        localStorage.removeItem(legacyStorageKeys.favorite);
        localStorage.removeItem(legacyStorageKeys.mastered);
      }
    } catch (error) {
      console.warn('Could not load account learning progress:', error);
      state.auth = { status: 'guest', token: '', user: null };
      renderAuthState();
    }
  }

  function queueProgressSync(delay = 500) {
    if (!isAuthenticated() || !window.rewardSchoolApi?.savePracticeProgress) return;
    window.clearTimeout(progressSyncTimer);
    ui.syncStatus.textContent = '正在同步到账号…';
    progressSyncTimer = window.setTimeout(() => { void syncProgressNow(); }, delay);
  }

  async function syncProgressNow() {
    if (!isAuthenticated() || !window.rewardSchoolApi?.savePracticeProgress) return;
    if (progressSyncInFlight) {
      progressSyncPending = true;
      return;
    }
    progressSyncInFlight = true;
    try {
      await window.rewardSchoolApi.savePracticeProgress({
        token: state.auth.token,
        kind: practiceKind,
        sessionId: 'knowledge-bank-v1',
        progress: {
          favorite: [...state.favorite],
          mastered: [...state.mastered],
          updatedAt: new Date().toISOString()
        }
      });
      ui.syncStatus.textContent = '已同步到账号 · 可跨设备继续';
    } catch (error) {
      console.warn('Could not sync account learning progress:', error);
      ui.syncStatus.textContent = '云端同步暂时失败 · 下次操作会重试';
    } finally {
      progressSyncInFlight = false;
      if (progressSyncPending) {
        progressSyncPending = false;
        queueProgressSync(250);
      }
    }
  }

  async function load() {
    try {
      ui.loading.hidden = false;
      ui.loading.innerHTML = '<span></span><p>正在加载知识库…</p>';
      const accountProgress = hydrateAccountProgress();
      if (!window.rewardSchoolApi?.getEnglishKnowledgeDataset) throw new Error('Knowledge API client is unavailable.');
      const payload = await window.rewardSchoolApi.getEnglishKnowledgeDataset();
      state.items = payload.items || [];
      populateSelect(controls.module, Object.keys(moduleLabels), '全部模块', moduleLabels);
      hydrateFromURL();
      updateDependentFilters();
      const params = new URLSearchParams(location.search);
      const previewPDF = params.get('pdf') === '1';
      if (params.get('category')) controls.category.value = params.get('category');
      if (params.get('stage')) controls.stage.value = params.get('stage');
      if (params.get('plan') === 'daily') startDaily();
      else applyFilters(false);
      void accountProgress.then(() => applyFilters(false));
      if (previewPDF) void exportPDF();
    } catch (error) {
      ui.loading.innerHTML = '<strong>知识库资料没有载入</strong><p>资料服务暂时无法连接，请确认本地 API 已启动后重试。</p><button type="button" data-retry-load>重新载入</button>';
      console.error('AEAS English bank load failed:', error);
    }
  }

  function updateDependentFilters() {
    const module = controls.module.value;
    const scope = module ? state.items.filter((item) => item.module === module) : state.items;
    const categories = [...new Set(scope.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const stages = [...new Set(scope.map((item) => item.stage).filter(Boolean))];
    populateSelect(controls.category, categories, '全部类别');
    populateSelect(controls.stage, stages, '全部阶段');
  }

  function matches(item) {
    if (state.dailyMode && !state.dailyKeys.has(item.id)) return false;
    const query = controls.search.value.trim().toLocaleLowerCase();
    if (query) {
      const haystack = [item.title, item.chinese, item.pattern, item.example, item.note, item.memory, item.category].join(' ').toLocaleLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (controls.module.value && item.module !== controls.module.value) return false;
    if (controls.category.value && item.category !== controls.category.value) return false;
    if (controls.stage.value && item.stage !== controls.stage.value) return false;
    if (controls.section.value && !sections(item.sections).includes(controls.section.value)) return false;
    if (controls.evidence.value === 'mock' && !(item.hits > 0)) return false;
    if (controls.evidence.value === 'open' && !/(MIT|GPL|Apache)/.test(item.source)) return false;
    if (controls.progress.value === 'favorite' && !state.favorite.has(item.favoriteKey)) return false;
    if (controls.progress.value === 'mastered' && !state.mastered.has(item.favoriteKey)) return false;
    if (controls.progress.value === 'learning' && state.mastered.has(item.favoriteKey)) return false;
    return true;
  }

  function sortItems(items) {
    const byRank = (a, b) => a.rank - b.rank;
    const sorters = {
      priority: byRank,
      az: (a, b) => a.title.localeCompare(b.title, 'en'),
      za: (a, b) => b.title.localeCompare(a.title, 'en'),
      hits: (a, b) => (b.hits - a.hits) || byRank(a, b),
      module: (a, b) => (moduleLabels[a.module] || '').localeCompare(moduleLabels[b.module] || '', 'zh-CN') || byRank(a, b)
    };
    return items.sort(sorters[controls.sort.value] || byRank);
  }

  function applyFilters(resetPage = true) {
    if (resetPage) state.page = 1;
    state.pageSize = Number(controls.pageSize.value);
    state.filtered = sortItems(state.items.filter(matches));
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.filtered.length / state.pageSize)));
    render();
    updateURL();
  }

  function cardAccountActions(favorite, mastered) {
    if (!isAuthenticated()) return '';
    return '<div class="vocab-card-actions"><button type="button" data-action="favorite" aria-pressed="' + favorite + '">' +
      (favorite ? '★ 已收藏' : '☆ 收藏') +
      '</button><button type="button" data-action="mastered" aria-pressed="' + mastered + '">' +
      (mastered ? '✓ 已掌握' : '标记掌握') + '</button></div>';
  }

  function cardTemplate(item) {
    const authenticated = isAuthenticated();
    const favorite = authenticated && state.favorite.has(item.favoriteKey);
    const mastered = authenticated && state.mastered.has(item.favoriteKey);
    return `<article class="vocab-card knowledge-card${mastered ? ' is-mastered' : ''}" data-key="${escapeHTML(item.favoriteKey)}">
      <div class="vocab-card-head"><span class="vocab-rank">#${item.rank}</span><div><span class="knowledge-module-label">${escapeHTML(moduleLabels[item.module])}</span><h3>${escapeHTML(item.title)}</h3></div>${/^[a-z]/i.test(item.title) ? `<button type="button" class="vocab-speak" data-action="speak" aria-label="朗读 ${escapeHTML(item.title)}">🔊</button>` : ''}</div>
      <div class="vocab-badges"><span>${escapeHTML(item.category)}</span><span>${escapeHTML(item.stage)}</span>${item.hits > 0 ? `<span>模拟题 × ${item.hits}</span>` : ''}</div>
      <p class="vocab-chinese">${escapeHTML(item.chinese)}</p>
      ${item.pattern ? `<div class="knowledge-pattern"><strong>结构 / 词块</strong><br>${escapeHTML(item.pattern)}</div>` : ''}
      ${item.example ? `<p class="knowledge-example"><strong>例句 / 练习：</strong>${escapeHTML(item.example)}</p>` : ''}
      <div class="vocab-memory"><strong>记忆方法</strong><p>${escapeHTML(item.memory)}</p></div>
      <details><summary>考试提醒与资料依据</summary>${item.note ? `<p>${escapeHTML(item.note)}</p>` : ''}<p><strong>相关题型：</strong>${escapeHTML(item.sections)}</p><p><strong>依据：</strong>${escapeHTML(item.source)}</p></details>
      ${cardAccountActions(favorite, mastered)}
    </article>`;
  }

  function compactAccountActions(favorite, mastered) {
    if (!isAuthenticated()) return '';
    return '<button type="button" data-action="favorite" aria-pressed="' + favorite + '">' +
      (favorite ? '★' : '☆') + '</button><button type="button" data-action="mastered" aria-pressed="' +
      mastered + '">' + (mastered ? '✓' : '○') + '</button>';
  }

  function compactTemplate(item) {
    const authenticated = isAuthenticated();
    const favorite = authenticated && state.favorite.has(item.favoriteKey);
    const mastered = authenticated && state.mastered.has(item.favoriteKey);
    return `<article class="vocab-row knowledge-row${mastered ? ' is-mastered' : ''}" data-key="${escapeHTML(item.favoriteKey)}"><span class="vocab-rank">#${item.rank}</span><div class="vocab-row-word"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(moduleLabels[item.module])}</small></div><p>${escapeHTML(shortText(item.chinese, 120))}</p><span>${escapeHTML(item.category)}</span><div>${/^[a-z]/i.test(item.title) ? '<button type="button" data-action="speak" aria-label="朗读">🔊</button>' : ''}${compactAccountActions(favorite, mastered)}</div></article>`;
  }

  function render() {
    ui.loading.hidden = true;
    const start = (state.page - 1) * state.pageSize;
    const pageItems = state.filtered.slice(start, start + state.pageSize);
    ui.list.className = state.view === 'compact' ? 'vocab-compact-list' : 'vocab-card-grid';
    ui.list.innerHTML = pageItems.map(state.view === 'compact' ? compactTemplate : cardTemplate).join('');
    ui.list.hidden = pageItems.length === 0;
    ui.empty.hidden = pageItems.length !== 0;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    ui.pagination.hidden = state.filtered.length <= state.pageSize;
    ui.pageInfo.textContent = `第 ${state.page} / ${totalPages} 页`;
    $('[data-page-action="prev"]').disabled = state.page <= 1;
    $('[data-page-action="next"]').disabled = state.page >= totalPages;
    const activeModule = controls.module.value ? moduleLabels[controls.module.value] : '全部模块';
    ui.summary.textContent = state.dailyMode
      ? `今日学习 ${state.filtered.length} 张 · 跨模块核心内容 · 约 15 分钟`
      : `找到 ${state.filtered.length.toLocaleString('zh-CN')} 项 · ${activeModule} · 第 ${state.page} 页`;
    ui.sessionBanner.hidden = !state.dailyMode;
    ui.exportButton.disabled = state.filtered.length === 0;
    ui.exportButton.setAttribute('aria-label', `导出当前筛选的 ${state.filtered.length} 项为 PDF`);
    ui.exportStatus.textContent = state.filtered.length
      ? `PDF 将包含当前筛选的全部 ${state.filtered.length.toLocaleString('zh-CN')} 项，不受分页限制。`
      : '';
    const mastered = state.items.reduce((count, item) => count + Number(state.mastered.has(item.favoriteKey)), 0);
    ui.progressCount.textContent = `${mastered.toLocaleString('zh-CN')} / ${state.items.length.toLocaleString('zh-CN')}`;
    ui.progressBar.style.width = `${state.items.length ? (mastered / state.items.length) * 100 : 0}%`;
    $$('[data-view]').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function selectedLabel(control) {
    return control.selectedOptions?.[0]?.textContent?.trim() || '';
  }

  function exportFilterSummary() {
    if (state.dailyMode) return ['学习计划：今日 20 张'];
    const filters = [];
    if (controls.search.value.trim()) filters.push(`搜索：${controls.search.value.trim()}`);
    if (controls.module.value) filters.push(`模块：${selectedLabel(controls.module)}`);
    if (controls.category.value) filters.push(`类别：${selectedLabel(controls.category)}`);
    if (controls.stage.value) filters.push(`阶段：${selectedLabel(controls.stage)}`);
    if (controls.section.value) filters.push(`题型：${selectedLabel(controls.section)}`);
    if (controls.evidence.value) filters.push(`资料：${selectedLabel(controls.evidence)}`);
    if (controls.progress.value) filters.push(`状态：${selectedLabel(controls.progress)}`);
    filters.push(`排序：${selectedLabel(controls.sort)}`);
    return filters;
  }

  function pdfCardTemplate(item, index) {
    const evidence = item.hits > 0 ? `<span>模拟题命中 × ${item.hits}</span>` : '';
    return `<article class="pdf-knowledge-row"><div class="pdf-knowledge-head"><span>${index + 1}</span><strong>${escapeHTML(item.title)}</strong><em>${escapeHTML(moduleLabels[item.module])} · #${item.rank}</em></div><p class="pdf-knowledge-cn">${escapeHTML(item.chinese)}</p><div class="pdf-knowledge-tags"><span>${escapeHTML(item.category)}</span><span>${escapeHTML(item.stage)}</span>${evidence}</div><div class="pdf-knowledge-grid"><p><b>结构</b>${escapeHTML(item.pattern)}</p><p><b>例句</b>${escapeHTML(item.example)}</p><p><b>记忆</b>${escapeHTML(item.memory)}</p>${item.note ? `<p><b>提醒</b>${escapeHTML(item.note)}</p>` : ''}</div></article>`;
  }

  async function exportPDF() {
    if (!state.filtered.length) return;
    const count = state.filtered.length;
    if (count > 1000 && !window.confirm(`当前筛选共有 ${count.toLocaleString('zh-CN')} 项，将生成较大的紧凑版 PDF，手机可能需要几分钟。仍要继续吗？`)) return;
    ui.exportButton.disabled = true;
    ui.exportStatus.textContent = `正在生成 ${count.toLocaleString('zh-CN')} 项紧凑版 PDF…`;
    const generated = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
    const filters = exportFilterSummary();
    const title = state.dailyMode ? 'AEAS 今日学习 20 张' : 'AEAS 英语知识库 - 筛选结果';
    try {
      const result = await window.rewardSchoolPdf.download({
        filename: `AEAS-英语知识库-${new Date().toISOString().slice(0, 10)}.pdf`, title,
        subtitle: `共 ${count.toLocaleString('zh-CN')} 项 · ${generated}`, filters,
        note: '紧凑版包含当前筛选的全部内容，不受网页分页影响；每项优先保持完整，避免结构、例句和记忆方法跨页。',
        blocks: state.filtered.map(pdfCardTemplate), escape: escapeHTML,
        css: `.pdf-knowledge-row{padding:6px 8px;border:1px solid #dbe5f2;border-radius:7px;background:#fff}.pdf-knowledge-head{display:flex;align-items:baseline;gap:7px}.pdf-knowledge-head>span{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#0b4b9d;color:#fff;font-size:8px;font-weight:800}.pdf-knowledge-head strong{font-size:13px;color:#071f49}.pdf-knowledge-head em{margin-left:auto;color:#687b94;font-size:8px;font-style:normal}.pdf-knowledge-cn{margin:3px 0;color:#172f55;font-size:10px;font-weight:700}.pdf-knowledge-tags{display:flex;flex-wrap:wrap;gap:3px;margin:3px 0}.pdf-knowledge-tags span{padding:2px 5px;border-radius:999px;background:#edf4fc;color:#255887;font-size:7px}.pdf-knowledge-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;border-top:1px solid #e4ebf4;padding-top:4px}.pdf-knowledge-grid p{margin:0;color:#405773;font-size:8px;overflow-wrap:anywhere}.pdf-knowledge-grid b{margin-right:4px;color:#0b4b9d}`,
        onProgress: ({ phase, current, total }) => { ui.exportStatus.textContent = phase === 'layout' ? `正在排版 ${current.toLocaleString('zh-CN')} / ${total.toLocaleString('zh-CN')}…` : phase === 'render' ? `正在生成 PDF 第 ${current} / ${total} 页…` : '正在下载 PDF…'; },
      });
      ui.exportStatus.textContent = `已下载紧凑版 PDF：${result.items.toLocaleString('zh-CN')} 项，共 ${result.pages} 页。`;
    } catch (error) {
      console.error('Knowledge PDF download failed:', error);
      ui.exportStatus.textContent = error.message || 'PDF 生成失败，请稍后重试。';
    } finally {
      ui.exportButton.disabled = false;
    }
  }

  function resetFilters(renderNow = true) {
    state.dailyMode = false;
    state.dailyKeys.clear();
    Object.entries(controls).forEach(([key, control]) => {
      if (key === 'sort') control.value = 'priority';
      else if (key === 'pageSize') control.value = '24';
      else control.value = '';
    });
    updateDependentFilters();
    if (renderNow) applyFilters();
  }

  function selectModule(module) {
    resetFilters(false);
    controls.module.value = module;
    updateDependentFilters();
    applyFilters();
    app.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startDaily() {
    if (!state.items.length) return;
    resetFilters(false);
    const quotas = { grammar: 6, collocation: 6, phrasal: 3, preposition: 2, wordform: 1, writing: 2 };
    const selected = [];
    const available = state.items.filter((item) => !state.mastered.has(item.favoriteKey));
    Object.entries(quotas).forEach(([module, count]) => {
      const pool = available.filter((item) => item.module === module && item.stage === '核心必备');
      selected.push(...pool.slice(0, count));
    });
    if (selected.length < 20) {
      const chosen = new Set(selected.map((item) => item.id));
      selected.push(...available.filter((item) => !chosen.has(item.id)).slice(0, 20 - selected.length));
    }
    state.dailyKeys = new Set(selected.slice(0, 20).map((item) => item.id));
    state.dailyMode = true;
    state.pageSize = 24;
    controls.pageSize.value = '24';
    applyFilters();
    app.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s*[/–—].*$/, ''));
    utterance.lang = 'en-AU'; utterance.rate = .86;
    window.speechSynthesis.speak(utterance);
  }

  let searchTimer;
  Object.entries(controls).forEach(([key, control]) => {
    control.addEventListener(key === 'search' ? 'input' : 'change', () => {
      if (key === 'module') updateDependentFilters();
      if (key === 'search') {
        clearTimeout(searchTimer); searchTimer = setTimeout(() => applyFilters(), 180);
      } else applyFilters();
    });
  });

  document.querySelectorAll('[data-module-shortcut]').forEach((button) => {
    button.addEventListener('click', () => selectModule(button.dataset.moduleShortcut));
  });

  document.querySelectorAll('[data-study-plan]').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = button.dataset.studyPlan;
      if (plan === 'daily') startDaily();
      else selectModule(plan);
    });
  });

  app.addEventListener('click', (event) => {
    if (event.target.closest('[data-retry-load]')) { void load(); return; }
    if (event.target.closest('[data-export-pdf]')) { exportPDF(); return; }
    if (event.target.closest('[data-exit-session]')) { resetFilters(); return; }
    if (event.target.closest('[data-reset-filters]')) { resetFilters(); return; }
    const quick = event.target.closest('[data-quick-filter]');
    if (quick) {
      if (quick.dataset.quickFilter === 'mock') { resetFilters(false); controls.evidence.value = 'mock'; applyFilters(); }
      else selectModule(quick.dataset.quickFilter);
      return;
    }
    const view = event.target.closest('[data-view]');
    if (view) { state.view = view.dataset.view; localStorage.setItem(viewStorageKey, state.view); render(); return; }
    const pageButton = event.target.closest('[data-page-action]');
    if (pageButton && !pageButton.disabled) {
      state.page += pageButton.dataset.pageAction === 'next' ? 1 : -1;
      render(); updateURL(); app.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    const action = event.target.closest('[data-action]');
    const article = action?.closest('[data-key]');
    if (!action || !article) return;
    if (action.dataset.action === 'speak') { speak(article.querySelector('h3, strong')?.textContent || ''); return; }
    if (!isAuthenticated()) return;
    const name = action.dataset.action;
    const key = article.dataset.key;
    state[name].has(key) ? state[name].delete(key) : state[name].add(key);
    queueProgressSync();
    applyFilters(false);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); controls.search.focus();
    }
  });

  load();
})();
