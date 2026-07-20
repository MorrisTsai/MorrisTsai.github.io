const ASSESSMENT_AUTH_KEY = "rewardSchoolAeasAuthV1";
const form = document.querySelector("[data-assessment-form]");
const message = document.querySelector("[data-assessment-message]");
const reportPanel = document.querySelector("[data-assessment-report]");
const historyPanel = document.querySelector("[data-assessment-history]");
const authNote = document.querySelector("[data-assessment-auth]");
const subjectList = document.querySelector("[data-subject-list]");
const transcriptMessage = document.querySelector("[data-transcript-message]");
const larkStatus = document.querySelector("[data-lark-status]");
const larkFileList = document.querySelector("[data-lark-file-list]");
const larkFileInput = document.querySelector("[data-lark-file-input]");
let currentUser = null;
let currentReport = null;
let larkDriveConfigured = false;

void initAssessment();

function getToken() {
  try { return JSON.parse(localStorage.getItem(ASSESSMENT_AUTH_KEY) || "null")?.token || ""; }
  catch { return ""; }
}

async function initAssessment() {
  bindEvents();
  setAdvisorWorkspaceEnabled(false);
  const token = getToken();
  if (token) {
    try {
      currentUser = await window.rewardSchoolApi.getCurrentUser({ token });
      if (hasAdvisorAccess(currentUser)) {
        setAdvisorWorkspaceEnabled(true);
        authNote.innerHTML = `<strong>${escapeHTML(currentUser.displayName || currentUser.email)}</strong><span>${currentUser.emailVerified || currentUser.superUser ? "Advisor 已验证，可以代学生录入资料、生成并审核报告。" : "请先验证 Advisor 账号邮箱再提交真实评估。"}</span>`;
        await Promise.all([loadHistory(), loadLarkStatus()]);
      } else {
        authNote.innerHTML = `<strong>仅限 Advisor / Admin</strong><span>普通账号不能上传、录入或查看真实学生评估；如需评估，请把资料交给负责顾问。匿名模拟报告仍可查看。</span>`;
      }
    } catch (error) {
      currentUser = null;
      authNote.innerHTML = `<strong>登录已失效</strong><span><a href="profile.html">重新登录 Advisor / Admin 账号</a>后可进入真实评估工作区；模拟报告仍可查看。</span>`;
    }
  } else {
    authNote.innerHTML = `<strong>Advisor 工作区</strong><span><a href="profile.html">登录 Advisor / Admin 账号</a>后可代学生录入资料和生成报告；普通账号不能操作真实评估。匿名模拟报告仍可查看。</span>`;
  }

  const params = new URLSearchParams(location.search);
  if (params.get("lark") === "connected") setTranscriptMessage("Lark Drive 授权完成，可以上传或读取学生文件。", false);
  if (params.get("lark") === "denied") setTranscriptMessage("Lark Drive 授权已取消。", true);
  if (params.get("lark") === "error") setTranscriptMessage("Lark Drive 授权失败，请重新连接。", true);
  if (params.has("demo")) await loadDemo(Number(params.get("demo") || 0));
  if (params.has("report") && token && hasAdvisorAccess(currentUser)) await loadReport(params.get("report"));
}

function hasAdvisorAccess(user) {
  return Boolean(user?.admin || (user?.permissions || []).some((permission) => normalize(permission) === "schoolinformation"));
}

function setAdvisorWorkspaceEnabled(enabled) {
  if (form) form.hidden = !enabled;
  if (historyPanel) historyPanel.hidden = !enabled;
}

function bindEvents() {
  form?.addEventListener("submit", submitAssessment);
  form?.addEventListener("input", (event) => {
    if (event.target?.dataset?.analysisAutofill === "true") delete event.target.dataset.analysisAutofill;
  });
  document.querySelector("[data-add-subject]")?.addEventListener("click", () => addSubjectRow());
  subjectList?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-subject]");
    if (!remove) return;
    const row = remove.closest("[data-subject-row]");
    if (subjectList.querySelectorAll("[data-subject-row]").length > 1) row?.remove();
    else row?.querySelectorAll("input").forEach((input) => { input.value = input.dataset.subjectMaximum !== undefined ? "100" : ""; });
  });
  document.querySelector("[data-upload-transcripts]")?.addEventListener("click", () => void uploadAndAnalyzeDocuments());
  document.querySelector("[data-connect-lark]")?.addEventListener("click", () => void connectLarkDrive());
  document.querySelector("[data-load-lark-files]")?.addEventListener("click", () => void loadLarkFiles());
  document.querySelector("[data-analyze-lark]")?.addEventListener("click", () => void analyzeLarkDocument());
  larkFileList?.addEventListener("change", () => { if (larkFileList.value) larkFileInput.value = larkFileList.value; });
  document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => void loadDemo(Number(button.dataset.demo))));
  historyPanel?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-assessment-id]");
    if (button) void loadReport(button.dataset.assessmentId);
  });
  reportPanel?.addEventListener("click", (event) => {
    if (event.target.closest("[data-print-report]")) void downloadMatchingReportPdf();
    const save = event.target.closest("[data-save-review]");
    if (save) void saveAdvisorReview();
  });
}

