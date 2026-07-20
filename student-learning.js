const STUDENT_LEARNING_AUTH_KEY = "rewardSchoolAeasAuthV1";
const studentLearning = { assignments: [], current: null, saveTimers: new Map(), recordings: new Map() };

function studentSession() { try { return JSON.parse(localStorage.getItem(STUDENT_LEARNING_AUTH_KEY) || "null"); } catch { return null; } }
function studentToken() { return studentSession()?.token || ""; }

async function initStudentLearning() {
  if (!studentToken()) return denyStudentLearning("请先登录学生账号。");
  try {
    const user = await rewardSchoolLearningApi.getCurrentUser({ token: studentToken() });
    document.querySelector("[data-gate]").hidden = true; document.querySelector("[data-app]").hidden = false;
    document.querySelector("[data-welcome]").textContent = `${user.displayName || "同学"}，今天先完成老师安排的练习。`;
    document.querySelector("[data-assignment-list]").addEventListener("click", chooseStudentAssignment);
    document.querySelector("[data-assignment-workspace]").addEventListener("change", scheduleStudentSave);
    document.querySelector("[data-assignment-workspace]").addEventListener("input", scheduleStudentSave);
    document.querySelector("[data-assignment-workspace]").addEventListener("click", handleStudentWorkspaceClick);
    await loadStudentAssignments();
    const requested = new URLSearchParams(location.search).get("id");
    const first = requested || studentLearning.assignments.find((item) => ["assigned", "in_progress"].includes(item.status))?.id;
    if (first) await openStudentAssignment(first);
  } catch (error) { denyStudentLearning(error.message || "无法读取学生任务。"); }
}

function denyStudentLearning(message) {
  const gate = document.querySelector("[data-gate]"); document.querySelector("[data-app]").hidden = true; gate.hidden = false;
  gate.innerHTML = `<p class="ls-eyebrow">Student Access</p><h1>无法进入练习中心</h1><p>${escapeStudent(message)}</p><a class="ls-button" href="profile.html">前往登录</a>`;
}

async function loadStudentAssignments() {
  const payload = await rewardSchoolLearningApi.getStudentAssignments({ token: studentToken() }); studentLearning.assignments = payload.assignments || [];
  const openCount = studentLearning.assignments.filter((item) => ["assigned", "in_progress"].includes(item.status)).length;
  document.querySelector("[data-assignment-count]").textContent = `${openCount} 份待完成`;
  renderStudentAssignmentList();
}

function renderStudentAssignmentList() {
  const currentId = studentLearning.current?.id;
  document.querySelector("[data-assignment-list]").innerHTML = studentLearning.assignments.length ? studentLearning.assignments.map((item) => {
    const percent = item.questionCount ? Math.round(item.completedCount * 100 / item.questionCount) : 0;
    return `<button class="ls-list-item is-clickable ${currentId === item.id ? "is-active" : ""}" type="button" data-assignment-id="${item.id}"><span><strong>${escapeStudent(item.title)}</strong><small>${escapeStudent(item.personName)} · ${item.completedCount}/${item.questionCount}题</small><div class="ls-progress" style="margin-top:8px"><span style="width:${percent}%"></span></div></span><span class="ls-badge ${item.status === "reviewed" ? "is-green" : item.status === "submitted" ? "is-red" : ""}">${labelStudentStatus(item.status)}</span></button>`;
  }).join("") : `<div class="ls-empty">老师还没有给你布置作业。</div>`;
}

async function chooseStudentAssignment(event) { const button = event.target.closest("[data-assignment-id]"); if (button) await openStudentAssignment(button.dataset.assignmentId); }

