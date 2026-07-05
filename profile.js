const PROFILE_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";
const PROFILE_PRACTICE_KIND = "aeas-mock";

let profileSession = loadProfileSession();

const statusCard = document.querySelector("[data-profile-status]");
const authPanel = document.querySelector("[data-auth-panel]");
const accountPanel = document.querySelector("[data-account-panel]");
const passwordPanel = document.querySelector("[data-password-panel]");
const historyPanel = document.querySelector("[data-history-panel]");
const advisorPanel = document.querySelector("[data-advisor-panel]");
const comingPanel = document.querySelector("[data-coming-panel]");
const profileForm = document.querySelector("[data-profile-form]");
const passwordForm = document.querySelector("[data-password-form]");
const historySummary = document.querySelector("[data-history-summary]");
const historyList = document.querySelector("[data-history-list]");
const historyDetail = document.querySelector("[data-history-detail]");

let latestPracticeHistory = null;

initProfilePage();

function loadProfileSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_AUTH_STORAGE_KEY) || "null");
    if (saved?.token) return { token: saved.token, user: null, status: "loading" };
  } catch (error) {
    // Ignore corrupted login state.
  }
  return null;
}

function saveProfileSession(session) {
  profileSession = session?.token
    ? { ...session, status: session.status || (session.user?.id ? "ready" : "loading") }
    : null;

  if (profileSession?.token) {
    localStorage.setItem(PROFILE_AUTH_STORAGE_KEY, JSON.stringify({ token: profileSession.token }));
  } else {
    localStorage.removeItem(PROFILE_AUTH_STORAGE_KEY);
  }
}

function getToken() {
  return profileSession?.token || "";
}

async function initProfilePage() {
  renderProfileShell();
  bindProfileEvents();

  if (getToken()) {
    await hydrateCurrentUser();
  } else {
    renderSignedOut();
  }
}

function bindProfileEvents() {
  authPanel?.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-profile-auth-form]");
    if (!form) return;
    event.preventDefault();
    void handleAuthSubmit(form);
  });

  authPanel?.addEventListener("click", (event) => {
    const switchButton = event.target.closest("[data-auth-mode]");
    if (switchButton) {
      renderAuthPanel(switchButton.dataset.authMode || "login");
      return;
    }

    const resetButton = event.target.closest("[data-request-reset]");
    if (resetButton) {
      void handlePasswordResetRequest(resetButton);
    }
  });

  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleProfileSubmit();
  });

  passwordForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void handlePasswordSubmit();
  });

  document.querySelector("[data-open-password-dialog]")?.addEventListener("click", () => {
    openPasswordDialog();
  });

  document.querySelector("[data-refresh-history]")?.addEventListener("click", () => {
    void loadPracticeHistory();
  });

  historyList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-detail]");
    if (!button) return;
    openHistoryDetail(button.dataset.historyDetail || "");
  });

  historyDetail?.addEventListener("click", (event) => {
    const backButton = event.target.closest("[data-history-back]");
    if (backButton) {
      showHistoryList();
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-password-dialog-form]");
    if (!form) return;
    event.preventDefault();
    void handlePasswordSubmit(form);
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-password-dialog]");
    if (closeButton || event.target.matches?.("[data-password-dialog-overlay]")) {
      closePasswordDialog();
    }
  });
}

function renderProfileShell() {
  renderStatus("Account", "正在检查登录状态...", "请稍候");
  renderAuthPanel("login");
}

function renderSignedOut(message = "") {
  saveProfileSession(null);
  renderStatus("Account", "未登录", "登录后可以管理资料并查看云端练习记录。");
  renderAuthPanel("login", message);
  setPanelsVisible(false);
}

function renderSignedIn(user) {
  renderStatus("Account", user.displayName || user.email, `${user.email} · ${user.emailVerified || user.superUser ? "邮箱已验证" : "邮箱未验证"}`);
  setPanelsVisible(true);
  authPanel.hidden = true;
  fillAccountForm(user);
  renderAdvisorPanel(user);
  void loadPracticeHistory();
}

