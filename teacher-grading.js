const AUTH_KEY = "rewardSchoolAeasAuthV1";
const gate = document.querySelector("[data-teacher-gate]");
const consolePanel = document.querySelector("[data-teacher-console]");
const studentList = document.querySelector("[data-student-list]");
const addForm = document.querySelector("[data-add-student-form]");
const addMessage = document.querySelector("[data-add-message]");
const reviewEmpty = document.querySelector("[data-review-empty]");
const reviewContent = document.querySelector("[data-review-content]");
let students = [];
let selectedStudentId = "";
let selectedSessionId = "";
let practiceDetail = null;
let sessionLabels = new Map();

function session() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; } }
function token() { return session()?.token || ""; }
function canReview(user) { return user?.admin || (user?.permissions || []).some((p) => String(p).replace(/[_-]/g, "").toLowerCase() === "practicereview"); }

async function init() {
  if (!token()) return deny("请先登录老师账号。");
  try {
    const user = await window.rewardSchoolApi.getCurrentUser({ token: token() });
    if (!canReview(user)) return deny("当前账号没有“学生练习批改”权限，请让管理员把角色设为老师。");
    gate.hidden = true; consolePanel.hidden = false;
    addForm.addEventListener("submit", addStudent);
    studentList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-student-id]");
      if (card) selectStudent(card.dataset.studentId);
    });
    document.querySelector("[data-session-tabs]").addEventListener("click", (event) => {
      const button = event.target.closest("[data-session-id]");
      if (button) { selectedSessionId = button.dataset.sessionId; renderReview(); }
    });
    document.querySelector("[data-attempt-list]").addEventListener("click", playAudio);
    await loadStudents();
    const requested = new URLSearchParams(location.search).get("student");
    if (requested && students.some((item) => item.id === requested)) await selectStudent(requested);
  } catch (error) { deny(error.message || "权限验证失败。"); }
}

function deny(message) {
  consolePanel.hidden = true; gate.hidden = false;
  gate.innerHTML = `<p class="eyebrow">Teacher Access</p><h1>无法进入批改中心</h1><p>${escapeHTML(message)}</p><a class="teacher-open-mock" href="profile.html">前往登录 / 个人中心</a>`;
}

async function loadStudents() {
  const payload = await window.rewardSchoolApi.getTeacherStudents({ token: token() });
  students = payload?.students || [];
  document.querySelector("[data-student-count]").textContent = String(students.length);
  renderStudents();
}

function renderStudents() {
  studentList.innerHTML = students.length ? students.map((student) => `
    <button class="teacher-student-card ${student.id === selectedStudentId ? "is-active" : ""}" type="button" data-student-id="${student.id}">
      <strong>${escapeHTML(student.displayName || student.email)}</strong><span>${escapeHTML(student.email)}</span>
      <small>${student.practiceSessionCount || 0} 个练习刷次 · ${student.lastPracticeAt ? formatDate(student.lastPracticeAt) : "尚未开始"}</small>
    </button>`).join("") : `<div class="teacher-empty-list">还没有学生。输入学生注册邮箱即可加入。</div>`;
}

async function addStudent(event) {
  event.preventDefault();
  const email = new FormData(addForm).get("email")?.toString().trim();
  if (!email) return;
  addMessage.textContent = "正在查找账号…";
  try {
    const student = await window.rewardSchoolApi.addTeacherStudent({ token: token(), email });
    addForm.reset(); addMessage.textContent = `已加入 ${student.displayName || student.email}`;
    await loadStudents(); await selectStudent(student.id);
  } catch (error) { addMessage.textContent = error.message || "加入失败，请检查邮箱。"; }
}