async function connectLarkDrive() {
  const button = document.querySelector("[data-connect-lark]");
  button.disabled = true;
  setTranscriptMessage("正在打开 Lark Drive 授权页面…", false);
  try {
    const response = await window.rewardSchoolApi.getLarkAuthorizationUrl({ token: getToken() });
    if (!response?.authorizationUrl) throw new Error("Lark 授权地址无效。" );
    location.href = response.authorizationUrl;
  } catch (error) {
    setTranscriptMessage(error.message || "无法开始 Lark Drive 授权。", true);
    button.disabled = false;
  }
}

async function submitAssessment(event) {
  event.preventDefault();
  const token = getToken();
  if (!token || !hasAdvisorAccess(currentUser)) return setMessage("只有 Advisor / Admin 可以提交真实学生评估。", true);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage("正在整理学生画像、匹配28所学校并生成报告...", false);
  try {
    const report = await window.rewardSchoolApi.createStudentAssessment({ token, assessment: serializeAssessment(form) });
    renderReport(report);
    history.replaceState({}, "", `student-assessment.html?report=${encodeURIComponent(report.id)}`);
    await loadHistory();
    setMessage("报告已生成并保存。", false);
  } catch (error) {
    setMessage(error.message || "评估生成失败。", true);
  } finally {
    button.disabled = false;
  }
}

function serializeAssessment(target) {
  const data = new FormData(target);
  return {
    studentName: text(data, "studentName"), preferredName: text(data, "preferredName"), dateOfBirth: nullableText(data, "dateOfBirth"),
    currentCountry: "中国", currentCity: text(data, "currentCity"), currentSchool: text(data, "currentSchool"), currentCurriculum: text(data, "currentCurriculum"),
    currentYearLevel: number(data, "currentYearLevel"), targetYearLevel: number(data, "targetYearLevel"), targetStartYear: number(data, "targetStartYear"), targetTerm: number(data, "targetTerm"),
    gender: text(data, "gender"), accommodationNeed: text(data, "accommodationNeed"), annualBudgetAud: nullableNumber(data, "annualBudgetAud"),
    academic: {
      overallAverage: nullableNumber(data, "overallAverage"), subjects: serializeSubjects(), chinese: null, english: null,
      mathematics: null, science: null, humanities: null, attendancePercent: nullableNumber(data, "attendancePercent"),
      trend: text(data, "academicTrend"), ranking: text(data, "ranking"), teacherComments: text(data, "teacherComments"), failedOrWeakSubjects: list(data, "failedOrWeakSubjects"),
    },
    aeas: {
      hasResult: data.has("hasAeas"), testDate: nullableText(data, "aeasTestDate"), overall: nullableNumber(data, "aeasOverall"), reading: nullableNumber(data, "aeasReading"),
      vocabulary: nullableNumber(data, "aeasVocabulary"), writing: nullableNumber(data, "aeasWriting"), listening: nullableNumber(data, "aeasListening"), speaking: nullableNumber(data, "aeasSpeaking"),
      mathematicalReasoning: nullableNumber(data, "aeasMathematicalReasoning"), nonVerbalReasoning: nullableNumber(data, "aeasNonVerbalReasoning"), assessedYearLevel: text(data, "aeasAssessedYearLevel"),
    },
    backgroundStory: text(data, "backgroundStory"), learningStyle: text(data, "learningStyle"), personality: text(data, "personality"), boardingReadiness: text(data, "boardingReadiness"),
    futureGoals: text(data, "futureGoals"), parentExpectations: text(data, "parentExpectations"), specialCircumstances: text(data, "specialCircumstances"),
    interests: list(data, "interests"), strengths: list(data, "strengths"), concerns: list(data, "concerns"), useAi: true, parentOrGuardianConsent: data.has("parentOrGuardianConsent"),
  };
}

function serializeSubjects() {
  return Array.from(subjectList?.querySelectorAll("[data-subject-row]") || []).map((row) => ({
    name: row.querySelector("[data-subject-name]")?.value.trim() || "",
    score: nullableInputNumber(row.querySelector("[data-subject-score]")),
    maximumScore: nullableInputNumber(row.querySelector("[data-subject-maximum]")),
    period: row.querySelector("[data-subject-period]")?.value.trim() || "",
    grade: "",
  })).filter((subject) => subject.name || subject.score != null || subject.maximumScore != null);
}

function addSubjectRow(subject = {}, replace = false) {
  if (!subjectList) return;
  if (replace) subjectList.innerHTML = "";
  const row = document.createElement("div");
  row.className = "assessment-subject-row";
  row.dataset.subjectRow = "";
  row.innerHTML = `
    <label><span>科目</span><input data-subject-name maxlength="80" required value="${escapeHTML(subject.name || "")}" /></label>
    <label><span>成绩</span><input data-subject-score type="number" min="0" max="1000" step="0.1" required value="${subject.score == null ? "" : escapeHTML(subject.score)}" /></label>
    <label><span>满分</span><input data-subject-maximum type="number" min="1" max="1000" step="0.1" required value="${subject.maximumScore == null ? "" : escapeHTML(subject.maximumScore)}" /></label>
    <label><span>学期／考试</span><input data-subject-period maxlength="120" placeholder="例如 初二下学期期末" value="${escapeHTML(subject.period || "")}" /></label>
    <button type="button" data-remove-subject aria-label="删除科目">删除</button>`;
  subjectList.appendChild(row);
}