function setPanelsVisible(isVisible) {
  [accountPanel, historyPanel, comingPanel].forEach((panel) => {
    if (panel) panel.hidden = !isVisible;
  });
  if (advisorPanel) advisorPanel.hidden = true;
  if (passwordPanel) passwordPanel.hidden = true;
  if (authPanel) authPanel.hidden = isVisible;
}

function renderAdvisorPanel(user) {
  if (!advisorPanel) return;
  advisorPanel.hidden = !user?.advisor;
}

function renderStatus(label, title, detail) {
  if (!statusCard) return;
  statusCard.innerHTML = `
    <span>${escapeHTML(label)}</span>
    <strong>${escapeHTML(title)}</strong>
    <small>${escapeHTML(detail)}</small>
  `;
}

function renderAuthPanel(mode = "login", message = "") {
  if (!authPanel) return;
  const isRegister = mode === "register";
  authPanel.hidden = false;
  authPanel.innerHTML = `
    <div class="profile-panel-heading">
      <div>
        <p class="eyebrow">${isRegister ? "Create Account" : "Sign In"}</p>
        <h2>${isRegister ? "注册账号" : "登录账号"}</h2>
      </div>
    </div>
    <form class="profile-form" data-profile-auth-form data-auth-action="${isRegister ? "register" : "login"}">
      ${isRegister ? `
        <label>
          <span>用户名</span>
          <input name="displayName" type="text" minlength="2" maxlength="80" autocomplete="name" required />
        </label>
      ` : ""}
      <label>
        <span>邮箱</span>
        <input name="email" type="email" autocomplete="email" required />
      </label>
      <label>
        <span>密码</span>
        <input name="password" type="password" minlength="8" autocomplete="${isRegister ? "new-password" : "current-password"}" required />
      </label>
      <button class="button primary" type="submit">${isRegister ? "注册并登录" : "登录"}</button>
      <div class="profile-auth-links">
        <button type="button" data-auth-mode="${isRegister ? "login" : "register"}">${isRegister ? "已有账号，去登录" : "没有账号，去注册"}</button>
        ${isRegister ? "" : `<button type="button" data-request-reset>忘记密码？发送重设邮件</button>`}
      </div>
      <p class="profile-form-note ${message ? "is-error" : ""}" data-auth-message>${escapeHTML(message)}</p>
    </form>
  `;
}

function fillAccountForm(user) {
  if (!profileForm) return;
  profileForm.elements.email.value = user.email || "";
  profileForm.elements.displayName.value = user.displayName || "";
}

async function hydrateCurrentUser() {
  try {
    const user = await window.rewardSchoolApi.getCurrentUser({ token: getToken() });
    saveProfileSession({ token: getToken(), user, status: "ready" });
    renderSignedIn(user);
  } catch (error) {
    renderSignedOut(error.status === 401 ? "登录已过期，请重新登录。" : error.message);
  }
}

async function handleAuthSubmit(form) {
  const message = form.querySelector("[data-auth-message]");
  const submitButton = form.querySelector('button[type="submit"]');
  const action = form.dataset.authAction || "login";
  setMessage(message, "正在处理...");
  setBusy(submitButton, true);

  try {
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const session = action === "register"
      ? await window.rewardSchoolApi.register({
          email,
          password,
          displayName: form.elements.displayName.value.trim(),
        })
      : await window.rewardSchoolApi.login({ email, password });

    saveProfileSession({ token: session.token, user: session.user, status: "ready" });
    renderSignedIn(session.user);
  } catch (error) {
    setMessage(message, error.message || "操作失败，请稍后再试。", true);
  } finally {
    setBusy(submitButton, false);
  }
}

