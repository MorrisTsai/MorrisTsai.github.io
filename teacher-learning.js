const LEARNING_AUTH_KEY = "rewardSchoolAeasAuthV1";
const learningState = {
  questions: [],
  selected: new Map(),
  packs: [],
  students: [],
  assignments: [],
  reviewQueue: [],
};

const learningQuestionTypes = {
  english: [
    ["", "全部英语题型"], ["mock-reading", "阅读理解"], ["mock-vocabulary", "词汇运用"],
    ["mock-gap-filling", "词汇填空"], ["mock-listening", "听力理解"], ["mock-writing", "写作任务"], ["mock-speaking", "口语面试"],
  ],
  mathematics: [
    ["", "全部数学题型"], ["mock-number", "数字与运算"], ["mock-algebra", "代数推理"],
    ["mock-geometry", "几何与测量"], ["mock-word-problems", "英文文字题"], ["mock-data", "图表理解"], ["mock-logic", "数学逻辑"],
  ],
  nonverbal: [
    ["", "全部非语言题型"], ["mock-same-pairs", "相同图形"], ["mock-fractions", "图形分割"],
    ["mock-reasoning", "图形推理"], ["mock-odd-one-out", "找不同"], ["mock-sequence-input", "序列填空"],
    ["mock-series", "图形序列"], ["mock-analogies", "图形类比"], ["mock-shape-ops", "图形运算"],
    ["mock-table-fill", "表格填空"], ["mock-subtraction-fill", "减法填空"],
  ],
};

function learningSession() { try { return JSON.parse(localStorage.getItem(LEARNING_AUTH_KEY) || "null"); } catch { return null; } }
function learningToken() { return learningSession()?.token || ""; }
function canReviewLearning(user) { return user?.admin || (user?.permissions || []).some((p) => String(p).replace(/[_-]/g, "").toLowerCase() === "practicereview"); }

async function initTeacherLearning() {
  if (!learningToken()) return denyLearning("请先登录教师账号。");
  try {
    const user = await rewardSchoolLearningApi.getCurrentUser({ token: learningToken() });
    if (!canReviewLearning(user)) return denyLearning("当前账号没有学生练习批改权限。");
    document.querySelector("[data-gate]").hidden = true;
    document.querySelector("[data-app]").hidden = false;
    bindTeacherLearningEvents();
    await Promise.all([loadLearningDashboard(), loadLearningQuestions(), loadLearningPacks(), loadLearningAssignments(), loadReviewQueue()]);
  } catch (error) {
    denyLearning(error.message || "教师权限验证失败。");
  }
}

function denyLearning(message) {
  const gate = document.querySelector("[data-gate]");
  document.querySelector("[data-app]").hidden = true;
  gate.hidden = false;
  gate.innerHTML = `<p class="ls-eyebrow">Teacher Access</p><h1>无法进入教学工作台</h1><p>${escapeLearning(message)}</p><a class="ls-button" href="profile.html">前往登录</a>`;
}

function bindTeacherLearningEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => showLearningView(button.dataset.tab)));
  document.querySelectorAll("[data-jump]").forEach((button) => button.addEventListener("click", () => showLearningView(button.dataset.jump)));
  document.querySelector("[data-filter-form]").addEventListener("submit", (event) => { event.preventDefault(); loadLearningQuestions(new FormData(event.currentTarget)); });
  document.querySelector("[data-major-type]").addEventListener("change", updateLearningSubtypeOptions);
  document.querySelector("[data-question-list]").addEventListener("change", toggleLearningQuestion);
  document.querySelector("[data-selected-list]").addEventListener("click", removeSelectedLearningQuestion);
  document.querySelector("[data-pack-form]").addEventListener("submit", createLearningPack);
  document.querySelector("[data-pack-list]").addEventListener("click", selectPackForAssignment);
  document.querySelector("[data-assign-form]").addEventListener("submit", createLearningAssignment);
  document.querySelector("[data-assignment-student-filter]").addEventListener("change", (event) => loadLearningAssignments(event.target.value));
  document.querySelector("[data-student-cards]").addEventListener("click", selectInsightStudent);
  document.querySelector("[data-review-list]").addEventListener("submit", submitLearningFeedback);
  document.querySelector("[data-review-list]").addEventListener("click", playLearningAudio);
  updateLearningSubtypeOptions();
}

