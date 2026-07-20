const ADMIN_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";
const ROLE_LABELS = {
  Guest: "游客",
  VerifiedGuest: "已认证游客",
  Student: "学生",
  Teacher: "老师",
  Advisor: "Advisor",
  Admin: "Admin",
};
const PERMISSION_LABELS = {
  MockTest: "模拟考",
  MockAiReview: "模拟考 AI 答题",
  SchoolInformation: "学校信息",
  PracticeReview: "学生练习批改",
  AnalyticsDashboard: "数据面板",
};
const EVENT_LABELS = {
  all_visitors: "全部访客",
  page_view: "页面浏览",
  consultation_click: "咨询点击",
  consultation_submit: "咨询提交",
  wechat_click: "微信点击",
  mock_entry_click: "模考入口点击",
  mock_start: "进入模考",
  mock_subject_open: "打开练习科目",
  mock_exam_start: "开始完整模考",
  auth_login: "成功登录",
  auth_register: "成功注册",
  school_profile_view: "学校页浏览",
};
const SOURCE_LABELS = {
  direct: "直接访问",
  baidu: "百度",
  google: "Google",
  bing: "Bing",
  wechat: "微信",
  xiaohongshu: "小红书",
  zhihu: "知乎",
};
const DEVICE_LABELS = { mobile: "手机", desktop: "电脑", tablet: "平板", unknown: "未知设备" };
const FUNNEL_LABELS = { consultation: "咨询转化", mock_test: "模拟考使用", registration: "账号注册" };

const gate = document.querySelector("[data-admin-gate]");
const consolePanel = document.querySelector("[data-admin-console]");
const userList = document.querySelector("[data-admin-users]");
const userFilter = document.querySelector("[data-user-filter]");
const permissionMatrix = document.querySelector("[data-permission-matrix]");
const analyticsFilter = document.querySelector("[data-analytics-filter]");
const analyticsPanel = document.querySelector("[data-admin-analytics]");
let users = [];
let accessConfiguration = null;
let analyticsSummary = null;
let activeAnalyticsTab = "overview";
let analyticsReport = null;
let analyticsReportType = "sessions";
let analyticsReportSearch = "";
let analyticsReportPage = 1;
let analyticsReportPageSize = 10;

void initAdmin();

function getToken() {
  try { return JSON.parse(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) || "null")?.token || ""; }
  catch { return ""; }
}

async function initAdmin() {
  const token = getToken();
  if (!token) return denyAccess("尚未登录", "请先登录 Admin 账号。", true);
  try {
    const user = await window.rewardSchoolApi.getCurrentUser({ token });
    if (!user?.admin) return denyAccess("没有管理权限", "此页面仅开放给 Admin。", false);
    gate.hidden = true;
    consolePanel.hidden = false;
    document.querySelector("[data-admin-identity]").textContent = `${user.displayName || user.email} · ${user.email}`;
    bindAdminEvents();
    setPresetDates(30);
    await loadAll();
  } catch (error) {
    denyAccess("无法验证权限", error.message || "请重新登录。", true);
  }
}

function denyAccess(title, message, showLogin) {
  consolePanel.hidden = true;
  gate.hidden = false;
  gate.innerHTML = `<p class="eyebrow">Admin Access</p><h1>${escapeHTML(title)}</h1><p>${escapeHTML(message)}</p>${showLogin ? '<a class="admin-primary-link" href="profile.html">前往登录</a>' : '<a class="admin-primary-link" href="index.html">返回网站</a>'}`;
}