async function loadLarkStatus() {
  const token = getToken();
  if (!token || !hasAdvisorAccess(currentUser)) return;
  try {
    const status = await window.rewardSchoolApi.getTranscriptLarkStatus({ token });
    larkDriveConfigured = Boolean(status?.configured);
    larkStatus.textContent = status?.message || (larkDriveConfigured ? "Lark Drive 已连接" : "Lark Drive 未配置");
    larkStatus.classList.toggle("is-ready", larkDriveConfigured);
    larkStatus.classList.toggle("is-error", !larkDriveConfigured);
    setDocumentButtonsEnabled(larkDriveConfigured);
    if (larkDriveConfigured) await loadLarkFiles({ quiet: true });
  } catch (error) {
    larkDriveConfigured = false;
    larkStatus.textContent = "Lark Drive 状态读取失败";
    larkStatus.classList.add("is-error");
    setDocumentButtonsEnabled(false);
  }
}

async function loadLarkFiles({ quiet = false } = {}) {
  if (!larkDriveConfigured) return setTranscriptMessage("Lark Drive 尚未连接。", true);
  const button = document.querySelector("[data-load-lark-files]");
  if (button) button.disabled = true;
  if (!quiet) setTranscriptMessage("正在读取 Lark Drive 归档文件列表…", false);
  try {
    const response = await window.rewardSchoolApi.listLarkTranscriptFiles({ token: getToken() });
    const files = response?.files || [];
    larkFileList.innerHTML = `<option value="">选择一个 Lark 文件（${files.length}）</option>${files.map((file) => `<option value="${escapeHTML(file.token)}">${escapeHTML(file.name || file.token)}</option>`).join("")}`;
    if (!quiet) setTranscriptMessage(files.length ? `已读取 ${files.length} 个归档文件。` : "归档文件夹目前没有可分析的文件。", false);
  } catch (error) {
    setTranscriptMessage(error.message || "Lark Drive 文件列表读取失败。", true);
  } finally {
    if (button) button.disabled = false;
  }
}

async function uploadAndAnalyzeDocuments() {
  const input = document.querySelector("[data-transcript-upload]");
  const button = document.querySelector("[data-upload-transcripts]");
  if (!larkDriveConfigured) return setTranscriptMessage("Lark Drive 尚未连接，不能接收学生文件。", true);
  if (!input?.files?.length) return setTranscriptMessage("请先选择学校成绩单、AEAS成绩报告、学生简介或其他学生材料。", true);
  button.disabled = true;
  setTranscriptMessage("正在归档到 Lark Drive，并在服务器临时执行文字识别…", false);
  try {
    const result = await window.rewardSchoolApi.analyzeTranscriptUpload({ token: getToken(), files: input.files });
    applyDocumentAnalysis(result);
    input.value = "";
    await loadLarkFiles({ quiet: true });
  } catch (error) {
    setTranscriptMessage(error.message || "文件上传或分析失败。", true);
  } finally {
    button.disabled = false;
  }
}

async function analyzeLarkDocument() {
  const value = (larkFileInput?.value || larkFileList?.value || "").trim();
  const button = document.querySelector("[data-analyze-lark]");
  if (!larkDriveConfigured) return setTranscriptMessage("Lark Drive 尚未连接。", true);
  if (!value) return setTranscriptMessage("请粘贴 Lark 文件链接/token，或从归档列表选择一个文件。", true);
  button.disabled = true;
  setTranscriptMessage("正在从 Lark Drive 临时读取并分析文件…", false);
  try {
    applyDocumentAnalysis(await window.rewardSchoolApi.analyzeLarkTranscript({ token: getToken(), fileUrlOrToken: value }));
  } catch (error) {
    setTranscriptMessage(error.message || "Lark 文件分析失败。", true);
  } finally {
    button.disabled = false;
  }
}