async function handlePasswordResetRequest(button) {
  const form = button.closest("[data-profile-auth-form]");
  const message = form?.querySelector("[data-auth-message]");
  const email = form?.elements.email.value.trim();
  if (!email) {
    setMessage(message, "请先输入邮箱。", true);
    return;
  }

  setBusy(button, true);
  setMessage(message, "正在发送重设邮件...");
  try {
    await window.rewardSchoolApi.requestPasswordReset({ email });
    setMessage(message, "如果该邮箱已注册，重设密码邮件会发送到邮箱。");
  } catch (error) {
    setMessage(message, error.message || "发送失败，请稍后再试。", true);
  } finally {
    setBusy(button, false);
  }
}

async function handleProfileSubmit() {
  const message = document.querySelector("[data-profile-message]");
  const submitButton = profileForm.querySelector('button[type="submit"]');
  setMessage(message, "正在保存...");
  setBusy(submitButton, true);

  try {
    const user = await window.rewardSchoolApi.updateProfile({
      token: getToken(),
      displayName: profileForm.elements.displayName.value.trim(),
    });
    saveProfileSession({ token: getToken(), user, status: "ready" });
    fillAccountForm(user);
    renderStatus("Account", user.displayName || user.email, `${user.email} · ${user.emailVerified || user.superUser ? "邮箱已验证" : "邮箱未验证"}`);
    setMessage(message, "用户名已更新。");
  } catch (error) {
    setMessage(message, error.message || "保存失败，请稍后再试。", true);
  } finally {
    setBusy(submitButton, false);
  }
}