function bindAdminEvents() {
  document.querySelector("[data-admin-refresh]")?.addEventListener("click", () => void loadAll());
  userFilter?.addEventListener("input", renderUsers);
  userList?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-user-role]");
    if (select) void updateUserRole(select);
  });
  permissionMatrix?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-role-permission]");
    if (input) void updateRolePermission(input);
  });
  analyticsFilter?.elements.preset?.addEventListener("change", (event) => {
    if (event.target.value !== "custom") setPresetDates(Number(event.target.value));
  });
  analyticsFilter?.addEventListener("submit", (event) => { event.preventDefault(); void loadAnalytics(); });
  analyticsPanel?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-analytics-tab]");
    if (tab) {
      activeAnalyticsTab = tab.dataset.analyticsTab;
      renderAnalytics();
      if (activeAnalyticsTab === "audience" && !analyticsReport) void loadAnalyticsReport();
      return;
    }
    const pageButton = event.target.closest("[data-report-page]");
    if (pageButton && !pageButton.disabled) {
      analyticsReportPage = Number(pageButton.dataset.reportPage);
      void loadAnalyticsReport();
    }
  });
  analyticsPanel?.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-analytics-report-filter]");
    if (!form) return;
    event.preventDefault();
    analyticsReportType = form.elements.type.value;
    analyticsReportSearch = form.elements.search.value.trim();
    analyticsReportPageSize = Number(form.elements.pageSize.value);
    analyticsReportPage = 1;
    void loadAnalyticsReport();
  });
}

async function loadAll() {
  await Promise.all([loadUsers(), loadAccessConfiguration(), loadAnalytics()]);
}

async function loadUsers() {
  userList.innerHTML = "<span>正在读取账号...</span>";
  try {
    const response = await window.rewardSchoolApi.getAdminUsers({ token: getToken() });
    users = Array.isArray(response.users) ? response.users : [];
    renderUsers();
  } catch (error) {
    userList.innerHTML = `<span class="is-error">${escapeHTML(error.message || "账号读取失败。")}</span>`;
  }
}

function renderUsers() {
  const query = (userFilter?.value || "").trim().toLowerCase();
  const filtered = users.filter((user) => `${user.displayName} ${user.email}`.toLowerCase().includes(query));
  userList.innerHTML = filtered.length ? filtered.map((user) => {
    const role = normalizeEnum(user.role);
    const options = Object.entries(ROLE_LABELS).filter(([value]) => value !== "Admin" || role === "Admin").map(([value, label]) => `<option value="${value}" ${value === role ? "selected" : ""}>${label}</option>`).join("");
    return `<article class="admin-user-row"><div><strong>${escapeHTML(user.displayName || user.email)}</strong><span>${escapeHTML(user.email)}</span></div><span class="admin-verified ${user.emailVerified ? "is-verified" : ""}">${user.emailVerified ? "邮箱已认证" : "邮箱未认证"}</span><label><span>角色</span><select data-user-role data-user-id="${escapeHTML(user.id)}" ${role === "Admin" ? "disabled" : ""}>${options}</select></label></article>`;
  }).join("") : "<span>没有符合条件的账号。</span>";
}

async function updateUserRole(select) {
  const previous = normalizeEnum(users.find((user) => user.id === select.dataset.userId)?.role || "Guest");
  select.disabled = true;
  try {
    const updated = await window.rewardSchoolApi.setUserRole({ token: getToken(), userId: select.dataset.userId, role: select.value });
    users = users.map((user) => user.id === updated.id ? updated : user);
    renderUsers();
  } catch (error) {
    select.value = previous;
    select.disabled = false;
    alert(error.message || "角色更新失败。");
  }
}

async function loadAccessConfiguration() {
  try {
    accessConfiguration = await window.rewardSchoolApi.getAccessConfiguration({ token: getToken() });
    renderPermissionMatrix();
  } catch (error) {
    permissionMatrix.innerHTML = `<tbody><tr><td class="is-error">${escapeHTML(error.message || "权限读取失败。")}</td></tr></tbody>`;
  }
}

