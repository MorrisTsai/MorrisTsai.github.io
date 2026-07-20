const authKey = "rewardSchoolAeasAuthV1";
const gate = document.querySelector("[data-assessment-gate]");
const consolePanel = document.querySelector("[data-assessment-console]");
const listPanel = document.querySelector("[data-assessment-list]");
const filter = document.querySelector("[data-assessment-filter]");
let assessments = [];

void init();

function token() { try { return JSON.parse(localStorage.getItem(authKey) || "null")?.token || ""; } catch { return ""; } }

async function init() {
  if (!token()) return deny("请先登录Advisor账号。");
  try {
    const user = await window.rewardSchoolApi.getCurrentUser({ token: token() });
    const advisor = Boolean(user?.admin || (user?.permissions || []).some((item) => String(item).replace(/[_-]/g, "").toLowerCase() === "schoolinformation"));
    if (!advisor) return deny("此页面只对Advisor或Admin开放。");
    gate.hidden = true; consolePanel.hidden = false;
    filter.addEventListener("input", render);
    document.querySelector("[data-refresh-assessments]").addEventListener("click", load);
    await load();
  } catch (error) { deny(error.message || "权限验证失败。"); }
}

async function load() {
  listPanel.innerHTML = "<span>正在读取...</span>";
  try { assessments = (await window.rewardSchoolApi.getAdvisorAssessments({ token: token() })).assessments || []; render(); }
  catch (error) { listPanel.innerHTML = `<span class="is-error">${escapeHTML(error.message || "读取失败。")}</span>`; }
}

function render() {
  const query = filter.value.trim().toLowerCase();
  const items = assessments.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  listPanel.innerHTML = items.length ? items.map((item) => `<a href="student-assessment.html?report=${encodeURIComponent(item.id)}"><div><strong>${escapeHTML(item.studentName)}</strong><span>${item.targetStartYear} · Year ${item.targetYearLevel}</span></div><b class="pipeline-status status-${escapeHTML(item.advisorStatus)}">${escapeHTML(label(item.advisorStatus))}</b><small>${formatDate(item.updatedAt)}</small></a>`).join("") : "<p>没有符合条件的评估。</p>";
}

function deny(message) { consolePanel.hidden = true; gate.hidden = false; gate.innerHTML = `<p class="eyebrow">Advisor Access</p><h1>无法进入工作台</h1><p>${escapeHTML(message)}</p><a class="admin-primary-link" href="profile.html">前往登录</a>`; }
function label(value) { return ({ pending: "待审核", reviewed: "已审核", approved: "批准发送", "needs-information": "需要补资料" })[value] || value; }
function formatDate(value) { const date = new Date(value); return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney" }).format(date); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