async function selectStudent(studentId) {
  selectedStudentId = studentId; selectedSessionId = ""; renderStudents();
  reviewEmpty.hidden = true; reviewContent.hidden = false;
  document.querySelector("[data-attempt-list]").innerHTML = `<div class="teacher-empty-list">正在读取练习记录…</div>`;
  try {
    practiceDetail = await window.rewardSchoolApi.getTeacherStudentPractice({ token: token(), studentId, kind: "aeas-mock" });
    buildSessionLabels(); renderReview();
  } catch (error) {
    document.querySelector("[data-attempt-list]").innerHTML = `<div class="teacher-empty-list">${escapeHTML(error.message || "记录读取失败。")}</div>`;
  }
}

function buildSessionLabels() {
  const sessions = [...(practiceDetail?.history?.attemptSessions || [])].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  sessionLabels = new Map(sessions.map((item, index) => [item.sessionId, `第 ${index + 1} 刷`]));
}

function renderReview() {
  if (!practiceDetail) return;
  const student = practiceDetail.student;
  const sessions = [...(practiceDetail.history?.attemptSessions || [])].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  document.querySelector("[data-review-student]").textContent = student.displayName || student.email;
  document.querySelector("[data-review-meta]").textContent = `${student.email} · 共 ${sessions.length} 刷`;
  document.querySelector("[data-open-mock]").href = `aeas-mock.html?teacherStudent=${encodeURIComponent(student.id)}&teacherSession=${encodeURIComponent(selectedSessionId)}`;
  document.querySelector("[data-session-tabs]").innerHTML = `<button type="button" data-session-id="" aria-selected="${!selectedSessionId}">全部合计</button>${sessions.map((item, index) => `<button type="button" data-session-id="${escapeHTML(item.sessionId)}" aria-selected="${selectedSessionId === item.sessionId}">第 ${index + 1} 刷 · ${formatShortDate(item.startedAt)}</button>`).join("")}`;
  const attempts = (practiceDetail.attempts || []).filter((item) => !selectedSessionId || item.sessionId === selectedSessionId);
  const audio = (practiceDetail.audio || []).filter((item) => !selectedSessionId || item.sessionId === selectedSessionId);
  const uniqueQuestions = new Set(attempts.map((item) => `${item.sessionId}:${item.questionKey}`));
  const essays = attempts.filter((item) => JSON.stringify(item.answer || {}).toLowerCase().includes("essay")).length;
  document.querySelector("[data-review-summary]").innerHTML = `<div><span>作答题目</span><strong>${uniqueQuestions.size}</strong></div><div><span>作文提交</span><strong>${essays}</strong></div><div><span>口语录音</span><strong>${audio.length}</strong></div>`;
  renderAttempts(attempts, audio);
}

function renderAttempts(attempts, audio) {
  const list = document.querySelector("[data-attempt-list]");
  if (!attempts.length && !audio.length) { list.innerHTML = `<div class="teacher-empty-list">这个范围内还没有练习记录。</div>`; return; }
  const progressBySession = new Map((practiceDetail.history?.progress || []).map((item) => [item.sessionId, item.progress]));
  const grouped = new Map();
  attempts.forEach((attempt) => {
    const key = `${attempt.sessionId}:${attempt.questionKey}`;
    if (!grouped.has(key)) grouped.set(key, { attempt, history: [], audio: [] });
    grouped.get(key).history.push(attempt);
  });
  audio.forEach((item) => {
    const key = `${item.sessionId}:${item.questionKey}`;
    if (!grouped.has(key)) grouped.set(key, { attempt: { sessionId:item.sessionId, questionKey:item.questionKey, subjectId:"口语", typeId:"speaking", questionIndex:"—", createdAt:item.createdAt, answer:{} }, history: [], audio: [] });
    grouped.get(key).audio.push(item);
  });
  list.innerHTML = [...grouped.values()].sort((a,b)=>new Date(b.attempt.createdAt)-new Date(a.attempt.createdAt)).map((group) => {
    const item = group.attempt;
    const completeRecord = progressBySession.get(item.sessionId)?.answers?.[item.questionKey];
    return `<details class="teacher-attempt-card"><summary><div><strong>${escapeHTML(labelSubject(item.subjectId))} · ${escapeHTML(labelType(item.typeId))} · 第 ${escapeHTML(item.questionIndex)} 题</strong><span>${sessionLabels.get(item.sessionId) || "练习"} · ${formatDate(item.createdAt)} · ${group.history.length} 次保存</span></div><em>查看答案</em></summary><div class="teacher-attempt-body">
      ${group.history.map((attempt, index) => `<div class="teacher-answer-block"><span>${index ? `较早保存 ${index + 1}` : "最后保存的答案"}</span><pre>${escapeHTML(formatValue(attempt.answer))}</pre></div>`).join("")}
      ${completeRecord ? `<div class="teacher-answer-block"><span>当时完整记录（含追问题目 / AI 结果）</span><pre>${escapeHTML(formatValue(completeRecord))}</pre></div>` : ""}
      ${group.audio.length ? `<div class="teacher-audio-list">${group.audio.map((record) => `<div class="teacher-audio-row"><span><strong>${escapeHTML(labelSegment(record.segmentId))}</strong><small>${formatDate(record.createdAt)} · ${formatBytes(record.sizeBytes)}</small></span><button type="button" data-audio-id="${record.id}" data-student-id="${selectedStudentId}">播放录音</button></div>`).join("")}</div>` : ""}
    </div></details>`;
  }).join("");
}