function renderPermissionMatrix() {
  const roles = (accessConfiguration.roles || []).map(normalizeEnum);
  const permissions = (accessConfiguration.permissions || []).map(normalizeEnum);
  const enabled = new Map((accessConfiguration.assignments || []).map((item) => [`${normalizeEnum(item.role)}:${normalizeEnum(item.permission)}`, Boolean(item.enabled)]));
  permissionMatrix.innerHTML = `<thead><tr><th>角色</th>${permissions.map((permission) => `<th>${PERMISSION_LABELS[permission] || permission}</th>`).join("")}</tr></thead><tbody>${roles.map((role) => `<tr><th>${ROLE_LABELS[role] || role}</th>${permissions.map((permission) => { const checked = role === "Admin" || enabled.get(`${role}:${permission}`); return `<td><label class="admin-permission-switch"><input type="checkbox" data-role-permission data-role="${role}" data-permission="${permission}" ${checked ? "checked" : ""} ${role === "Admin" ? "disabled" : ""} /><span>${checked ? "开启" : "关闭"}</span></label></td>`; }).join("")}</tr>`).join("")}</tbody>`;
}

async function updateRolePermission(input) {
  input.disabled = true;
  try {
    await window.rewardSchoolApi.setRolePermission({ token: getToken(), role: input.dataset.role, permission: input.dataset.permission, enabled: input.checked });
    await loadAccessConfiguration();
  } catch (error) {
    input.checked = !input.checked;
    input.disabled = false;
    alert(error.message || "权限更新失败。");
  }
}

function setPresetDates(days) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(1, days) + 1);
  analyticsFilter.elements.start.value = toDateInput(start);
  analyticsFilter.elements.end.value = toDateInput(end);
}

async function loadAnalytics() {
  analyticsPanel.innerHTML = "<span>正在读取事件数据...</span>";
  try {
    analyticsSummary = await window.rewardSchoolApi.getAdminAnalytics({
      token: getToken(),
      start: analyticsFilter.elements.start.value,
      end: analyticsFilter.elements.end.value,
      event: analyticsFilter.elements.event.value,
      source: analyticsFilter.elements.source.value,
      device: analyticsFilter.elements.device.value,
      page: analyticsFilter.elements.page.value.trim(),
    });
    analyticsReport = null;
    analyticsReportPage = 1;
    renderAnalytics();
    if (activeAnalyticsTab === "audience") void loadAnalyticsReport();
  } catch (error) {
    analyticsPanel.innerHTML = `<span class="is-error">${escapeHTML(error.message || "事件数据读取失败。")}</span>`;
  }
}

function renderAnalytics() {
  if (!analyticsSummary) return;
  const summary = analyticsSummary;
  const filters = [
    summary.eventName ? EVENT_LABELS[summary.eventName] || summary.eventName : "全部事件",
    summary.source ? SOURCE_LABELS[summary.source] || summary.source : "全部来源",
    summary.device ? DEVICE_LABELS[summary.device] || summary.device : "全部设备",
    summary.page ? `页面：${summary.page}` : "",
  ].filter(Boolean);
  const tabs = [
    ["overview", "总览"], ["acquisition", "流量来源"], ["content", "页面内容"],
    ["audience", "访客 / Session"], ["conversion", "事件与转化"],
  ];
  analyticsPanel.innerHTML = `
    <div class="admin-analytics-meta">${escapeHTML(summary.startDate)} 至 ${escapeHTML(summary.endDate)} · ${filters.map(escapeHTML).join(" · ")}</div>
    <div class="analytics-tabs" role="tablist">${tabs.map(([value, label]) => `<button type="button" role="tab" data-analytics-tab="${value}" aria-selected="${activeAnalyticsTab === value}">${label}</button>`).join("")}</div>
    <div class="analytics-tab-panel" role="tabpanel">${renderAnalyticsTab(summary)}</div>`;
}