function applyDocumentAnalysis(result) {
  const subjects = (result?.subjects || []).filter((subject) => subject.name && subject.score != null);
  if (subjects.length) {
    subjects.forEach((subject, index) => addSubjectRow(subject, index === 0));
  }
  applyAeasDraft(result?.aeasDraft || {});
  applyProfileDraft(result?.profileDraft || {});
  const archivedFiles = (result?.files || []).filter((file) => file.larkFileToken).length;
  const aeasCount = result?.aeasDraft?.hasResult ? 1 : 0;
  const materialTypes = [...new Set((result?.files || []).map((file) => file.documentTypeLabel).filter(Boolean))];
  const method = result?.usedDeepSeek ? `并由 ${result.model || "DeepSeek"} 完成结构化` : "并使用本地规则完成结构化";
  const deletion = result?.localTemporaryFilesDeleted ? "服务器临时副本已删除" : "请检查临时文件状态";
  setTranscriptMessage(`已分类 ${result?.files?.length || 0} 份材料（${materialTypes.join("、") || "待复核"}），识别 ${subjects.length} 个在校科目${aeasCount ? "及 1 份 AEAS 成绩" : ""}，${method}；${archivedFiles ? `${archivedFiles} 个原件保存在 Lark Drive，` : ""}${deletion}。请顾问对照原件复核后再提交。`, false);
  const review = document.querySelector("[data-transcript-review]");
  const reviewContent = document.querySelector("[data-transcript-review-content]");
  const warnings = result?.warnings || [];
  const files = result?.files || [];
  const aeas = result?.aeasDraft || {};
  review.hidden = files.length === 0 && warnings.length === 0;
  reviewContent.innerHTML = `${files.length ? `<strong>材料分类与来源</strong><ul>${files.map((file) => `<li><b>${escapeHTML(file.fileName || "文件")}</b>：${escapeHTML(file.documentTypeLabel || "其他材料")}（${confidenceLabel(file.classificationConfidence)}）${(file.detectedFacts || []).length ? `；${escapeHTML(file.detectedFacts.join("、"))}` : ""}</li>`).join("")}</ul>` : ""}${aeas.hasResult ? `<strong>AEAS 自动识别</strong><p>${escapeHTML(aeasSummary(aeas))}</p>` : ""}${warnings.length ? `<strong>复核提醒</strong><ul>${warnings.map((warning) => `<li>${escapeHTML(warning)}</li>`).join("")}</ul>` : ""}`;
}

function applyAeasDraft(aeas) {
  if (!aeas?.hasResult) return;
  const replacePreviousRecognition = normalize(aeas.confidence) === "high";
  const checkbox = form?.elements?.namedItem("hasAeas");
  if (checkbox) checkbox.checked = true;
  const mappings = {
    aeasTestDate: aeas.testDate,
    aeasOverall: aeas.overall,
    aeasReading: aeas.reading,
    aeasVocabulary: aeas.vocabulary,
    aeasWriting: aeas.writing,
    aeasListening: aeas.listening,
    aeasSpeaking: aeas.speaking,
    aeasMathematicalReasoning: aeas.mathematicalReasoning,
    aeasNonVerbalReasoning: aeas.nonVerbalReasoning,
    aeasAssessedYearLevel: aeas.assessedYearLevel,
  };
  Object.entries(mappings).forEach(([name, value]) => {
    const field = form?.elements?.namedItem(name);
    if (field && (replacePreviousRecognition || !String(field.value || "").trim() || field.dataset.analysisAutofill === "true") && value != null && String(value).trim()) {
      field.value = value;
      field.dataset.analysisAutofill = "true";
    }
  });
}

function aeasSummary(aeas) {
  const fields = [
    ["考试日期", aeas.testDate], ["综合（/100）", aeas.overall], ["Reading（/20）", aeas.reading], ["Vocabulary（/20）", aeas.vocabulary],
    ["Writing（/20）", aeas.writing], ["Listening（/20）", aeas.listening], ["Speaking（/20）", aeas.speaking],
    ["Mathematical Reasoning", aeas.mathematicalReasoning], ["Non-Verbal Reasoning", aeas.nonVerbalReasoning], ["评估年级", aeas.assessedYearLevel],
  ].filter(([, value]) => value != null && String(value).trim());
  return fields.map(([label, value]) => `${label}：${value}`).join("；") || "未提取到可用分数";
}

function applyProfileDraft(profile) {
  const mappings = {
    studentName: profile.studentName,
    currentSchool: profile.currentSchool,
    currentCurriculum: profile.currentCurriculum,
    backgroundStory: profile.backgroundStory,
    learningStyle: profile.learningStyle,
    personality: profile.personality,
    boardingReadiness: profile.boardingReadiness,
    futureGoals: profile.futureGoals,
    parentExpectations: profile.parentExpectations,
    specialCircumstances: profile.specialCircumstances,
    interests: (profile.interests || []).join("，"),
    strengths: (profile.strengths || []).join("，"),
    concerns: (profile.concerns || []).join("，"),
  };
  Object.entries(mappings).forEach(([name, value]) => {
    const field = form?.elements?.namedItem(name);
    if (field && !String(field.value || "").trim() && String(value || "").trim()) field.value = value;
  });
}

function setDocumentButtonsEnabled(enabled) {
  document.querySelectorAll("[data-upload-transcripts], [data-load-lark-files], [data-analyze-lark]").forEach((button) => { button.disabled = !enabled; });
}

function setTranscriptMessage(value, error) {
  transcriptMessage.textContent = value;
  transcriptMessage.classList.toggle("is-error", Boolean(error));
}

async function loadDemo(index) {
  reportPanel.hidden = false;
  reportPanel.innerHTML = "<div class=\"assessment-loading\">正在生成模拟匹配结果...</div>";
  try {
    const response = await window.rewardSchoolApi.getAssessmentDemos();
    const reports = response.reports || [];
    renderReport(reports[Math.max(0, Math.min(reports.length - 1, index))]);
    history.replaceState({}, "", `student-assessment.html?demo=${index}`);
  } catch (error) {
    reportPanel.innerHTML = `<div class="assessment-error">${escapeHTML(error.message || "模拟报告读取失败。")}</div>`;
  }
}

