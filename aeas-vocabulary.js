(() => {
  'use strict';

  const app = document.querySelector('[data-vocabulary-app]');
  if (!app) return;

  const authStorageKey = 'rewardSchoolAeasAuthV1';
  const practiceKind = 'aeas-vocabulary';
  const legacyStorageKeys = {
    favorite: 'rewardAeasVocabFavoritesV1',
    mastered: 'rewardAeasVocabMasteredV1'
  };
  const viewStorageKey = 'rewardAeasVocabViewV1';
  const $ = (selector) => app.querySelector(selector);
  const $$ = (selector) => [...app.querySelectorAll(selector)];
  const controls = {
    search: $('[data-filter-search]'), topic: $('[data-filter-topic]'),
    stage: $('[data-filter-stage]'), pos: $('[data-filter-pos]'),
    section: $('[data-filter-section]'), source: $('[data-filter-source]'),
    progress: $('[data-filter-progress]'), sort: $('[data-sort]'),
    pageSize: $('[data-page-size]')
  };
  const ui = {
    list: $('[data-word-list]'), loading: $('[data-loading]'), empty: $('[data-empty]'),
    summary: $('[data-result-summary]'), pagination: $('[data-pagination]'),
    pageInfo: $('[data-page-info]'), progressCount: $('[data-progress-count]'),
    progressBar: $('[data-progress-bar]'), exportButton: $('[data-export-pdf]'),
    exportStatus: $('[data-export-status]'), authGuest: $('[data-auth-guest]'),
    authUser: $('[data-auth-user]'), authName: $('[data-auth-name]'),
    syncStatus: $('[data-sync-status]'), accountFilter: $('[data-account-filter]')
  };
  const cache = {};
  const state = {
    mode: 'core', words: [], filtered: [], page: 1, pageSize: 24,
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

  function shortText(value, length = 220) {
    const text = cleanText(value);
    return text.length > length ? `${text.slice(0, length).trim()}…` : text;
  }

  function cleanText(value) {
    return String(value || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
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
      console.warn('Could not load vocabulary account progress:', error);
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
    if (progressSyncInFlight) { progressSyncPending = true; return; }
    progressSyncInFlight = true;
    try {
      await window.rewardSchoolApi.savePracticeProgress({
        token: state.auth.token,
        kind: practiceKind,
        sessionId: 'vocabulary-bank-v1',
        progress: {
          favorite: [...state.favorite],
          mastered: [...state.mastered],
          updatedAt: new Date().toISOString()
        }
      });
      ui.syncStatus.textContent = '已同步到账号 · 可跨设备继续';
    } catch (error) {
      console.warn('Could not sync vocabulary account progress:', error);
      ui.syncStatus.textContent = '云端同步暂时失败 · 下次操作会重试';
    } finally {
      progressSyncInFlight = false;
      if (progressSyncPending) {
        progressSyncPending = false;
        queueProgressSync(250);
      }
    }
  }

  function splitSections(value) {
    return String(value || '').split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
  }

  function hydrateFromURL() {
    const params = new URLSearchParams(location.search);
    state.mode = params.get('list') === 'full' ? 'full' : 'core';
    controls.search.value = params.get('q') || '';
    ['topic', 'stage', 'pos', 'section', 'source', 'progress', 'sort'].forEach((key) => {
      if (params.has(key) && controls[key]) controls[key].value = params.get(key);
    });
    if (['24', '48', '96'].includes(params.get('size'))) controls.pageSize.value = params.get('size');
    state.pageSize = Number(controls.pageSize.value);
    state.page = Math.max(1, Number(params.get('page')) || 1);
  }

  function updateURL() {
    const params = new URLSearchParams();
    if (state.mode === 'full') params.set('list', 'full');
    const mapping = { q: 'search', topic: 'topic', stage: 'stage', pos: 'pos', section: 'section', source: 'source', progress: 'progress', sort: 'sort' };
    Object.entries(mapping).forEach(([key, name]) => {
      const value = controls[name].value.trim();
      if (value && !(key === 'sort' && value === 'priority')) params.set(key, value);
    });
    if (state.pageSize !== 24) params.set('size', String(state.pageSize));
    if (state.page > 1) params.set('page', String(state.page));
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  }

  async function load(mode) {
    const previewPDF = new URLSearchParams(location.search).get('pdf') === '1';
    state.mode = mode;
    ui.loading.hidden = false;
    ui.list.hidden = true;
    ui.empty.hidden = true;
    ui.pagination.hidden = true;
    $$("[data-list]").forEach((button) => {
      const active = button.dataset.list === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    try {
      ui.loading.innerHTML = '<span></span><p>正在加载词库…</p>';
      if (!cache[mode]) {
        if (!window.rewardSchoolApi?.getVocabularyDataset) throw new Error('Vocabulary API client is unavailable.');
        cache[mode] = await window.rewardSchoolApi.getVocabularyDataset({ list: mode });
      }
      state.words = cache[mode].words || [];
      populateDynamicFilters();
      applyFilters(false);
      if (previewPDF) void exportPDF();
    } catch (error) {
      ui.loading.innerHTML = '<strong>词库资料没有载入</strong><p>资料服务暂时无法连接，请确认本地 API 已启动后重试。</p><button type="button" data-retry-load>重新载入</button>';
      console.error('AEAS vocabulary load failed:', error);
    }
  }

  function populateSelect(select, values, initialLabel) {
    const selected = select.value;
    select.innerHTML = `<option value="">${escapeHTML(initialLabel)}</option>${values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('')}`;
    if (values.includes(selected)) select.value = selected;
  }

  function populateDynamicFilters() {
    const topics = [...new Set(state.words.map((word) => word.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const stages = [...new Set(state.words.map((word) => word.stage).filter(Boolean))];
    populateSelect(controls.topic, topics, '全部主题');
    populateSelect(controls.stage, stages, '全部阶段');
  }

  function matches(word) {
    const query = controls.search.value.trim().toLocaleLowerCase();
    if (query) {
      const haystack = [word.word, word.chinese, word.english, word.forms].join(' ').toLocaleLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (controls.topic.value && word.topic !== controls.topic.value) return false;
    if (controls.stage.value && word.stage !== controls.stage.value) return false;
    if (controls.pos.value && !String(word.pos).includes(controls.pos.value)) return false;
    if (controls.section.value && !splitSections(word.sections).includes(controls.section.value)) return false;
    if (controls.source.value === 'mock' && !(word.hits > 0)) return false;
    if (controls.source.value === 'nawl' && !word.nawl) return false;
    if (controls.source.value === 'ngsl' && !(word.ngslRank > 0)) return false;
    if (controls.progress.value === 'favorite' && !state.favorite.has(word.word)) return false;
    if (controls.progress.value === 'mastered' && !state.mastered.has(word.word)) return false;
    if (controls.progress.value === 'learning' && state.mastered.has(word.word)) return false;
    return true;
  }

  function sortWords(words) {
    const byRank = (a, b) => a.rank - b.rank;
    const options = {
      priority: byRank,
      az: (a, b) => a.word.localeCompare(b.word, 'en'),
      za: (a, b) => b.word.localeCompare(a.word, 'en'),
      hits: (a, b) => (b.hits - a.hits) || byRank(a, b),
      frequency: (a, b) => ((a.frequencyRank || Infinity) - (b.frequencyRank || Infinity)) || byRank(a, b),
      topic: (a, b) => a.topic.localeCompare(b.topic, 'zh-CN') || byRank(a, b)
    };
    return words.sort(options[controls.sort.value] || byRank);
  }

  function applyFilters(resetPage = true) {
    if (resetPage) state.page = 1;
    state.pageSize = Number(controls.pageSize.value);
    state.filtered = sortWords(state.words.filter(matches));
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    render();
    updateURL();
  }

  function badges(word) {
    const result = [word.stage, word.topic, word.pos].filter(Boolean);
    if (word.nawl) result.push('NAWL 学术词');
    if (word.hits > 0) result.push(`模拟题 × ${word.hits}`);
    return result.map((badge) => `<span>${escapeHTML(badge)}</span>`).join('');
  }

  function cardAccountActions(favorite, mastered) {
    if (!isAuthenticated()) return '';
    return `<div class="vocab-card-actions"><button type="button" data-action="favorite" aria-pressed="${favorite}">${favorite ? '★ 已收藏' : '☆ 收藏'}</button><button type="button" data-action="mastered" aria-pressed="${mastered}">${mastered ? '✓ 已掌握' : '标记掌握'}</button></div>`;
  }

  function compactAccountActions(favorite, mastered) {
    if (!isAuthenticated()) return '';
    return `<button type="button" data-action="favorite" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button><button type="button" data-action="mastered" aria-pressed="${mastered}">${mastered ? '✓' : '○'}</button>`;
  }

  function cardTemplate(word) {
    const authenticated = isAuthenticated();
    const favorite = authenticated && state.favorite.has(word.word);
    const mastered = authenticated && state.mastered.has(word.word);
    return `<article class="vocab-card${mastered ? ' is-mastered' : ''}" data-word="${escapeHTML(word.word)}">
      <div class="vocab-card-head"><span class="vocab-rank">#${word.rank}</span><div><h3>${escapeHTML(word.word)}</h3>${word.phonetic ? `<p>/${escapeHTML(word.phonetic)}/</p>` : ''}</div><button type="button" class="vocab-speak" data-action="speak" aria-label="朗读 ${escapeHTML(word.word)}">🔊</button></div>
      <p class="vocab-chinese">${escapeHTML(cleanText(word.chinese) || '暂无中文释义')}</p>
      <div class="vocab-memory"><strong>记忆方法</strong><p>${escapeHTML(cleanText(word.memory) || '结合主题与例句反复回忆。')}</p></div>
      <p class="vocab-exam-use"><strong>考试应用：</strong>${escapeHTML(cleanText(word.examUse) || '阅读识别与语境理解')}</p>
      <details><summary>英文释义与词族</summary><p>${escapeHTML(shortText(word.english, 420) || '暂无英文释义')}</p>${word.forms ? `<p><strong>词族：</strong>${escapeHTML(cleanText(word.forms))}</p>` : ''}${word.sections ? `<p><strong>相关题型：</strong>${escapeHTML(cleanText(word.sections))}</p>` : ''}</details>
      ${cardAccountActions(favorite, mastered)}
      <div class="vocab-badges" aria-label="辅助分类标签">${badges(word)}</div>
    </article>`;
  }

  function compactTemplate(word) {
    const authenticated = isAuthenticated();
    const favorite = authenticated && state.favorite.has(word.word);
    const mastered = authenticated && state.mastered.has(word.word);
    return `<article class="vocab-row${mastered ? ' is-mastered' : ''}" data-word="${escapeHTML(word.word)}">
      <span class="vocab-rank">#${word.rank}</span><div class="vocab-row-word"><strong>${escapeHTML(word.word)}</strong><small>${escapeHTML(word.phonetic || '')}</small></div><p>${escapeHTML(shortText(word.chinese, 95))}</p><span>${escapeHTML(word.topic)}</span><div><button type="button" data-action="speak" aria-label="朗读">🔊</button>${compactAccountActions(favorite, mastered)}</div>
    </article>`;
  }

  function render() {
    ui.loading.hidden = true;
    const start = (state.page - 1) * state.pageSize;
    const pageWords = state.filtered.slice(start, start + state.pageSize);
    ui.list.className = state.view === 'compact' ? 'vocab-compact-list' : 'vocab-card-grid';
    ui.list.innerHTML = pageWords.map(state.view === 'compact' ? compactTemplate : cardTemplate).join('');
    ui.list.hidden = pageWords.length === 0;
    ui.empty.hidden = pageWords.length !== 0;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    ui.pagination.hidden = state.filtered.length <= state.pageSize;
    ui.pageInfo.textContent = `第 ${state.page} / ${totalPages} 页`;
    $('[data-page-action="prev"]').disabled = state.page <= 1;
    $('[data-page-action="next"]').disabled = state.page >= totalPages;
    ui.summary.textContent = `找到 ${state.filtered.length.toLocaleString('zh-CN')} 个词 · ${state.mode === 'core' ? '核心 2000' : '完整 8000'} · 第 ${state.page} 页`;
    ui.exportButton.disabled = state.filtered.length === 0;
    ui.exportButton.setAttribute('aria-label', `导出当前筛选的 ${state.filtered.length} 个词为 PDF`);
    ui.exportStatus.textContent = state.filtered.length
      ? `PDF 将包含全部 ${state.filtered.length.toLocaleString('zh-CN')} 个筛选结果，不受分页影响。`
      : '';
    const masteredCount = state.words.reduce((count, word) => count + Number(state.mastered.has(word.word)), 0);
    ui.progressCount.textContent = `${masteredCount.toLocaleString('zh-CN')} / ${state.words.length.toLocaleString('zh-CN')}`;
    ui.progressBar.style.width = `${state.words.length ? (masteredCount / state.words.length) * 100 : 0}%`;
    $$('[data-view]').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function resetFilters() {
    Object.entries(controls).forEach(([key, control]) => {
      if (key === 'sort') control.value = 'priority';
      else if (key === 'pageSize') control.value = '24';
      else control.value = '';
    });
    applyFilters();
  }

  function exportFilterSummary() {
    const filters = [state.mode === 'core' ? '核心 2000' : '完整 8000'];
    const query = controls.search.value.trim();
    if (query) filters.push(`搜索：${query}`);
    ['topic', 'stage', 'pos', 'section', 'source', 'progress', 'sort'].forEach((name) => {
      const control = controls[name];
      const option = control?.selectedOptions?.[0];
      if (control?.value && option) filters.push(option.textContent.trim());
    });
    return filters;
  }

  function pdfWordTemplate(word, index) {
    const tags = [word.stage, word.topic, word.pos, word.nawl ? 'NAWL 学术词' : '', word.hits > 0 ? `模拟题 × ${word.hits}` : ''].filter(Boolean);
    return `<article class="pdf-vocab-row"><div class="pdf-vocab-head"><span>${index + 1}</span><strong>${escapeHTML(word.word)}</strong>${word.phonetic ? `<small>/${escapeHTML(word.phonetic)}/</small>` : ''}<em>#${word.rank}</em></div><p class="pdf-vocab-cn">${escapeHTML(cleanText(word.chinese) || '暂无中文释义')}</p><div class="pdf-vocab-meta">${tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div><div class="pdf-vocab-grid"><p><b>记忆</b>${escapeHTML(cleanText(word.memory) || '结合主题与例句反复回忆。')}</p><p><b>应用</b>${escapeHTML(cleanText(word.examUse) || '阅读识别与语境理解')}</p>${word.forms ? `<p><b>词族</b>${escapeHTML(cleanText(word.forms))}</p>` : ''}${word.sections ? `<p><b>题型</b>${escapeHTML(cleanText(word.sections))}</p>` : ''}</div></article>`;
  }

  async function exportPDF() {
    const count = state.filtered.length;
    if (!count) return;
    if (count > 1000 && !window.confirm(`当前筛选包含 ${count.toLocaleString('zh-CN')} 个词，将生成较大的紧凑版 PDF，手机可能需要几分钟。仍要继续吗？`)) return;
    ui.exportButton.disabled = true;
    ui.exportStatus.textContent = `正在生成 ${count.toLocaleString('zh-CN')} 个词的紧凑版 PDF…`;
    const title = `AEAS ${state.mode === 'core' ? '核心 2000' : '完整 8000'} 词汇学习清单`;
    const filters = exportFilterSummary();
    const generated = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date());
    try {
      const result = await window.rewardSchoolPdf.download({
        filename: `AEAS-${state.mode === 'core' ? '核心2000' : '完整8000'}-词汇-${new Date().toISOString().slice(0, 10)}.pdf`,
        title,
        subtitle: `共 ${count.toLocaleString('zh-CN')} 个词 · ${generated}`,
        filters,
        note: '紧凑版包含当前筛选的全部词汇，不受网页页码或每页显示数量影响。每个条目优先保持在同一页。',
        blocks: state.filtered.map(pdfWordTemplate),
        escape: escapeHTML,
        css: `.pdf-vocab-row{padding:6px 8px;border:1px solid #dbe5f2;border-radius:7px;background:#fff}.pdf-vocab-head{display:flex;align-items:baseline;gap:7px}.pdf-vocab-head>span{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#0b4b9d;color:#fff;font-size:8px;font-weight:800}.pdf-vocab-head strong{font-size:15px;color:#071f49}.pdf-vocab-head small{color:#61738b;font-size:9px}.pdf-vocab-head em{margin-left:auto;color:#77869a;font-size:8px;font-style:normal}.pdf-vocab-cn{margin:3px 0;color:#172f55;font-size:10px;font-weight:700}.pdf-vocab-meta{display:flex;flex-wrap:wrap;gap:3px;margin:3px 0}.pdf-vocab-meta span{padding:2px 5px;border-radius:999px;background:#edf4fc;color:#255887;font-size:7px}.pdf-vocab-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;border-top:1px solid #e4ebf4;padding-top:4px}.pdf-vocab-grid p{margin:0;color:#405773;font-size:8px;overflow-wrap:anywhere}.pdf-vocab-grid b{margin-right:4px;color:#0b4b9d}`, 
        onProgress: ({ phase, current, total }) => {
          ui.exportStatus.textContent = phase === 'layout' ? `正在排版 ${current.toLocaleString('zh-CN')} / ${total.toLocaleString('zh-CN')}…` : phase === 'render' ? `正在生成 PDF 第 ${current} / ${total} 页…` : '正在下载 PDF…';
        },
      });
      ui.exportStatus.textContent = `已下载紧凑版 PDF：${result.items.toLocaleString('zh-CN')} 个词，共 ${result.pages} 页。`;
    } catch (error) {
      console.error('Vocabulary PDF download failed:', error);
      ui.exportStatus.textContent = error.message || 'PDF 生成失败，请稍后重试。';
    } finally {
      ui.exportButton.disabled = false;
    }
  }

  function speak(word) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-AU';
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  }

  let searchTimer;
  Object.entries(controls).forEach(([key, control]) => {
    const eventName = key === 'search' ? 'input' : 'change';
    control.addEventListener(eventName, () => {
      if (key === 'search') {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => applyFilters(), 180);
      } else applyFilters();
    });
  });

  app.addEventListener('click', (event) => {
    if (event.target.closest('[data-retry-load]')) { void load(state.mode); return; }
    if (event.target.closest('[data-export-pdf]')) { exportPDF(); return; }
    const listButton = event.target.closest('[data-list]');
    if (listButton) { state.page = 1; load(listButton.dataset.list); return; }
    if (event.target.closest('[data-reset-filters]')) { resetFilters(); return; }
    const quick = event.target.closest('[data-quick-filter]');
    if (quick) {
      resetFilters();
      const value = quick.dataset.quickFilter;
      if (value === 'mock' || value === 'nawl') controls.source.value = value;
      else if (value === '写作') controls.section.value = value;
      else controls.topic.value = value;
      applyFilters(); return;
    }
    const view = event.target.closest('[data-view]');
    if (view) { state.view = view.dataset.view; localStorage.setItem(viewStorageKey, state.view); render(); return; }
    const page = event.target.closest('[data-page-action]');
    if (page && !page.disabled) {
      state.page += page.dataset.pageAction === 'next' ? 1 : -1;
      render(); updateURL(); app.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    const action = event.target.closest('[data-action]');
    const article = action?.closest('[data-word]');
    if (!action || !article) return;
    const word = article.dataset.word;
    if (action.dataset.action === 'speak') { speak(word); return; }
    if (!isAuthenticated()) return;
    const name = action.dataset.action;
    state[name].has(word) ? state[name].delete(word) : state[name].add(word);
    queueProgressSync();
    applyFilters(false);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); controls.search.focus();
    }
  });

  async function init() {
    hydrateFromURL();
    renderAuthState();
    await Promise.allSettled([load(state.mode), hydrateAccountProgress()]);
    if (state.words.length) applyFilters(false);
  }

  void init();
})();