function openPasswordDialog() {
  document.querySelector("[data-password-dialog-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="profile-dialog-overlay" data-password-dialog-overlay>
      <form class="profile-dialog" data-password-dialog-form role="dialog" aria-modal="true" aria-label="重设密码">
        <div class="profile-dialog-header">
          <div>
            <p class="eyebrow">Security</p>
            <h3>重设密码</h3>
          </div>
          <button class="profile-dialog-close" type="button" data-close-password-dialog>关闭</button>
        </div>
        <div class="profile-form profile-dialog-body">
          <label>
            <span>当前密码</span>
            <input name="currentPassword" type="password" autocomplete="current-password" required />
          </label>
          <label>
            <span>新密码</span>
            <input name="newPassword" type="password" minlength="8" autocomplete="new-password" required />
          </label>
          <label>
            <span>确认新密码</span>
            <input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required />
          </label>
          <button class="button primary" type="submit">更新密码</button>
          <p class="profile-form-note" data-password-message></p>
        </div>
      </form>
    </div>
  `);
}

function closePasswordDialog() {
  document.querySelector("[data-password-dialog-overlay]")?.remove();
}

async function handlePasswordSubmit(form = passwordForm) {
  const message = form?.querySelector("[data-password-message]");
  const submitButton = form?.querySelector('button[type="submit"]');
  const currentPassword = form?.elements.currentPassword.value;
  const newPassword = form?.elements.newPassword.value;
  const confirmPassword = form?.elements.confirmPassword.value;

  if (newPassword !== confirmPassword) {
    setMessage(message, "两次输入的新密码不一致。", true);
    return;
  }

  setMessage(message, "正在更新密码...");
  setBusy(submitButton, true);
  try {
    await window.rewardSchoolApi.changePassword({
      token: getToken(),
      currentPassword,
      newPassword,
    });
    form.reset();
    setMessage(message, "密码已更新，当前设备保持登录。");
    window.setTimeout(closePasswordDialog, 700);
    setMessage(message, "密码已更新，当前设备保持登录。");
  } catch (error) {
    setMessage(message, error.message || "密码更新失败，请检查当前密码。", true);
  } finally {
    setBusy(submitButton, false);
  }
}

async function loadPracticeHistory() {
  if (!historySummary || !historyList) return;
  historySummary.innerHTML = `<span>正在读取记录...</span>`;
  historyList.innerHTML = "";

  try {
    const history = await window.rewardSchoolApi.getPracticeHistory({
      token: getToken(),
      kind: PROFILE_PRACTICE_KIND,
      limit: 20,
    });
    renderPracticeHistory(history);
  } catch (error) {
    historySummary.innerHTML = `<span class="is-error">${escapeHTML(error.message || "读取记录失败。")}</span>`;
  }
}

function renderPracticeHistory(history) {
  const progressItems = Array.isArray(history?.progress) ? history.progress : [];
  const sessions = Array.isArray(history?.attemptSessions) ? history.attemptSessions : [];
  const examReports = progressItems.flatMap((item) => {
    const reports = Array.isArray(item?.progress?.examReports) ? item.progress.examReports : [];
    return reports.map((report) => ({ ...report, progressUpdatedAt: item.updatedAt }));
  });

  const totalAttempts = sessions.reduce((sum, item) => sum + Number(item.attemptCount || 0), 0);
  historySummary.innerHTML = `
    <div><span>模考成绩</span><strong>${examReports.length}</strong></div>
    <div><span>练习 Session</span><strong>${sessions.length}</strong></div>
    <div><span>提交题数</span><strong>${totalAttempts}</strong></div>
  `;

  const reportMarkup = examReports.length
    ? examReports.map(renderExamReportCard).join("")
    : `<div class="profile-empty-state">还没有提交过完整模拟考试。</div>`;

  const sessionMarkup = sessions.length
    ? sessions.map(renderAttemptSessionCard).join("")
    : `<div class="profile-empty-state">还没有云端练习记录。</div>`;

  historyList.innerHTML = `
    <div class="profile-history-group">
      <h3>模考成绩</h3>
      ${reportMarkup}
    </div>
    <div class="profile-history-group">
      <h3>练习记录</h3>
      ${sessionMarkup}
    </div>
  `;
}

function renderExamReportCard(report) {
  const stats = report.stats || {};
  const scoreText = `${Number(stats.correct || 0)}/${Number(stats.total || 0)}`;
  return `
    <article class="profile-history-card">
      <div>
        <span>${escapeHTML(report.kind === "random" ? "模拟考" : "课前测试")}</span>
        <strong>${escapeHTML(report.title || "AEAS 模拟考试")}</strong>
        <small>提交：${escapeHTML(formatDate(report.submittedAt || report.progressUpdatedAt))}</small>
      </div>
      <div class="profile-score-pill">
        <span>正确</span>
        <strong>${escapeHTML(scoreText)}</strong>
      </div>
    </article>
  `;
}

function renderAttemptSessionCard(session) {
  const subjects = Array.isArray(session.subjects) ? session.subjects : [];
  const subjectText = subjects.slice(0, 4).map((item) => getSubjectLabel(item.subjectId, item.typeId)).join(" · ");
  return `
    <article class="profile-history-card">
      <div>
        <span>${escapeHTML(formatDate(session.lastAttemptAt))}</span>
        <strong>${escapeHTML(subjectText || "AEAS 练习")}</strong>
        <small>开始：${escapeHTML(formatDate(session.startedAt))} · 已批改 ${Number(session.gradedCount || 0)} 题</small>
      </div>
      <div class="profile-score-pill">
        <span>提交</span>
        <strong>${Number(session.attemptCount || 0)}</strong>
      </div>
    </article>
  `;
}

function getSubjectLabel(subjectId, typeId) {
  const subjectMap = {
    english: "英语",
    mathematics: "数学",
    nonverbal: "非语言",
    "pre-class-mock": "课前测试",
    "random-mock": "模拟考",
  };
  const typeMap = {
    reading: "阅读",
    vocabulary: "词汇",
    writing: "写作",
    speaking: "口语",
    listening: "听力",
    mathematics: "数学",
    nonverbal: "非语言",
  };
  return `${subjectMap[subjectId] || subjectId}${typeId ? `/${typeMap[typeId] || typeId}` : ""}`;
}

function setMessage(node, text, isError = false) {
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("is-error", Boolean(isError));
}

function setBusy(button, isBusy) {
  if (!button) return;
  button.disabled = Boolean(isBusy);
}

function formatDate(value) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getHistoryCollections(history = latestPracticeHistory) {
  const progressItems = Array.isArray(history?.progress) ? history.progress : [];
  const sessions = Array.isArray(history?.attemptSessions) ? history.attemptSessions : [];
  const reports = progressItems.flatMap((item) => {
    const examReports = Array.isArray(item?.progress?.examReports) ? item.progress.examReports : [];
    return examReports.map((report) => ({ ...report, progressUpdatedAt: item.updatedAt }));
  });
  return { reports, sessions };
}

function renderPracticeHistory(history) {
  latestPracticeHistory = history;
  const { reports, sessions } = getHistoryCollections(history);
  const totalAttempts = sessions.reduce((sum, item) => sum + Number(item.attemptCount || 0), 0);

  historySummary.innerHTML = `
    <div><span>模考成绩</span><strong>${reports.length}</strong></div>
    <div><span>练习 Session</span><strong>${sessions.length}</strong></div>
    <div><span>提交题数</span><strong>${totalAttempts}</strong></div>
  `;

  const reportMarkup = reports.length
    ? reports.map((report, index) => renderExamReportCard(report, index)).join("")
    : `<div class="profile-empty-state">还没有提交过完整模拟考试。</div>`;

  const sessionMarkup = sessions.length
    ? sessions.map((session, index) => renderAttemptSessionCard(session, index)).join("")
    : `<div class="profile-empty-state">还没有云端练习记录。</div>`;

  historyList.innerHTML = `
    <div class="profile-history-group">
      <h3>模考成绩</h3>
      ${reportMarkup}
    </div>
    <div class="profile-history-group">
      <h3>练习记录</h3>
      ${sessionMarkup}
    </div>
  `;
  showHistoryList();
}

function renderExamReportCard(report, index) {
  const stats = report.stats || {};
  return `
    <button class="profile-history-card" type="button" data-history-detail="report:${index}">
      <div>
        <span>${escapeHTML(report.kind === "random" ? "模拟考" : "课前测试")}</span>
        <strong>${escapeHTML(report.title || "AEAS 模拟考试")}</strong>
        <small>提交：${escapeHTML(formatDate(report.submittedAt || report.progressUpdatedAt))} · 完成 ${Number(stats.attempted || 0)}/${Number(stats.total || 0)}</small>
      </div>
      <div class="profile-score-pill">
        <span>正确</span>
        <strong>${Number(stats.correct || 0)}/${Number(stats.total || 0)}</strong>
      </div>
    </button>
  `;
}

function renderAttemptSessionCard(session, index) {
  const subjects = Array.isArray(session.subjects) ? session.subjects : [];
  const subjectText = subjects.slice(0, 4).map((item) => getSubjectLabel(item.subjectId, item.typeId)).join(" · ");
  const scoreText = Number(session.gradedCount || 0) > 0
    ? `${Number(session.correctCount || 0)}/${Number(session.gradedCount || 0)}`
    : "--";
  return `
    <button class="profile-history-card" type="button" data-history-detail="session:${index}">
      <div>
        <span>${escapeHTML(formatDate(session.lastAttemptAt))}</span>
        <strong>${escapeHTML(subjectText || "AEAS 练习")}</strong>
        <small>开始：${escapeHTML(formatDate(session.startedAt))} · 提交 ${Number(session.attemptCount || 0)} 题 · 已批改 ${Number(session.gradedCount || 0)} 题</small>
      </div>
      <div class="profile-score-pill">
        <span>成绩</span>
        <strong>${escapeHTML(scoreText)}</strong>
      </div>
    </button>
  `;
}

function openHistoryDetail(detailKey) {
  const [kind, rawIndex] = String(detailKey || "").split(":");
  const index = Number(rawIndex);
  const { reports, sessions } = getHistoryCollections();
  const markup = kind === "report"
    ? renderReportDetail(reports[index])
    : renderSessionDetail(sessions[index]);
  if (!markup || !historyDetail || !historyList) return;

  historyList.hidden = true;
  historySummary.hidden = true;
  historyDetail.hidden = false;
  historyDetail.innerHTML = markup;
  historyPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showHistoryList() {
  if (historyList) historyList.hidden = false;
  if (historySummary) historySummary.hidden = false;
  if (historyDetail) {
    historyDetail.hidden = true;
    historyDetail.innerHTML = "";
  }
}

function renderReportDetail(report) {
  if (!report) return "";
  const stats = report.stats || {};
  const typeRows = Array.isArray(report.typeStats) && report.typeStats.length
    ? report.typeStats.map((item) => `
        <tr>
          <td>${escapeHTML(item.title || getSubjectLabel(item.subjectId, item.typeId))}</td>
          <td>${Number(item.attempted || 0)}/${Number(item.total || 0)}</td>
          <td>${Number(item.graded || 0)}/${Number(item.total || 0)}</td>
          <td>${Number(item.correct || 0)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4">这份成绩单没有小节明细。</td></tr>`;

  return `
    <div class="profile-detail-header">
      <button class="profile-secondary-button" type="button" data-history-back>← 返回记录</button>
      <div>
        <p class="eyebrow">Exam Report</p>
        <h3>${escapeHTML(report.title || "AEAS 模拟考试")}</h3>
        <p>提交：${escapeHTML(formatDate(report.submittedAt || report.progressUpdatedAt))}</p>
      </div>
    </div>
    <div class="profile-history-summary detail">
      <div><span>完成</span><strong>${Number(stats.attempted || 0)}/${Number(stats.total || 0)}</strong></div>
      <div><span>已批改</span><strong>${Number(stats.graded || 0)}</strong></div>
      <div><span>正确</span><strong>${Number(stats.correct || 0)}</strong></div>
    </div>
    <div class="profile-table-wrap">
      <table class="profile-detail-table">
        <thead><tr><th>小节</th><th>完成</th><th>批改</th><th>正确</th></tr></thead>
        <tbody>${typeRows}</tbody>
      </table>
    </div>
  `;
}

function renderSessionDetail(session) {
  if (!session) return "";
  const subjects = Array.isArray(session.subjects) ? session.subjects : [];
  const rows = subjects.length
    ? subjects.map((item) => `
        <tr>
          <td>${escapeHTML(getSubjectLabel(item.subjectId, item.typeId))}</td>
          <td>${Number(item.attemptCount || 0)}</td>
          <td>${Number(item.gradedCount || 0)}</td>
          <td>${Number(item.correctCount || 0)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4">这次练习没有题型明细。</td></tr>`;

  return `
    <div class="profile-detail-header">
      <button class="profile-secondary-button" type="button" data-history-back>← 返回记录</button>
      <div>
        <p class="eyebrow">Practice Session</p>
        <h3>${escapeHTML(formatDate(session.lastAttemptAt))}</h3>
        <p>开始：${escapeHTML(formatDate(session.startedAt))}</p>
      </div>
    </div>
    <div class="profile-history-summary detail">
      <div><span>提交</span><strong>${Number(session.attemptCount || 0)}</strong></div>
      <div><span>已批改</span><strong>${Number(session.gradedCount || 0)}</strong></div>
      <div><span>正确</span><strong>${Number(session.correctCount || 0)}</strong></div>
    </div>
    <div class="profile-table-wrap">
      <table class="profile-detail-table">
        <thead><tr><th>题型</th><th>提交</th><th>批改</th><th>正确</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