async function playAudio(event) {
  const button = event.target.closest("[data-audio-id]"); if (!button) return;
  button.disabled = true; button.textContent = "读取中…";
  try {
    const blob = await window.rewardSchoolApi.getTeacherAudioBlob({ token: token(), studentId: button.dataset.studentId, audioId: button.dataset.audioId });
    const audio = document.createElement("audio"); audio.controls = true; audio.preload = "metadata"; audio.src = URL.createObjectURL(blob);
    button.closest(".teacher-audio-row").append(audio); button.remove(); await audio.play().catch(() => {});
  } catch (error) { button.disabled = false; button.textContent = error.message || "重试"; }
}

function formatValue(value) {
  if (value == null) return "（无）";
  const v = value.answer !== undefined && Object.keys(value).length === 1 ? value.answer : value;
  if (typeof v === "string") { try { return formatValue(JSON.parse(v)); } catch { return v || "（空白）"; } }
  if (Array.isArray(v)) return v.map((item, i) => `${i + 1}. ${typeof item === "object" ? formatValue(item) : item}`).join("\n");
  if (typeof v === "object") return Object.entries(v).map(([key,val]) => `${labelField(key)}：${typeof val === "object" ? `\n${formatValue(val)}` : val}`).join("\n");
  return String(v);
}
function labelField(key){return ({essay:"作文",answer:"答案",speakingFollowUps:"随机追问题目",speakingRecordings:"录音记录",speakingReview:"口语评分",aiReview:"AI 批改",correct:"是否正确",graded:"已批改",updatedAt:"保存时间",segmentId:"录音段落"})[key]||key;}
function labelSubject(value){return ({english:"英语能力",mathematics:"数学推理",nonverbal:"非语言推理"})[value]||value;}
function labelType(value){return ({writing:"写作",speaking:"口语",reading:"阅读",listening:"听力",vocabulary:"词汇"})[value]||value;}
function labelSegment(value){if(value==="main")return "主回答";if(String(value).startsWith("followup"))return `追问 ${String(value).replace(/\D/g,"")}`;return value||"录音";}
function formatDate(value){const d=new Date(value);return Number.isNaN(d)?"时间未知":new Intl.DateTimeFormat("zh-CN",{timeZone:"Australia/Sydney",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);}
function formatShortDate(value){const d=new Date(value);return Number.isNaN(d)?"":new Intl.DateTimeFormat("zh-CN",{timeZone:"Australia/Sydney",month:"numeric",day:"numeric"}).format(d);}
function formatBytes(value){return `${Math.max(1,Math.round(Number(value||0)/1024))} KB`;}
function escapeHTML(value){return String(value??"").replace(/[&<>'"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);}

init();