function updateLearningSubtypeOptions() {
  const majorType = document.querySelector("[data-major-type]").value;
  document.querySelector("[data-subtype]").innerHTML = (learningQuestionTypes[majorType] || []).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function showLearningView(name) {
  document.querySelectorAll("[data-view]").forEach((view) => { view.hidden = view.dataset.view !== name; });
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === name));
  if (name === "review") loadReviewQueue();
  if (name === "assignments") loadLearningAssignments(document.querySelector("[data-assignment-student-filter]").value);
}

async function loadLearningDashboard() {
  const payload = await rewardSchoolLearningApi.getTeacherDashboard({ token: learningToken() });
  learningState.students = payload.students || [];
  const summary = payload.summary || {};
  document.querySelector("[data-summary]").innerHTML = [
    ["待批改", summary.pendingReview || 0, "写作与口语"],
    ["已逾期", summary.overdue || 0, "尚未提交"],
    ["本周完成批改", summary.reviewedThisWeek || 0, "已发布反馈"],
  ].map(([label, value, note]) => `<div class="ls-stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("");
  renderLearningStudents();
  populateLearningStudentSelects();
}

function renderLearningStudents() {
  const container = document.querySelector("[data-student-cards]");
  container.innerHTML = learningState.students.length ? learningState.students.map((student) => `
    <button class="ls-list-item is-clickable" type="button" data-insight-student="${student.id}">
      <span><strong>${escapeLearning(student.displayName || student.email)}</strong><small>${escapeLearning(student.email)}</small><small>${student.assignmentCount || 0} 份作业 · ${student.pendingReviewCount || 0} 待批</small></span>
      ${student.overdueCount ? `<span class="ls-badge is-red">${student.overdueCount} 逾期</span>` : `<span class="ls-badge is-green">正常</span>`}
    </button>`).join("") : `<div class="ls-empty">还没有绑定学生。请先在旧练习记录页面按学生邮箱添加。</div>`;
}

function populateLearningStudentSelects() {
  const options = `<option value="">选择学生</option>${learningState.students.map((student) => `<option value="${student.id}">${escapeLearning(student.displayName || student.email)} · ${escapeLearning(student.email)}</option>`).join("")}`;
  document.querySelector("[data-assign-form] select[name=studentId]").innerHTML = options;
  document.querySelector("[data-assignment-student-filter]").innerHTML = options.replace("选择学生", "全部学生");
}

async function selectInsightStudent(event) {
  const button = event.target.closest("[data-insight-student]");
  if (!button) return;
  document.querySelectorAll("[data-insight-student]").forEach((item) => item.classList.toggle("is-active", item === button));
  const student = learningState.students.find((item) => item.id === button.dataset.insightStudent);
  document.querySelector("[data-insight-title]").textContent = student?.displayName || student?.email || "学习档案";
  const container = document.querySelector("[data-insights]");
  container.innerHTML = `<div class="ls-empty">正在汇总学习记录…</div>`;
  try {
    const payload = await rewardSchoolLearningApi.getStudentInsights({ token: learningToken(), studentId: button.dataset.insightStudent });
    const skills = payload.skills || [];
    const issues = payload.issueTags || [];
    container.innerHTML = `${skills.length ? `<div class="ls-insight-bars">${skills.map((skill) => {
      const accuracy = skill.accuracy == null ? 0 : Number(skill.accuracy);
      return `<div class="ls-insight-row"><strong>${labelLearningSkill(skill.skill)}</strong><div class="ls-track"><span style="width:${Math.max(0, Math.min(100, accuracy))}%"></span></div><span>${skill.accuracy == null ? "待批" : `${accuracy}%`}</span></div>`;
    }).join("")}</div>` : `<div class="ls-empty">学生提交作业后，这里会形成能力记录。</div>`}
      ${issues.length ? `<h3 style="margin:24px 0 10px">反复出现的问题</h3><div class="ls-actions">${issues.map((issue) => `<span class="ls-badge">${escapeLearning(issue.tag)} · ${issue.count}</span>`).join("")}</div>` : ""}`;
  } catch (error) { container.innerHTML = `<div class="ls-empty">${escapeLearning(error.message)}</div>`; }
}

async function loadLearningQuestions(formData) {
  const source = formData || new FormData(document.querySelector("[data-filter-form]"));
  const filters = Object.fromEntries(source.entries());
  const majorType = filters.majorType || "english";
  delete filters.majorType;
  if (majorType === "mathematics" || majorType === "nonverbal") filters.skill = majorType;
  const container = document.querySelector("[data-question-list]");
  container.innerHTML = `<div class="ls-empty">正在读取模拟考题库…</div>`;
  try {
    const payload = await rewardSchoolLearningApi.getQuestions({ token: learningToken(), filters });
    const questions = payload.questions || [];
    learningState.questions = majorType === "english"
      ? questions.filter((question) => !["mathematics", "nonverbal"].includes(question.skill))
      : questions;
    renderLearningQuestions();
  } catch (error) { container.innerHTML = `<div class="ls-empty">${escapeLearning(error.message)}</div>`; }
}

function renderLearningQuestions() {
  const container = document.querySelector("[data-question-list]");
  container.innerHTML = learningState.questions.length ? learningState.questions.map((question) => {
    const checked = learningState.selected.has(question.id) ? "checked" : "";
    const preview = question.content?.prompt || question.content?.stimulus || "";
    return `<label class="ls-question-card"><input type="checkbox" value="${question.id}" ${checked}/><div><h3>${escapeLearning(formatLearningQuestionTitle(question))}</h3><p>${escapeLearning(preview)}</p></div></label>`;
  }).join("") : `<div class="ls-empty">当前筛选条件下没有题目。</div>`;
}

function toggleLearningQuestion(event) {
  const checkbox = event.target.closest("input[type=checkbox]");
  if (!checkbox) return;
  const question = learningState.questions.find((item) => item.id === checkbox.value);
  if (!question) return;
  if (checkbox.checked) learningState.selected.set(question.id, question); else learningState.selected.delete(question.id);
  renderSelectedLearningQuestions();
}

function removeSelectedLearningQuestion(event) {
  const button = event.target.closest("[data-remove-question]");
  if (!button) return;
  learningState.selected.delete(button.dataset.removeQuestion);
  renderSelectedLearningQuestions();
  renderLearningQuestions();
}

function renderSelectedLearningQuestions() {
  const selected = [...learningState.selected.values()];
  document.querySelector("[data-selected-count]").textContent = String(selected.length);
  document.querySelector("[data-selected-minutes]").textContent = String(selected.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0));
  document.querySelector("[data-selected-list]").innerHTML = selected.length ? selected.map((question, index) => `<div>${index + 1}. ${escapeLearning(formatLearningQuestionTitle(question))}<button type="button" data-remove-question="${question.id}" aria-label="移除">×</button></div>`).join("") : `<div>还没有选择题目。</div>`;
}

async function createLearningPack(event) {
  event.preventDefault();
  const message = document.querySelector("[data-pack-message]");
  const data = new FormData(event.currentTarget);
  if (!learningState.selected.size) return setLearningMessage(message, "请先选择题目。", true);
  setLearningMessage(message, "正在保存题目组…");
  try {
    await rewardSchoolLearningApi.createPack({ token: learningToken(), title: data.get("title"), description: data.get("description"), questionIds: [...learningState.selected.keys()] });
    event.currentTarget.reset(); learningState.selected.clear(); renderSelectedLearningQuestions(); renderLearningQuestions();
    await loadLearningPacks(); setLearningMessage(message, "题目组已保存，可以发给学生。", false, true); showLearningToast("题目组已保存");
  } catch (error) { setLearningMessage(message, error.message, true); }
}

async function loadLearningPacks() {
  try {
    const payload = await rewardSchoolLearningApi.getPacks({ token: learningToken() });
    learningState.packs = payload.packs || [];
    document.querySelector("[data-pack-list]").innerHTML = learningState.packs.length ? learningState.packs.map((pack) => `
      <div class="ls-list-item"><span><strong>${escapeLearning(pack.title)}</strong><small>${escapeLearning(pack.description || "无说明")}</small><small>${pack.questionCount}题 · 约${pack.estimatedMinutes}分钟 · ${(pack.skills || []).map(labelLearningSkill).join(" / ")}</small></span><button class="ls-button is-secondary" type="button" data-assign-pack="${pack.id}">发给学生</button></div>`).join("") : `<div class="ls-empty">还没有题目组，请先从题库选题。</div>`;
  } catch (error) { document.querySelector("[data-pack-list]").innerHTML = `<div class="ls-empty">${escapeLearning(error.message)}</div>`; }
}

function selectPackForAssignment(event) {
  const button = event.target.closest("[data-assign-pack]"); if (!button) return;
  const pack = learningState.packs.find((item) => item.id === button.dataset.assignPack); if (!pack) return;
  const form = document.querySelector("[data-assign-form]");
  form.elements.packId.value = pack.id;
  form.querySelector("button[type=submit]").disabled = false;
  document.querySelector("[data-assign-pack-name]").textContent = `${pack.title} · ${pack.questionCount}题`;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function createLearningAssignment(event) {
  event.preventDefault();
  const form = event.currentTarget; const data = new FormData(form); const message = document.querySelector("[data-assign-message]");
  const due = data.get("dueAt");
  const payload = { studentId: data.get("studentId"), packId: data.get("packId"), title: data.get("title") || null, instructions: data.get("instructions") || null, dueAt: due ? new Date(due).toISOString() : null, allowRetry: data.get("allowRetry") === "on", releaseObjectiveResults: data.get("releaseObjectiveResults") === "on" };
  setLearningMessage(message, "正在发布作业…");
  try {
    await rewardSchoolLearningApi.createAssignment({ token: learningToken(), payload });
    const packId = form.elements.packId.value; form.reset(); form.elements.packId.value = packId; form.elements.allowRetry.checked = true; form.elements.releaseObjectiveResults.checked = true;
    await Promise.all([loadLearningDashboard(), loadLearningAssignments()]); setLearningMessage(message, "作业已发给学生。", false, true); showLearningToast("作业发布成功");
  } catch (error) { setLearningMessage(message, error.message, true); }
}

async function loadLearningAssignments(studentId = "") {
  const container = document.querySelector("[data-assignment-list]"); if (!container) return;
  container.innerHTML = `<div class="ls-empty">正在读取作业…</div>`;
  try {
    const payload = await rewardSchoolLearningApi.getTeacherAssignments({ token: learningToken(), studentId }); learningState.assignments = payload.assignments || [];
    container.innerHTML = learningState.assignments.length ? learningState.assignments.map((item) => `<a class="ls-list-item" href="teacher-assignment-review.html?id=${encodeURIComponent(item.id)}"><span><strong>${escapeLearning(item.title)}</strong><small>${escapeLearning(item.personName)} · ${item.completedCount}/${item.questionCount}题 · ${formatLearningDate(item.releasedAt)}</small></span><span class="ls-badge ${item.status === "reviewed" ? "is-green" : item.status === "submitted" ? "is-red" : ""}">${labelAssignmentStatus(item.status)}</span></a>`).join("") : `<div class="ls-empty">还没有符合条件的作业。</div>`;
  } catch (error) { container.innerHTML = `<div class="ls-empty">${escapeLearning(error.message)}</div>`; }
}

async function loadReviewQueue() {
  const container = document.querySelector("[data-review-list]");
  try {
    const payload = await rewardSchoolLearningApi.getReviewQueue({ token: learningToken() }); learningState.reviewQueue = payload.queue || [];
    document.querySelector("[data-review-count]").textContent = learningState.reviewQueue.length ? `(${learningState.reviewQueue.length})` : "";
    container.innerHTML = learningState.reviewQueue.length ? learningState.reviewQueue.map(renderLearningReviewCard).join("") : `<div class="ls-empty">目前没有待批改的写作或口语。</div>`;
  } catch (error) { container.innerHTML = `<div class="ls-empty">${escapeLearning(error.message)}</div>`; }
}

function renderLearningReviewCard(item) {
  const question = item.question || {}; const content = question.content || {}; const answer = item.answer || {}; const feedback = item.teacherFeedback || {};
  const answerDisplay = question.responseKind === "audio" ? `口语录音：${answer.audioUploadId ? "已上传" : "未找到录音"}${answer.notes ? `\n学生备注：${answer.notes}` : ""}` : (answer.value || answer.text || JSON.stringify(answer, null, 2));
  return `<article class="ls-card ls-review-card"><p class="ls-eyebrow">${escapeLearning(item.studentName)} · ${labelLearningSkill(question.skill)} · 第${item.position}题</p><h3>${escapeLearning(question.title || item.assignmentTitle)}</h3><div class="ls-review-question">${escapeLearning(content.prompt || "")}</div><div class="ls-answer">${escapeLearning(answerDisplay || "（空白）")}</div>${answer.audioUploadId ? `<button class="ls-button is-secondary" type="button" data-play-audio="${escapeLearning(answer.audioUploadId)}" data-student-id="${item.studentId}">播放录音</button>` : ""}<form class="ls-feedback-grid" data-feedback-form="${item.responseId}"><label class="ls-field"><span>分数</span><input name="score" type="number" min="0" max="100" step="0.5" value="${feedback.score ?? ""}" /></label><label class="ls-field"><span>问题标签（逗号分隔）</span><input name="issueTags" value="${escapeLearning((feedback.issueTags || []).join(", "))}" placeholder="例如：文章结构, 时态, 流利度" /></label><label class="ls-field"><span>处理结果</span><select name="decision"><option value="approved" ${feedback.decision === "approved" ? "selected" : ""}>通过</option><option value="revise" ${feedback.decision === "revise" ? "selected" : ""}>修改后重交</option></select></label><label class="ls-field"><span>教师反馈</span><textarea name="comment" placeholder="告诉学生做得好的地方、需要修改什么、下一步怎么练">${escapeLearning(feedback.comment || "")}</textarea></label><button class="ls-button" type="submit">保存并发布反馈</button><p class="ls-message" data-feedback-message></p></form></article>`;
}

async function submitLearningFeedback(event) {
  const form = event.target.closest("[data-feedback-form]"); if (!form) return; event.preventDefault();
  const data = new FormData(form); const message = form.querySelector("[data-feedback-message]");
  const tags = String(data.get("issueTags") || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  const score = data.get("score") === "" ? null : Number(data.get("score"));
  setLearningMessage(message, "正在保存反馈…");
  try { await rewardSchoolLearningApi.saveFeedback({ token: learningToken(), responseId: form.dataset.feedbackForm, payload: { comment: data.get("comment"), score, issueTags: tags, decision: data.get("decision") } }); await Promise.all([loadReviewQueue(), loadLearningDashboard()]); showLearningToast("教师反馈已发布"); }
  catch (error) { setLearningMessage(message, error.message, true); }
}

async function playLearningAudio(event) {
  const button = event.target.closest("[data-play-audio]"); if (!button) return;
  button.disabled = true; button.textContent = "读取录音…";
  try {
    const response = await fetch(getApiEndpoint(`/teacher/students/${encodeURIComponent(button.dataset.studentId)}/audio/${encodeURIComponent(button.dataset.playAudio)}`), { headers: { Authorization: `Bearer ${learningToken()}` } });
    if (!response.ok) throw new Error("录音读取失败。");
    const audio = document.createElement("audio"); audio.controls = true; audio.src = URL.createObjectURL(await response.blob()); button.replaceWith(audio); await audio.play().catch(() => {});
  } catch (error) { button.disabled = false; button.textContent = error.message; }
}

function setLearningMessage(node, message, error = false, success = false) { node.textContent = message || ""; node.classList.toggle("is-error", error); node.classList.toggle("is-success", success); }
function showLearningToast(message) { const toast = document.querySelector("[data-toast]"); toast.textContent = message; toast.hidden = false; clearTimeout(showLearningToast.timer); showLearningToast.timer = setTimeout(() => { toast.hidden = true; }, 2600); }
function labelLearningSkill(value) { return ({ reading: "阅读", vocabulary: "词汇题", "gap-filling": "完形填空", listening: "听力", writing: "写作", speaking: "口语", mathematics: "数学推理", nonverbal: "非语言推理" })[value] || value || ""; }
function labelLearningDifficulty(value) { return ({ foundation: "基础", standard: "标准", stretch: "强化" })[value] || value || ""; }
function labelAssignmentStatus(value) { return ({ assigned: "待开始", in_progress: "进行中", submitted: "待批改", in_review: "批改中", reviewed: "已完成", cancelled: "已取消" })[value] || value || ""; }
function formatLearningDate(value) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date) ? "" : new Intl.DateTimeFormat("zh-CN", { timeZone: "Australia/Sydney", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date); }
function escapeLearning(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }

initTeacherLearning();

function labelLearningQuestionType(value) {
  for (const types of Object.values(learningQuestionTypes)) {
    const match = types.find(([key]) => key === value);
    if (match) return match[1];
  }
  return value || "题目";
}

function formatLearningQuestionTitle(question) {
  const mock = question.content?.mock || {};
  const number = mock.sourceRange || mock.sourceNumber || mock.number;
  return `${labelLearningQuestionType(question.questionType)}${number ? ` · 第 ${number} 题` : ""}`;
}