function renderAnalyticsTab(summary) {
  if (activeAnalyticsTab === "overview") {
    const maxDaily = Math.max(1, ...(summary.daily || []).map((item) => Number(item.uniqueVisitors || 0)));
    return `<div class="analytics-kpis">
      ${renderKpi("访客", summary.uniqueVisitors, `${Number(summary.newVisitors || 0)} 新访客`)}
      ${renderKpi("回访访客", summary.returningVisitors, `${formatPercent(summary.uniqueVisitors ? summary.returningVisitors * 100 / summary.uniqueVisitors : 0)} 占比`)}
      ${renderKpi("访问次数", summary.uniqueSessions, `${Number(summary.pagesPerSession || 0).toFixed(2)} 页/次`)}
      ${renderKpi("页面浏览", summary.pageViews, `${Number(summary.totalEvents || 0)} 个事件`)}
      ${renderKpi("转化访客", summary.conversionVisitors, `${formatPercent(summary.conversionRate)} 转化率`, true)}
      </div><section class="analytics-card analytics-daily-chart analytics-overview-chart"><h4>每日趋势</h4>${(summary.daily || []).map((item) => `<div class="analytics-day"><span>${escapeHTML(item.date)}</span><div><i style="width:${Math.max(3, Number(item.uniqueVisitors || 0) * 100 / maxDaily)}%"></i></div><strong>${Number(item.uniqueVisitors || 0)} 人</strong><small>${Number(item.pageViews || 0)} 浏览 · ${Number(item.conversions || 0)} 转化</small></div>`).join("") || "<p>没有每日数据。</p>"}</section>`;
  }
  if (activeAnalyticsTab === "acquisition") {
    return `<div class="analytics-grid analytics-grid-three">${renderDimensionCard("流量来源", summary.sources, "source")}${renderDimensionCard("UTM Campaign", summary.campaigns)}${renderDimensionCard("设备", summary.devices, "device")}${renderDimensionCard("浏览器", summary.browsers)}${renderDimensionCard("操作系统", summary.operatingSystems)}${renderDimensionCard("访问时区", summary.timeZones)}${renderDimensionCard("浏览器语言", summary.languages)}</div>`;
  }
  if (activeAnalyticsTab === "content") {
    return `<div class="analytics-grid analytics-grid-three">${renderPathCard("落地页", summary.landingPages, "次访问")}${renderPathCard("热门页面", summary.topPaths, "次浏览")}</div>`;
  }
  if (activeAnalyticsTab === "audience") return renderAnalyticsReportPanel();
  return `<div class="analytics-funnels">${(summary.funnels || []).map(renderFunnel).join("") || "<p>暂时没有漏斗数据。</p>"}</div><section class="analytics-card analytics-event-card"><h4>事件分布</h4><div class="analytics-list">${(summary.events || []).map((item) => `<div><span>${escapeHTML(EVENT_LABELS[item.eventName] || item.eventName)}</span><strong>${Number(item.count || 0)}</strong></div>`).join("") || "<p>没有事件。</p>"}</div></section>`;
}

function renderAnalyticsReportPanel() {
  return `<form class="analytics-report-filter" data-analytics-report-filter>
    <label><span>报表</span><select name="type"><option value="sessions" ${analyticsReportType === "sessions" ? "selected" : ""}>Session 明细</option><option value="visitors" ${analyticsReportType === "visitors" ? "selected" : ""}>访客明细</option></select></label>
    <label class="analytics-report-search"><span>搜索</span><input type="search" name="search" maxlength="120" value="${escapeHTML(analyticsReportSearch)}" placeholder="访客编号、Session、页面、来源或 Campaign" /></label>
    <label><span>每页</span><select name="pageSize">${[10, 25, 50].map((size) => `<option value="${size}" ${analyticsReportPageSize === size ? "selected" : ""}>${size} 条</option>`).join("")}</select></label>
    <button type="submit">查询</button>
    </form><div data-analytics-report-results>${analyticsReport ? renderAnalyticsReportResults(analyticsReport) : "<div class=\"analytics-report-loading\">正在读取报表...</div>"}</div>`;
}