async function loadHistory() {
  try {
    const response = await window.rewardSchoolApi.getAdvisorAssessments({ token: getToken() });
    const items = response.assessments || [];
    historyPanel.innerHTML = `<h2>历史评估</h2>${items.length ? items.map((item) => `<button type="button" data-assessment-id="${escapeHTML(item.id)}"><strong>${escapeHTML(item.studentName)}</strong><span>${item.targetStartYear} Year ${item.targetYearLevel}</span><small>${statusLabel(item.advisorStatus)} · ${formatDate(item.updatedAt)}</small></button>`).join("") : "<p>还没有保存的评估。</p>"}`;
  } catch (error) {
    historyPanel.innerHTML = `<h2>历史评估</h2><p>${escapeHTML(error.message || "读取失败。")}</p>`;
  }
}

async function loadReport(id) {
  reportPanel.hidden = false;
  reportPanel.innerHTML = "<div class=\"assessment-loading\">正在读取报告...</div>";
  try {
    renderReport(await window.rewardSchoolApi.getStudentAssessment({ token: getToken(), assessmentId: id }));
  } catch (error) {
    reportPanel.innerHTML = `<div class="assessment-error">${escapeHTML(error.message || "报告读取失败。")}</div>`;
  }
}

function renderReport(report) {
  if (!report) return;
  currentReport = report;
  const profile = report.profile || {};
  const background = getReportBackground(report);
  const matches = report.matches || [];
  const canReview = hasAdvisorAccess(currentUser);
  reportPanel.hidden = false;
  reportPanel.innerHTML = `
    <div class="assessment-report-toolbar"><div><span>Reward School · 学生匹配报告</span><strong>${escapeHTML(report.request?.preferredName || report.request?.studentName || "学生")}</strong></div><button type="button" data-print-report>下载紧凑版 PDF</button></div>
    <section class="assessment-report-cover"><p class="eyebrow">Student Fit Report</p><h2>${escapeHTML(report.request?.studentName || "学生评估")}</h2><p>${escapeHTML(report.executiveSummary || "")}</p><div><span>目标：${report.request?.targetStartYear} Year ${report.request?.targetYearLevel}</span><span>学术指数：${formatScore(report.academicIndex)}</span><span>AEAS：${report.aeasIndex == null ? "待补" : formatScore(report.aeasIndex)}</span><span>画像：${profile.generatedByAi ? `DeepSeek ${escapeHTML(profile.model || "")}` : "结构化规则画像"}</span></div></section>
    <section class="assessment-background-card"><div class="assessment-section-heading"><span>01</span><div><h2>学生背景档案</h2><p>${escapeHTML(background.currentContext || "当前就读背景待补充。")}</p></div></div><div class="assessment-background-story"><strong>学生背景介绍</strong><p>${escapeHTML(background.personalStory || "未填写背景介绍。")}</p></div><div class="assessment-background-grid">${reportProfile("学习方式与性格", background.learningAndPersonality)}${reportProfile("活动经历与贡献", background.activitiesAndContribution)}${reportProfile("未来方向与家庭期待", background.goalsAndFamilyPriorities)}${reportProfile("住宿、独立生活与适应", background.accommodationAndWellbeing)}${reportProfile("需要单独说明的经历", background.specialContext)}${reportList("顾问需要重点关注", background.concerns)}</div><div class="assessment-background-tags">${renderBackgroundTags("兴趣与活动", background.interests)}${renderBackgroundTags("学生／家长自评优势", background.selfReportedStrengths)}</div><p class="assessment-evidence-note">${escapeHTML(background.evidenceNote || "背景来自学生／家长自述，正式申请前需复核。")}</p></section>
    <section class="assessment-profile-card"><div class="assessment-section-heading"><span>02</span><div><h2>综合学生画像</h2><p>${escapeHTML(profile.summary || "")}</p></div></div>${report.request?.aeas?.hasResult ? `<div class="assessment-background-story"><strong>AEAS 成绩证据</strong><p>${escapeHTML(aeasSummary(report.request.aeas))}</p></div>` : ""}<div class="assessment-profile-grid">${reportProfile("学术表现", profile.academicPattern)}${reportProfile("英文表现", profile.englishPattern)}${reportProfile("寄宿与适应", profile.boardingAndWellbeing)}${reportList("提炼优势", profile.strengths)}${reportList("风险", profile.risks)}${reportList("匹配重点", profile.fitPriorities)}</div></section>
    <section class="assessment-matches"><div class="assessment-section-heading"><span>03</span><div><h2>学校匹配结果</h2><p>成绩、AEAS/英文衔接、预算、住宿与性格由 AI 做可行性判断；仅性别冲突与公开不支持的目标 Year 会硬排除。结果用于顾问首轮选校，不代表录取概率。</p></div></div>${matches.map(renderSchoolMatch).join("") || "<p>没有可显示的学校。</p>"}</section>
    <section class="assessment-next-steps"><div class="assessment-section-heading"><span>04</span><div><h2>下一步</h2></div></div>${renderBullets(report.requiredNextSteps)}</section>
    ${(report.excludedNotes || []).length ? `<div class="assessment-excluded-screen"><details class="assessment-excluded"><summary>查看基础条件排除项</summary>${renderBullets(report.excludedNotes)}</details></div><section class="assessment-excluded assessment-excluded-print"><strong>基础条件排除项</strong>${renderBullets(report.excludedNotes)}</section>` : ""}
    <section class="assessment-method"><strong>方法与限制</strong><p>硬排除仅限：性别冲突，以及公开材料明确不支持的目标 Year。成绩缺口、AEAS/英文衔接（含 ELICOS/HSP/条件录取）、预算、住宿与性格适配由 AI 做可行性判断，并列出顾问向学校确认的清单；资料缺口与通用政策提醒不会单独抬高为否决。学校软线采用内部规划区间并标注置信度，不等同于学校官方最低录取线。实际位置与最新安排必须由顾问向学校确认。</p></section>
    ${canReview && report.id ? renderAdvisorReview(report) : report.advisorNotes ? `<section class="assessment-advisor-note"><strong>顾问意见</strong><p>${escapeHTML(report.advisorNotes)}</p></section>` : ""}
  `;
  reportPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function downloadMatchingReportPdf() {
  const button = reportPanel?.querySelector("[data-print-report]");
  if (!button || !currentReport) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "正在整理报告…";
  try {
    const blocks = [];
    const cover = reportPanel.querySelector(".assessment-report-cover");
    if (cover) blocks.push(cover.outerHTML);
    [".assessment-background-card", ".assessment-profile-card"].forEach((selector) => {
      const section = reportPanel.querySelector(selector);
      if (section) blocks.push(section.outerHTML);
    });
    const matches = reportPanel.querySelector(".assessment-matches");
    if (matches) {
      const heading = matches.querySelector(":scope > .assessment-section-heading");
      if (heading) blocks.push(`<section class="assessment-matches-heading">${heading.outerHTML}</section>`);
      matches.querySelectorAll(":scope > .assessment-school-match").forEach((match) => blocks.push(match.outerHTML));
    }
    [".assessment-next-steps", ".assessment-excluded-print", ".assessment-method", ".assessment-advisor-note"].forEach((selector) => {
      const section = reportPanel.querySelector(selector);
      if (section) blocks.push(section.outerHTML);
    });
    const studentName = currentReport.request?.preferredName || currentReport.request?.studentName || "学生";
    const generated = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short" }).format(new Date());
    const result = await window.rewardSchoolPdf.download({
      filename: `${studentName}-学校匹配报告-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: `${studentName} · 学校匹配报告`,
      subtitle: `Reward School · ${generated}`,
      filters: [
        currentReport.request?.targetStartYear ? `${currentReport.request.targetStartYear} 入学` : "",
        currentReport.request?.targetYearLevel ? `Year ${currentReport.request.targetYearLevel}` : "",
        `学术指数 ${formatScore(currentReport.academicIndex)}`,
      ],
      note: "本报告为顾问首轮学校匹配与复核材料，不代表学校录取承诺；最新要求、费用与位置须向学校确认。",
      blocks,
      escape: escapeHTML,
      css: `.assessment-report-cover,.assessment-background-card,.assessment-profile-card,.assessment-next-steps,.assessment-excluded,.assessment-method,.assessment-advisor-note,.assessment-matches-heading,.assessment-school-match{padding:12px;border:1px solid #dbe5f2;border-radius:9px;background:#fff;color:#193252}.assessment-report-cover{background:#071f49;color:#fff;border:0}.assessment-report-cover .eyebrow{color:#efb640}.assessment-report-cover h2{margin:4px 0 7px;color:#fff;font-size:22px}.assessment-report-cover p{margin:4px 0;font-size:9px;line-height:1.5}.assessment-report-cover>div{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.assessment-report-cover>div span{padding:3px 6px;border-radius:999px;background:#ffffff18;font-size:8px}.assessment-section-heading{display:flex;gap:9px;align-items:flex-start}.assessment-section-heading>span{display:grid;place-items:center;flex:0 0 24px;height:24px;border-radius:50%;background:#0b4b9d;color:#fff;font-size:9px;font-weight:800}.assessment-section-heading h2{margin:0;color:#071f49;font-size:16px}.assessment-section-heading p{margin:3px 0 0;color:#61738b;font-size:8px;line-height:1.45}.assessment-background-story{margin-top:8px;padding:7px;background:#f4f8fd;border-radius:6px}.assessment-background-story p,.assessment-profile-grid p,.assessment-background-grid p{margin:3px 0 0;font-size:8px;line-height:1.45}.assessment-background-grid,.assessment-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}.assessment-background-grid>div,.assessment-profile-grid>div{padding:7px;border:1px solid #e2e9f2;border-radius:6px}.assessment-background-tags{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.assessment-background-tags>div{padding:6px;background:#f4f8fd;border-radius:6px}.assessment-background-tags span{display:inline-block;margin:3px 3px 0 0;padding:2px 5px;border-radius:999px;background:#e7f0fb;font-size:7px}.assessment-evidence-note{margin:7px 0 0;color:#6c7c90;font-size:7px}.assessment-school-match header{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #dbe5f2;padding-bottom:6px}.assessment-school-match header span{color:#b67b0d;font-size:8px;font-weight:800}.assessment-school-match h3{margin:2px 0;color:#071f49;font-size:16px}.assessment-school-match header small,.assessment-risk{font-size:7px}.assessment-school-match>p,.assessment-pathway{font-size:8px;line-height:1.45}.assessment-dimensions{display:grid;grid-template-columns:1fr 1fr;gap:4px}.assessment-dimensions>div{padding:5px;background:#f4f8fd;border-radius:5px;font-size:7px}.assessment-dimensions i{display:block;height:3px;margin:3px 0;background:#0b4b9d}.assessment-match-columns{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px}.assessment-match-columns>div{padding:6px;border:1px solid #e2e9f2;border-radius:5px}.assessment-match-columns h4{margin:0 0 3px;font-size:9px}.assessment-match-columns p,.assessment-match-columns li,.assessment-next-steps li,.assessment-excluded li{font-size:7.5px;line-height:1.4}.assessment-match-columns ul,.assessment-next-steps ul,.assessment-excluded ul{margin:3px 0;padding-left:15px}.assessment-school-match footer{margin-top:6px;padding-top:5px;border-top:1px solid #e2e9f2;font-size:7px}.assessment-school-match footer a{display:none}.assessment-method p,.assessment-advisor-note p{margin:4px 0 0;font-size:7.5px;line-height:1.45}.assessment-advisor-review,.assessment-excluded-screen,button,input,select,textarea{display:none!important}`,
      onProgress: ({ phase, current, total }) => {
        button.textContent = phase === "render" ? `生成第 ${current} / ${total} 页…` : phase === "save" ? "正在下载…" : "正在紧凑排版…";
      },
    });
    button.textContent = `已下载 · ${result.pages} 页`;
    window.setTimeout(() => { if (button.isConnected) button.textContent = originalLabel; }, 2400);
  } catch (error) {
    console.error("Matching report PDF download failed:", error);
    button.textContent = error.message || "PDF 下载失败，请重试";
    window.setTimeout(() => { if (button.isConnected) button.textContent = originalLabel; }, 3200);
  } finally {
    button.disabled = false;
  }
}

function renderSchoolMatch(match) {
  const dimensions = match.dimensions || [];
  const checklist = match.advisorChecklist || match.nextQuestions || [];
  const pathway = match.englishPathway ? `<p class="assessment-pathway"><strong>英文路径：</strong>${escapeHTML(match.englishPathway)}${match.aeasFit ? ` · ${escapeHTML(match.aeasFit)}` : ""}${match.accommodationFit ? ` · 住宿：${escapeHTML(match.accommodationFit)}` : ""}${match.budgetFit ? ` · 预算：${escapeHTML(match.budgetFit)}` : ""}</p>` : "";
  const aiBadge = match.feasibilityByAi ? "<small>AI 可行性判断</small>" : "<small>结构化软判断兜底</small>";
  return `<article class="assessment-school-match category-${categoryKey(match.category)}"><header><div><span>${escapeHTML(match.category)}</span><h3>${escapeHTML(match.chineseName || match.schoolName)}</h3><small>${escapeHTML(match.schoolName)}</small></div><div class="assessment-risk">申请风险：${escapeHTML(match.riskLevel)}<small>资料可信度：${confidenceLabel(match.confidence)}</small>${aiBadge}</div></header><p>${escapeHTML(match.summary)}</p>${pathway}<div class="assessment-dimensions">${dimensions.map((item) => `<div><span>${escapeHTML(item.label)}</span><b>${formatScore(item.score)} / ${formatScore(item.maximum)}</b><i style="width:${Math.min(100, Number(item.score || 0) * 100 / Number(item.maximum || 1))}%"></i><small>${escapeHTML(item.explanation || "")}</small></div>`).join("")}</div><div class="assessment-match-columns"><div><h4>为什么适合</h4>${renderBullets(match.reasons)}</div><div><h4>需要注意</h4>${renderBullets(match.risks)}</div></div><div class="assessment-match-columns"><div><h4>顾问确认清单</h4>${renderBullets(checklist)}</div><div><h4>性格与氛围</h4><p>${escapeHTML(match.characterFit || "信息不足")}</p><p>${escapeHTML(match.environmentFit || "")}</p></div></div><footer><span>${escapeHTML(match.vacancyNote || "")}</span><div><a href="${escapeHTML(match.internationalAdmissionsUrl)}" target="_blank" rel="noopener">国际招生</a><a href="${escapeHTML(match.internationalFeesUrl)}" target="_blank" rel="noopener">国际学费</a><a href="advisor-school-detail.html?school=${encodeURIComponent(match.slug)}">学校详情</a></div></footer></article>`;
}

function confidenceLabel(value) {
  return ({ low: "初步判断", medium: "有一定依据", high: "依据较充分" })[normalize(value)] || escapeHTML(value || "待补资料");
}

function renderAdvisorReview(report) {
  return `<section class="assessment-advisor-review"><div class="assessment-section-heading"><span>05</span><div><h2>顾问审核</h2><p>审核后的意见会同步到学生报告。</p></div></div><label><span>状态</span><select data-review-status><option value="pending" ${report.advisorStatus === "pending" ? "selected" : ""}>待审核</option><option value="needs-information" ${report.advisorStatus === "needs-information" ? "selected" : ""}>需要补资料</option><option value="reviewed" ${report.advisorStatus === "reviewed" ? "selected" : ""}>已审核</option><option value="approved" ${report.advisorStatus === "approved" ? "selected" : ""}>批准发送</option></select></label><label><span>顾问意见</span><textarea data-review-notes rows="5" maxlength="6000">${escapeHTML(report.advisorNotes || "")}</textarea></label><button type="button" data-save-review>保存审核</button><p data-review-message></p></section>`;
}

async function saveAdvisorReview() {
  const note = reportPanel.querySelector("[data-review-message]");
  try {
    const updated = await window.rewardSchoolApi.reviewStudentAssessment({ token: getToken(), assessmentId: currentReport.id, advisorStatus: reportPanel.querySelector("[data-review-status]").value, advisorNotes: reportPanel.querySelector("[data-review-notes]").value });
    renderReport(updated);
  } catch (error) { note.textContent = error.message || "保存失败。"; }
}

function reportProfile(title, value) { return `<div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(value || "信息不足")}</p></div>`; }
function reportList(title, items) { return `<div><strong>${escapeHTML(title)}</strong>${renderBullets(items)}</div>`; }
function renderBackgroundTags(title, items) { return `<div><strong>${escapeHTML(title)}</strong><div>${(items || []).map((item) => `<span>${escapeHTML(item)}</span>`).join("") || "<span>待补</span>"}</div></div>`; }
function renderBullets(items) { return `<ul>${(items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("") || "<li>暂无</li>"}</ul>`; }

function getReportBackground(report) {
  const request = report.request || {};
  const background = report.background || {};
  const place = [request.currentCountry, request.currentCity].filter(Boolean).join("");
  return {
    currentContext: background.currentContext || `${request.preferredName || request.studentName || "学生"}目前在${place || "当前地区"}就读${request.currentSchool || "当前学校"}Year ${request.currentYearLevel || "?"}，计划${request.targetStartYear || "目标年份"}年进入Year ${request.targetYearLevel || "?"}。`,
    personalStory: background.personalStory || request.backgroundStory || "",
    learningAndPersonality: background.learningAndPersonality || `学习方式：${request.learningStyle || "待补"} 性格与适应：${request.personality || "待补"}`,
    activitiesAndContribution: background.activitiesAndContribution || `兴趣与活动：${(request.interests || []).join("、") || "待补"}。自评优势：${(request.strengths || []).join("、") || "待补"}。`,
    goalsAndFamilyPriorities: background.goalsAndFamilyPriorities || `未来方向：${request.futureGoals || "待补"} 家庭期待：${request.parentExpectations || "待补"}`,
    accommodationAndWellbeing: background.accommodationAndWellbeing || request.boardingReadiness || "待补",
    specialContext: background.specialContext || request.specialCircumstances || "未申报需要单独解释的特殊背景。",
    interests: background.interests || request.interests || [],
    selfReportedStrengths: background.selfReportedStrengths || request.strengths || [],
    concerns: background.concerns || request.concerns || [],
    evidenceNote: background.evidenceNote || "学生背景来自申请表中的学生／家长自述；正式申请前应以成绩单、教师评语、活动证明和顾问访谈复核。",
  };
}
function text(data, key) { return String(data.get(key) || "").trim(); }
function nullableText(data, key) { return text(data, key) || null; }
function number(data, key) { return Number(data.get(key) || 0); }
function nullableNumber(data, key) { const value = text(data, key); return value === "" ? null : Number(value); }
function nullableInputNumber(input) { const value = String(input?.value || "").trim(); return value === "" ? null : Number(value); }
function list(data, key) { return text(data, key).split(/[，,;；\n]/).map((item) => item.trim()).filter(Boolean); }
function normalize(value) { return String(value || "").replace(/[_-]/g, "").toLowerCase(); }
function categoryKey(value) { return value === "冲刺" ? "stretch" : value === "稳妥" ? "safe" : value === "暂不建议" ? "avoid" : "match"; }
function formatScore(value) { return Number(value || 0).toFixed(Number(value || 0) % 1 ? 1 : 0); }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeZone: "Australia/Sydney" }).format(date); }
function statusLabel(value) { return ({ pending: "待审核", reviewed: "已审核", approved: "已批准", "needs-information": "需补资料" })[value] || value; }
function setMessage(value, error) { message.textContent = value; message.classList.toggle("is-error", Boolean(error)); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