async function openStudentAssignment(assignmentId) {
  flushStudentSaves();
  const workspace = document.querySelector("[data-assignment-workspace]"); workspace.innerHTML = `<div class="ls-card"><div class="ls-card-body"><div class="ls-empty">正在加载作业…</div></div></div>`;
  try { studentLearning.current = await rewardSchoolLearningApi.getStudentAssignment({ token: studentToken(), assignmentId }); renderStudentAssignmentList(); renderStudentWorkspace(); history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(assignmentId)}${location.search.includes("api=") ? `&api=${new URLSearchParams(location.search).get("api")}` : ""}`); }
  catch (error) { workspace.innerHTML = `<div class="ls-card"><div class="ls-card-body"><div class="ls-empty">${escapeStudent(error.message)}</div></div></div>`; }
}

function renderStudentWorkspace() {
  const assignment = studentLearning.current; const editable = ["assigned", "in_progress"].includes(assignment.status);
  const answered = (assignment.items || []).filter((item) => item.response?.answer && Object.keys(item.response.answer).length).length;
  const correct = (assignment.items || []).filter((item) => item.response?.result?.correct === true).length;
  const graded = (assignment.items || []).filter((item) => item.response?.result?.graded === true).length;
  document.querySelector("[data-assignment-workspace]").innerHTML = `<section class="ls-card"><div class="ls-card-head"><div><p class="ls-eyebrow">${escapeStudent(assignment.teacherName)} · ${labelStudentStatus(assignment.status)}</p><h2>${escapeStudent(assignment.title)}</h2><p>${escapeStudent(assignment.instructions || "按顺序完成，答案会自动保存。")}</p></div><span class="ls-badge">${assignment.items.length}题</span></div><div class="ls-card-body"><div class="ls-student-summary"><div><span>已保存</span><strong>${answered}/${assignment.items.length}</strong></div><div><span>客观题正确</span><strong>${graded ? `${correct}/${graded}` : "—"}</strong></div><div><span>截止时间</span><strong>${assignment.dueAt ? formatStudentDate(assignment.dueAt) : "不限"}</strong></div></div>${assignment.items.map((item) => renderStudentQuestion(item, editable, assignment.status)).join("")}<div class="ls-footer-actions"><span class="ls-save-state" data-global-save-state>${editable ? "修改后自动保存" : "作业已提交，只读查看"}</span><div class="ls-actions">${!editable && assignment.allowRetry ? `<button class="ls-button is-secondary" type="button" data-repractice>生成错题复练</button>` : ""}${editable ? `<button class="ls-button" type="button" data-submit-assignment>提交整份作业</button>` : ""}</div></div></div></section>`;
}

function renderStudentQuestion(item, editable, assignmentStatus) {
  const question = item.question || {}; const content = question.content || {}; const answer = item.response?.answer || {}; const result = item.response?.result || {}; const feedback = item.response?.teacherFeedback || {};
  const controls = question.responseKind === "single_choice"
    ? `<div class="ls-options">${(content.options || []).map((option) => `<label class="ls-option"><input type="radio" name="answer-${item.id}" value="${escapeStudent(option.value)}" data-response-item="${item.id}" ${String(answer.value) === String(option.value) ? "checked" : ""} ${editable ? "" : "disabled"}/><span><strong>${escapeStudent(option.value)}.</strong> ${escapeStudent(option.label)}</span></label>`).join("")}</div>`
    : question.responseKind === "long_text"
      ? `<textarea class="ls-writing" data-response-item="${item.id}" placeholder="在这里完成写作…" ${editable ? "" : "disabled"}>${escapeStudent(answer.value || "")}</textarea><small class="ls-save-state" data-save-state="${item.id}">${answer.value ? "已保存" : "尚未作答"}</small>`
      : question.responseKind === "audio"
        ? `<div class="ls-audio-controls"><button class="ls-button is-secondary" type="button" data-record="${item.id}" ${editable ? "" : "disabled"}>开始录音</button><button class="ls-button is-quiet" type="button" data-stop-record="${item.id}" disabled>停止</button></div><p class="ls-audio-status" data-audio-status="${item.id}">${answer.audioUploadId ? "录音已上传" : "尚未录音"}</p>`
        : `<input data-response-item="${item.id}" value="${escapeStudent(answer.value || "")}" ${editable ? "" : "disabled"}/>`;
  const listening = content.audioText ? `<div class="ls-audio-controls"><button class="ls-button is-secondary" type="button" data-play-listening="${item.id}" data-audio-text="${escapeStudent(content.audioText)}">播放听力</button></div>` : "";
  const resultBlock = result.graded === true ? `<div class="ls-result ${result.correct ? "is-correct" : "is-wrong"}">${result.correct ? "回答正确" : "回答不正确"}${question.explanation ? ` · ${escapeStudent(question.explanation)}` : ""}</div>` : "";
  const feedbackBlock = feedback.comment || feedback.score != null ? `<div class="ls-result"><strong>老师反馈${feedback.score != null ? ` · ${feedback.score}分` : ""}</strong><br/>${escapeStudent(feedback.comment || "")}${feedback.decision === "revise" ? "<br/><strong>请修改后复练。</strong>" : ""}</div>` : "";
  return `<article class="ls-item-card" data-item-card="${item.id}"><span class="ls-stable">${escapeStudent(question.stableId)}@v${question.version}</span><h3>${item.position}. ${escapeStudent(question.title)}</h3><div class="ls-actions"><span class="ls-badge">${labelStudentSkill(question.skill)}</span><span class="ls-badge">${escapeStudent(question.questionType)}</span><span class="ls-badge">约${question.estimatedMinutes}分钟</span></div>${content.stimulus ? `<div class="ls-stimulus">${escapeStudent(content.stimulus)}</div>` : ""}<p class="ls-prompt">${escapeStudent(content.prompt || "")}</p>${listening}${controls}${assignmentStatus !== "assigned" && assignmentStatus !== "in_progress" ? resultBlock : ""}${feedbackBlock}</article>`;
}

function scheduleStudentSave(event) {
  const input = event.target.closest("[data-response-item]"); if (!input || !studentLearning.current || !["assigned", "in_progress"].includes(studentLearning.current.status)) return;
  const itemId = input.dataset.responseItem; clearTimeout(studentLearning.saveTimers.get(itemId));
  const delay = input.tagName === "TEXTAREA" ? 900 : 120;
  studentLearning.saveTimers.set(itemId, setTimeout(() => saveStudentAnswer(itemId), delay));
  const state = document.querySelector(`[data-save-state="${CSS.escape(itemId)}"]`); if (state) state.textContent = "等待保存…";
}

function getStudentAnswer(itemId) {
  const card = document.querySelector(`[data-item-card="${CSS.escape(itemId)}"]`); if (!card) return { value: "" };
  const selected = card.querySelector(`input[type=radio][data-response-item="${CSS.escape(itemId)}"]:checked`); if (selected) return { value: selected.value };
  const field = card.querySelector(`textarea[data-response-item="${CSS.escape(itemId)}"],input:not([type=radio])[data-response-item="${CSS.escape(itemId)}"]`); return { value: field?.value || "" };
}

async function saveStudentAnswer(itemId) {
  clearTimeout(studentLearning.saveTimers.get(itemId)); studentLearning.saveTimers.delete(itemId); const state = document.querySelector(`[data-save-state="${CSS.escape(itemId)}"]`); if (state) state.textContent = "正在保存…";
  try { const saved = await rewardSchoolLearningApi.saveStudentResponse({ token: studentToken(), assignmentItemId: itemId, answer: getStudentAnswer(itemId) }); if (state) state.textContent = "已保存"; const item = studentLearning.current.items.find((entry) => entry.id === itemId); if (item) item.response = { ...(item.response || {}), answer: getStudentAnswer(itemId), result: saved.result }; }
  catch (error) { if (state) state.textContent = `保存失败：${error.message}`; }
}

function flushStudentSaves() { studentLearning.saveTimers.forEach((timer) => clearTimeout(timer)); studentLearning.saveTimers.clear(); }

async function handleStudentWorkspaceClick(event) {
  const listening = event.target.closest("[data-play-listening]"); if (listening) return playStudentListening(listening);
  const record = event.target.closest("[data-record]"); if (record) return startStudentRecording(record.dataset.record);
  const stop = event.target.closest("[data-stop-record]"); if (stop) return stopStudentRecording(stop.dataset.stopRecord);
  if (event.target.closest("[data-submit-assignment]")) return submitStudentAssignment();
  if (event.target.closest("[data-repractice]")) return createStudentRepractice();
}

function playStudentListening(button) {
  if (!window.speechSynthesis) return showStudentToast("当前浏览器不支持听力播放，请更换 Chrome 或 Edge。");
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(button.dataset.audioText); utterance.lang = "en-AU"; utterance.rate = .92; speechSynthesis.speak(utterance);
}

async function startStudentRecording(itemId) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return showStudentToast("当前浏览器不支持录音。");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = []; const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); await uploadStudentRecording(itemId, new Blob(chunks, { type: recorder.mimeType || "audio/webm" })); };
    studentLearning.recordings.set(itemId, recorder); recorder.start();
    document.querySelector(`[data-record="${CSS.escape(itemId)}"]`).disabled = true; document.querySelector(`[data-stop-record="${CSS.escape(itemId)}"]`).disabled = false; document.querySelector(`[data-audio-status="${CSS.escape(itemId)}"]`).textContent = "正在录音…";
  } catch (error) { showStudentToast(error.message || "无法使用麦克风。"); }
}

function stopStudentRecording(itemId) { const recorder = studentLearning.recordings.get(itemId); if (recorder?.state === "recording") recorder.stop(); studentLearning.recordings.delete(itemId); }

async function uploadStudentRecording(itemId, blob) {
  const status = document.querySelector(`[data-audio-status="${CSS.escape(itemId)}"]`); status.textContent = "正在上传录音…";
  const item = studentLearning.current.items.find((entry) => entry.id === itemId);
  try {
    const uploaded = await rewardSchoolLearningApi.uploadAssignmentAudio({ token: studentToken(), assignmentId: studentLearning.current.id, questionKey: item.question.stableId, blob });
    const answer = { audioUploadId: uploaded.id, contentType: uploaded.contentType, sizeBytes: uploaded.sizeBytes };
    const saved = await rewardSchoolLearningApi.saveStudentResponse({ token: studentToken(), assignmentItemId: itemId, answer }); item.response = { ...(item.response || {}), answer, result: saved.result }; status.textContent = "录音已上传并保存";
  } catch (error) { status.textContent = `录音保存失败：${error.message}`; }
  const start = document.querySelector(`[data-record="${CSS.escape(itemId)}"]`); const stop = document.querySelector(`[data-stop-record="${CSS.escape(itemId)}"]`); if (start) start.disabled = false; if (stop) stop.disabled = true;
}

async function submitStudentAssignment() {
  if (!confirm("确定提交整份作业吗？提交后不能继续修改，老师要求时可生成复练。")) return;
  document.querySelector("[data-submit-assignment]").disabled = true;
  try { for (const itemId of [...studentLearning.saveTimers.keys()]) await saveStudentAnswer(itemId); studentLearning.current = await rewardSchoolLearningApi.submitAssignment({ token: studentToken(), assignmentId: studentLearning.current.id }); await loadStudentAssignments(); renderStudentWorkspace(); showStudentToast("作业已提交给老师"); }
  catch (error) { document.querySelector("[data-submit-assignment]").disabled = false; showStudentToast(error.message); }
}

async function createStudentRepractice() {
  try { const assignment = await rewardSchoolLearningApi.createRepractice({ token: studentToken(), assignmentId: studentLearning.current.id }); await loadStudentAssignments(); await openStudentAssignment(assignment.id); showStudentToast("错题复练已经建立"); }
  catch (error) { showStudentToast(error.message); }
}

function showStudentToast(message) { const toast = document.querySelector("[data-toast]"); toast.textContent = message; toast.hidden = false; clearTimeout(showStudentToast.timer); showStudentToast.timer = setTimeout(() => { toast.hidden = true; }, 3000); }
function labelStudentStatus(value) { return ({ assigned: "待开始", in_progress: "进行中", submitted: "等待老师", in_review: "批改中", reviewed: "已完成", cancelled: "已取消" })[value] || value; }
function labelStudentSkill(value) { return ({ reading: "阅读", vocabulary: "词汇", listening: "听力", writing: "写作", speaking: "口语" })[value] || value; }
function formatStudentDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { timeZone: "Australia/Sydney", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date); }
function escapeStudent(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }

initStudentLearning();