async function loadAnalyticsReport() {
  const results = analyticsPanel.querySelector("[data-analytics-report-results]");
  if (results) results.innerHTML = "<div class=\"analytics-report-loading\">正在读取报表...</div>";
  try {
    analyticsReport = await window.rewardSchoolApi.getAdminAnalyticsReport({
      token: getToken(), start: analyticsFilter.elements.start.value, end: analyticsFilter.elements.end.value,
      event: analyticsFilter.elements.event.value, source: analyticsFilter.elements.source.value,
      device: analyticsFilter.elements.device.value, page: analyticsFilter.elements.page.value.trim(),
      type: analyticsReportType, search: analyticsReportSearch, pageNumber: analyticsReportPage, pageSize: analyticsReportPageSize,
    });
    const target = analyticsPanel.querySelector("[data-analytics-report-results]");
    if (target) target.innerHTML = renderAnalyticsReportResults(analyticsReport);
  } catch (error) {
    const target = analyticsPanel.querySelector("[data-analytics-report-results]");
    if (target) target.innerHTML = `<span class="is-error">${escapeHTML(error.message || "报表读取失败。")}</span>`;
  }
}

function renderAnalyticsReportResults(report) {
  const rows = analyticsReportType === "visitors" ? renderVisitorRows(report.items || []) : renderSessionRows(report.items || []);
  const headers = analyticsReportType === "visitors"
    ? "<th>访客</th><th>最近访问</th><th>来源 / 设备</th><th>Session</th><th>浏览 / 事件</th><th>落地页</th><th>状态</th>"
    : "<th>Session</th><th>时间</th><th>来源 / 设备</th><th>落地页</th><th>浏览 / 事件</th><th>时长</th><th>状态</th>";
  const currentPage = Number(report.page || 1);
  const totalPages = Number(report.totalPages || 1);
  return `<div class="analytics-report-meta">共 ${Number(report.totalItems || 0)} 条 · 第 ${currentPage} / ${totalPages} 页</div>
    <div class="analytics-report-table-wrap"><table class="analytics-report-table"><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="7">没有符合条件的数据。</td></tr>`}</tbody></table></div>
    <div class="analytics-pagination"><button type="button" data-report-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>上一页</button><span>${currentPage} / ${totalPages}</span><button type="button" data-report-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>下一页</button></div>`;
}

function renderSessionRows(items) {
  return items.map((item) => {
    const duration = Math.max(0, (new Date(item.endedAt) - new Date(item.startedAt)) / 1000);
    return `<tr><td><code>${escapeHTML(String(item.sessionId || "").slice(0, 12))}</code></td><td>${escapeHTML(formatDateTime(item.startedAt))}</td><td>${escapeHTML(SOURCE_LABELS[item.source] || item.source || "direct")}<small>${escapeHTML(DEVICE_LABELS[item.device] || item.device || "unknown")}</small></td><td class="analytics-table-path">${escapeHTML(item.landingPage || "/")}</td><td>${Number(item.pageViews || 0)} / ${Number(item.events || 0)}</td><td>${formatDuration(duration)}</td><td>${item.converted ? "<b class=\"analytics-converted\">已转化</b>" : "未转化"}</td></tr>`;
  }).join("");
}

function renderVisitorRows(items) {
  return items.map((item) => `<tr><td><code>${escapeHTML(String(item.visitorId || "").slice(0, 12))}</code></td><td>${escapeHTML(formatDateTime(item.lastSeenAt))}<small>首次 ${escapeHTML(formatDateTime(item.firstSeenAt))}</small></td><td>${escapeHTML(SOURCE_LABELS[item.source] || item.source || "direct")}<small>${escapeHTML(DEVICE_LABELS[item.device] || item.device || "unknown")}</small></td><td>${Number(item.sessions || 0)}</td><td>${Number(item.pageViews || 0)} / ${Number(item.events || 0)}</td><td class="analytics-table-path">${escapeHTML(item.landingPage || "/")}</td><td>${item.converted ? "<b class=\"analytics-converted\">已转化</b>" : "未转化"}</td></tr>`).join("");
}

function renderKpi(label, value, note, highlighted = false) {
  return `<article class="analytics-kpi ${highlighted ? "is-highlighted" : ""}"><span>${escapeHTML(label)}</span><strong>${Number(value || 0)}</strong><small>${escapeHTML(note || "")}</small></article>`;
}

function renderFunnel(funnel) {
  return `<section class="analytics-funnel"><h4>${escapeHTML(FUNNEL_LABELS[funnel.name] || funnel.name)}</h4>${(funnel.steps || []).map((step, index) => `<div class="analytics-funnel-step"><span>${escapeHTML(EVENT_LABELS[step.eventName] || step.eventName)}</span><strong>${Number(step.visitors || 0)} 人</strong>${index ? `<small>${formatPercent(step.rateFromPrevious)}</small>` : "<small>基准</small>"}</div>`).join("")}</section>`;
}

function renderDimensionCard(title, items, kind = "") {
  return `<section class="analytics-card"><h4>${escapeHTML(title)}</h4><div class="analytics-list">${(items || []).map((item) => { const rawName = String(item.name || "unknown"); const label = kind === "source" ? SOURCE_LABELS[rawName] || rawName : kind === "device" ? DEVICE_LABELS[rawName] || rawName : rawName; return `<div><span>${escapeHTML(label)}${item.detail ? `<small>${escapeHTML(item.detail)}</small>` : ""}</span><strong>${Number(item.visitors || 0)} 人<small>${Number(item.sessions || 0)} 次</small></strong></div>`; }).join("") || "<p>暂无数据，新维度会从本次发布后开始累积。</p>"}</div></section>`;
}

function renderPathCard(title, items, suffix) {
  return `<section class="analytics-card"><h4>${escapeHTML(title)}</h4><div class="analytics-list">${(items || []).map((item) => `<div><span class="analytics-path">${escapeHTML(item.pagePath)}</span><strong>${Number(item.count || 0)}<small>${escapeHTML(suffix)}</small></strong></div>`).join("") || "<p>暂无数据。</p>"}</div></section>`;
}

function renderJourney(item) {
  const paths = [...new Set((item.paths || []).filter(Boolean))].slice(0, 8);
  const visitor = String(item.visitorId || "").slice(0, 8) || "unknown";
  const durationSeconds = Math.max(0, (new Date(item.endedAt) - new Date(item.startedAt)) / 1000);
  return `<article class="analytics-journey ${item.converted ? "is-converted" : ""}"><div class="analytics-journey-head"><div><strong>${escapeHTML(SOURCE_LABELS[item.source] || item.source || "direct")}</strong><span>${escapeHTML(DEVICE_LABELS[item.device] || item.device || "unknown")} · ${escapeHTML(formatDateTime(item.startedAt))}</span></div><span class="analytics-visitor-id">访客 ${escapeHTML(visitor)}</span></div><div class="analytics-journey-meta"><span>落地：${escapeHTML(item.landingPage || "/")}</span><span>${Number(item.pageViews || 0)} 页 · ${Number(item.events || 0)} 事件 · ${formatDuration(durationSeconds)}</span>${item.converted ? "<b>已转化</b>" : ""}</div><div class="analytics-path-sequence">${paths.map((path, index) => `${index ? "<i>→</i>" : ""}<span>${escapeHTML(path)}</span>`).join("") || "<span>没有页面路径</span>"}</div></article>`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Australia/Sydney" }).format(date);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
}

function normalizeEnum(value) {
  const compact = String(value || "").replace(/[_-]/g, "").toLowerCase();
  return [...Object.keys(ROLE_LABELS), ...Object.keys(PERMISSION_LABELS)].find((item) => item.toLowerCase() === compact) || String(value || "");
}

function toDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
