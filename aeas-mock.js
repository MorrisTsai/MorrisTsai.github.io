const MOCK_STORAGE_KEY = "rewardSchoolAeasMockProgressV2";
const rawMathQuestionGroups = window.aeasMockMathQuestionsByType || {};
const rawReadingQuestionGroups = window.aeasMockReadingQuestionsByType || {};
const rawVocabularyQuestionGroups = window.aeasMockVocabularyQuestionsByType || {};
const rawGapFillingQuestionGroups = window.aeasMockGapFillingQuestionsByType || {};
const rawListeningQuestionGroups = window.aeasMockListeningQuestionsByType || {};
const rawWritingQuestionGroups = window.aeasMockWritingQuestionsByType || {};
const rawSpeakingQuestionGroups = window.aeasMockSpeakingQuestionsByType || {};
const rawNonVerbalQuestionGroups = window.aeasMockNonVerbalQuestionsByType || {};
const nonVerbalMeta = window.aeasMockNonVerbalMeta || {};
const pendingAiReviewKeys = new Set();
const AI_REVIEW_SESSION_COOLDOWN_MS = 60 * 1000;
const mathQuestionGroups = Object.fromEntries(
  Object.entries(rawMathQuestionGroups).map(([typeId, questions]) => [
    typeId,
    questions.map((question, index) => ({
      ...question,
      sourceNumber: question.number,
      number: index + 1,
    })),
  ])
);
const nonVerbalQuestionGroups = Object.fromEntries(
  Object.entries(rawNonVerbalQuestionGroups).map(([typeId, questions]) => [
    typeId,
    questions.map((question, index) => ({
      ...question,
      sourceNumber: question.sourceNumber || question.number,
      number: index + 1,
    })),
  ])
);
const nonVerbalTypes = Object.entries(nonVerbalMeta).map(([id, meta]) => ({
  id,
  title: meta.title,
  subtitle: meta.subtitle,
  questions: nonVerbalQuestionGroups[id] || [],
}));

const mockSubjects = [
  {
    id: "english",
    title: "English Language Proficiency",
    subtitle: "英语能力",
    description: "阅读、词汇、写作与英文表达基础诊断。",
    types: [
      { id: "reading", title: "Reading", subtitle: "阅读理解", questions: rawReadingQuestionGroups.reading || [] },
      { id: "vocabulary", title: "Vocabulary", subtitle: "词汇运用", questions: rawVocabularyQuestionGroups.vocabulary || [] },
      { id: "gap-filling", title: "Gap Filling", subtitle: "词汇填空", questions: rawGapFillingQuestionGroups["gap-filling"] || [] },
      { id: "grammar", title: "Language Use", subtitle: "语法与语言运用", questions: [] },
      { id: "listening", title: "Listening", subtitle: "听力理解", questions: [] },
      { id: "writing", title: "Writing", subtitle: "写作任务", questions: rawWritingQuestionGroups.writing || [] },
      { id: "speaking", title: "Speaking Interview", subtitle: "口语面试", questions: [] },
    ],
  },
  {
    id: "math",
    title: "Mathematical Reasoning",
    subtitle: "数学推理",
    description: "数字关系、文字题与逻辑运算诊断。数学题先按客观题流程记录和批改。",
    types: [
      { id: "number", title: "Number & Operations", subtitle: "数字与运算", questions: mathQuestionGroups.number || [] },
      { id: "algebra", title: "Algebra", subtitle: "代数推理", questions: mathQuestionGroups.algebra || [] },
      { id: "geometry", title: "Geometry", subtitle: "几何与测量", questions: mathQuestionGroups.geometry || [] },
      { id: "word-problems", title: "Word Problems", subtitle: "英文文字题", questions: mathQuestionGroups["word-problems"] || [] },
      { id: "data", title: "Data Interpretation", subtitle: "图表理解", questions: mathQuestionGroups.data || [] },
      { id: "logic", title: "Mathematical Logic", subtitle: "数学逻辑", questions: mathQuestionGroups.logic || [] },
    ],
  },
  {
    id: "non-verbal",
    title: "Non-Verbal General Ability",
    subtitle: "非语言综合能力",
    description: "图形规律、空间推理与模式识别诊断。Test 01 共 75 题，含图形选项与填空题。",
    types: nonVerbalTypes.length
      ? nonVerbalTypes
      : [
          { id: "patterns", title: "图形规律", subtitle: "Pattern Reasoning", questions: [] },
          { id: "sequence", title: "序列判断", subtitle: "Sequence Logic", questions: [] },
          { id: "matrices", title: "矩阵推理", subtitle: "Figure Matrices", questions: [] },
          { id: "analogies", title: "图形类比", subtitle: "Figure Analogies", questions: [] },
          { id: "classification", title: "图形分类", subtitle: "Classification", questions: [] },
          { id: "rotation", title: "旋转与折叠", subtitle: "Rotation & Folding", questions: [] },
          { id: "spatial", title: "空间推理", subtitle: "Spatial Reasoning", questions: [] },
        ],
  },
];

mockSubjects.forEach((subject) => {
  subject.types = subject.types.filter((type) => type.id !== "grammar");
});

const englishSubject = mockSubjects.find((subject) => subject.id === "english");
const listeningType = englishSubject?.types.find((type) => type.id === "listening");
if (listeningType) listeningType.questions = rawListeningQuestionGroups.listening || [];
const speakingType = englishSubject?.types.find((type) => type.id === "speaking");
if (speakingType) speakingType.questions = rawSpeakingQuestionGroups.speaking || [];

const mockApp = document.querySelector("[data-mock-app]");
const mockStage = document.querySelector("[data-mock-stage]");
const mockBreadcrumb = document.querySelector("[data-mock-breadcrumb]");
const mockProgressPanel = document.querySelector("[data-mock-progress]");

let mockState = {
  gradeBand: null,
  subjectId: null,
  typeId: null,
  questionIndex: null,
};

let mockProgress = loadProgress();
let writingTimerInterval = null;
let activeSpeakingRecorder = null;
let activeSpeakingStream = null;
let activeSpeakingChunks = [];
let activeSpeakingKey = "";
let speakingAudioContext = null;
let speakingAnalyser = null;
let speakingMeterSource = null;
let speakingMeterFrame = null;
const speakingRecordings = new Map();

function createSessionId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 8);
  return `aeas_${date}_${random}`;
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || "null");
    if (saved?.sessionId && saved.answers) return saved;
  } catch (error) {
    // Ignore corrupted local storage and start fresh.
  }

  return {
    sessionId: createSessionId(),
    startedAt: new Date().toISOString(),
    answers: {},
    timers: {},
  };
}

function saveProgress() {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockProgress));
}

function resetProgress() {
  speakingRecordings.forEach((recording) => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
  });
  speakingRecordings.clear();
  mockProgress = {
    sessionId: createSessionId(),
    startedAt: new Date().toISOString(),
    answers: {},
    timers: {},
  };
  saveProgress();
  setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
}

function findSubject(subjectId) {
  return mockSubjects.find((subject) => subject.id === subjectId);
}

function findType(subject, typeId) {
  return subject?.types.find((type) => type.id === typeId);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatQuestionText(value) {
  return String(value || "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\(\s*(\d+)\s+(\d+)\s*\)/g, "($1/$2)")
    .replace(/([A-Za-z])\+([0-9])/g, "$1 + $2")
    .replace(/([0-9])([A-Z])\b/g, "$1 $2")
    .replace(/([’'])\s+s\b/g, "$1s")
    .replace(/\s+/g, " ")
    .trim();
}

function getQuestionKey(subjectId, typeId, questionIndex) {
  return `${subjectId}.${typeId}.${questionIndex}`;
}

function clearWritingTimerInterval() {
  if (writingTimerInterval) {
    window.clearInterval(writingTimerInterval);
    writingTimerInterval = null;
  }
}

function parseDurationSeconds(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number(match[1]) * 60 : 30 * 60;
}

function getWordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatTimerSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ensureQuestionTimer(subjectId, typeId, questionIndex, durationSeconds) {
  const key = getQuestionKey(subjectId, typeId, questionIndex);
  mockProgress.timers = mockProgress.timers || {};
  if (!mockProgress.timers[key]) {
    mockProgress.timers[key] = {
      startedAt: new Date().toISOString(),
      durationSeconds,
    };
    saveProgress();
  }
  return mockProgress.timers[key];
}

function getTimerRemainingSeconds(timer) {
  const elapsed = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
  return Math.max(0, timer.durationSeconds - elapsed);
}

function getQuestionNumbers(type) {
  return getQuestions(type).map((question) => question.number);
}

function getQuestions(type) {
  return Array.isArray(type.questions) ? type.questions : [];
}

function getQuestion(type, questionIndex) {
  return getQuestions(type).find((question) => question.number === questionIndex);
}

function getQuestionAnswerType(question) {
  return question?.answerType || "choice";
}

function normalizeInputAnswer(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\b(a|an|the|their|own)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inputAnswerContains(answer, phrase) {
  const normalizedAnswer = ` ${normalizeInputAnswer(answer)} `;
  const normalizedPhrase = normalizeInputAnswer(phrase);
  return Boolean(normalizedPhrase) && normalizedAnswer.includes(` ${normalizedPhrase} `);
}

function evaluateInputAnswer(recordAnswer, correctAnswer, question) {
  const userValues = parseStoredInputAnswer(recordAnswer);
  const correctValues = parseStoredInputAnswer(correctAnswer);
  const fieldIds = (question.inputFields || [{ id: "answer" }]).map((field) => field.id);
  const localMarking = question.localMarking || {};

  const exactCorrect = fieldIds.every((fieldId) => {
    const acceptedValues = Array.isArray(correctValues[fieldId]) ? correctValues[fieldId] : [correctValues[fieldId]];
    return acceptedValues.some((acceptedValue) => normalizeInputAnswer(userValues[fieldId]) === normalizeInputAnswer(acceptedValue));
  });
  if (exactCorrect) return { correct: true, needsReview: false };

  const combinedAnswer = fieldIds.map((fieldId) => userValues[fieldId] || "").join(" ");
  if (!normalizeInputAnswer(combinedAnswer)) return { correct: false, needsReview: false };

  if (Array.isArray(localMarking.requiredAll) && localMarking.requiredAll.length) {
    const matchedCount = localMarking.requiredAll.filter((part) => inputAnswerContains(combinedAnswer, part)).length;
    if (matchedCount === localMarking.requiredAll.length) return { correct: true, needsReview: false };
    if (localMarking.reviewIfPartial && matchedCount > 0) return { correct: false, needsReview: true };
  }

  if (Array.isArray(localMarking.acceptedAny) && localMarking.acceptedAny.length) {
    const matchedAny = localMarking.acceptedAny.some((part) => inputAnswerContains(combinedAnswer, part));
    if (matchedAny) return { correct: true, needsReview: false };
  }

  return { correct: false, needsReview: false };
}

function normalizeChoiceAnswer(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function parseStoredInputAnswer(answer) {
  if (!answer) return {};
  try {
    const parsed = JSON.parse(answer);
    return typeof parsed === "object" && parsed ? parsed : { answer };
  } catch (error) {
    return { answer };
  }
}

function formatStoredAnswer(answer, question) {
  const answerType = getQuestionAnswerType(question);
  if (!answer) return "-";
  if (answerType === "input") {
    const values = parseStoredInputAnswer(answer);
    const fields = question?.inputFields || Object.keys(values).map((id) => ({ id }));
    return fields
      .map((field) => {
        const rawValue = values[field.id];
        const value = Array.isArray(rawValue) ? rawValue.join(" / ") : String(rawValue || "").trim();
        if (field.type === "textarea" && value.length > 160) {
          return `${value.slice(0, 160)}...`;
        }
        return value;
      })
      .filter(Boolean)
      .join(" / ") || "-";
  }
  if (answerType === "multiChoice") {
    return String(answer)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
  }
  return answer;
}

function isAnswerGradable(correctAnswer) {
  return Boolean(correctAnswer);
}

function isAiReviewQuestion(question) {
  return question?.reviewMode === "ai";
}

function compareAnswers(recordAnswer, correctAnswer, question) {
  if (!isAnswerGradable(correctAnswer)) return null;

  const answerType = getQuestionAnswerType(question);
  if (answerType === "input") {
    return evaluateInputAnswer(recordAnswer, correctAnswer, question).correct;
  }

  if (answerType === "multiChoice") {
    const user = String(recordAnswer)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    const correct = String(correctAnswer)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return user === correct;
  }

  return recordAnswer === correctAnswer;
}

function getCorrectAnswer(type, questionIndex) {
  const question = getQuestion(type, questionIndex);
  if (!question) return "";
  if (getQuestionAnswerType(question) === "input") {
    return question.correctAnswer || "";
  }
  return question.correctAnswer || "";
}

function getQuestionRecord(subjectId, typeId, questionIndex) {
  return mockProgress.answers[getQuestionKey(subjectId, typeId, questionIndex)];
}

function getAllQuestionKeys() {
  return mockSubjects.flatMap((subject) =>
    subject.types.flatMap((type) =>
      getQuestionNumbers(type).map((number) => getQuestionKey(subject.id, type.id, number))
    )
  );
}

function getTypeStats(subject, type) {
  const records = getQuestionNumbers(type).map((number) => getQuestionRecord(subject.id, type.id, number));
  const attempted = records.filter(Boolean).length;
  const graded = records.filter((record) => record?.graded).length;
  const correct = records.filter((record) => record?.graded && record.correct).length;
  return { attempted, graded, correct, total: getQuestionNumbers(type).length };
}

function getSubjectStats(subject) {
  return subject.types.reduce(
    (totals, type) => {
      const stats = getTypeStats(subject, type);
      return {
        attempted: totals.attempted + stats.attempted,
        graded: totals.graded + stats.graded,
        correct: totals.correct + stats.correct,
        total: totals.total + stats.total,
      };
    },
    { attempted: 0, graded: 0, correct: 0, total: 0 }
  );
}

function gradeSubjectAnswers(subject) {
  subject.types.forEach((type) => {
    getQuestionNumbers(type).forEach((number) => {
      const key = getQuestionKey(subject.id, type.id, number);
      const record = mockProgress.answers[key];
      if (!record?.answer) return;

      const correctAnswer = getCorrectAnswer(type, number);
      const question = getQuestion(type, number);
      if (isAiReviewQuestion(question)) return;
      const canGrade = isAnswerGradable(correctAnswer);
      const result =
        canGrade && getQuestionAnswerType(question) === "input"
          ? evaluateInputAnswer(record.answer, correctAnswer, question)
          : { correct: canGrade ? compareAnswers(record.answer, correctAnswer, question) : null, needsReview: false };
      mockProgress.answers[key] = {
        ...record,
        graded: canGrade,
        correct: result.correct,
        needsReview: result.needsReview,
        correctAnswer,
        updatedAt: new Date().toISOString(),
      };
    });
  });
  saveProgress();
}

function getOverallStats() {
  const keys = getAllQuestionKeys();
  const records = keys.map((key) => mockProgress.answers[key]);
  const attempted = records.filter(Boolean).length;
  const graded = records.filter((record) => record?.graded).length;
  const correct = records.filter((record) => record?.graded && record.correct).length;
  return { attempted, graded, correct, total: keys.length };
}

function setMockState(nextState) {
  mockState = { ...mockState, ...nextState };
  renderMockApp();
}

function renderBreadcrumb(subject, type) {
  if (!mockBreadcrumb) return;

  const parts = ["年级"];
  if (mockState.gradeBand) parts.push(mockState.gradeBand === "10-12" ? "10-12 年级" : "7-9 年级");
  if (subject) parts.push(subject.subtitle);
  if (type) parts.push(type.subtitle);
  if (mockState.questionIndex) parts.push(`第 ${mockState.questionIndex} 题`);
  mockBreadcrumb.textContent = parts.join(" / ");
}

function renderProgressPanel() {
  if (!mockProgressPanel) return;

  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  const overall = getOverallStats();
  const currentTypeStats = subject && type ? getTypeStats(subject, type) : null;

  mockProgressPanel.innerHTML = `
    <div class="mock-progress-card">
      <span>Session</span>
      <strong>${mockProgress.sessionId}</strong>
    </div>
    <div class="mock-progress-card">
      <span>整体做题情况</span>
      <strong>${overall.attempted}/${overall.total}</strong>
      <small>已批改 ${overall.graded} 题 · 正确 ${overall.correct} 题</small>
    </div>
    ${
      currentTypeStats
        ? `
          <div class="mock-progress-card">
            <span>当前题型</span>
            <strong>${currentTypeStats.attempted}/${currentTypeStats.total}</strong>
            <small>正确 ${currentTypeStats.correct} 题</small>
          </div>
        `
        : ""
    }
    <button class="mock-reset-button" type="button" data-reset-practice>重新练习</button>
  `;
}

function renderGradeBandList() {
  if (!mockStage) return;
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <p class="eyebrow">Step 01</p>
      <h3>选择模拟测试年级</h3>
      <p>请选择要练习的 AEAS 模拟测试年级段。目前 10-12 年级题库已开放部分科目，7-9 年级题库正在整理中。</p>
    </div>
    <div class="mock-card-grid">
      <button class="mock-select-card is-disabled" type="button" data-grade-band="7-9">
        <span>7-9 年级</span>
        <strong>AEAS 7-9 Mock Test</strong>
        <small>题库、答案与讲解正在整理中。</small>
        <em>施工中</em>
      </button>
      <button class="mock-select-card" type="button" data-grade-band="10-12">
        <span>10-12 年级</span>
        <strong>AEAS 10-12 Mock Test</strong>
        <small>进入 English、Mathematical Reasoning 与 Non-Verbal General Ability 科目练习。</small>
        <em>进入题库</em>
      </button>
    </div>
  `;
}

function renderGradeConstruction() {
  if (!mockStage) return;
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="grades">返回年级选择</button>
      <p class="eyebrow">7-9 Mock Test</p>
      <h3>7-9 年级模拟测试正在施工中</h3>
      <p>我们正在整理 7-9 年级的题库、答案与讲解。上线后会和 10-12 年级一样，按科目、题型与题号进入练习，并记录做题情况。</p>
    </div>
    <div class="mock-construction-card">
      <strong>施工中</strong>
      <span>目前尚未开放作答。请先使用 10-12 年级已上线的题库流程，或等待 7-9 年级题库补齐。</span>
    </div>
  `;
}

function renderSubjectList() {
  if (!mockStage) return;
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="grades">返回年级选择</button>
      <p class="eyebrow">Step 02</p>
      <h3>选择测试科目</h3>
      <p>选择科目与题型后进入题号列表。做题情况会记录在当前浏览器，完成后可查看批改结果与逐题详解。</p>
    </div>
    <div class="mock-card-grid">
      ${mockSubjects
        .map((subject) => {
          const total = subject.types.reduce((sum, type) => sum + getQuestionNumbers(type).length, 0);
          const attempted = subject.types.reduce((sum, type) => sum + getTypeStats(subject, type).attempted, 0);
          return `
            <button class="mock-select-card" type="button" data-subject="${subject.id}">
              <span>${subject.subtitle}</span>
              <strong>${subject.title}</strong>
              <small>${subject.description}</small>
              <em>${attempted}/${total} 已做</em>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTypeList(subject) {
  if (!mockStage) return;
  const subjectStats = getSubjectStats(subject);
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="subjects">返回科目</button>
      <div class="mock-stage-title-row">
        <div>
          <p class="eyebrow">Step 03</p>
          <h3>${subject.title}</h3>
          <p>${subject.description}</p>
        </div>
        <button class="mock-review-button" type="button" data-review-subject="${subject.id}">
          批改 / 查看结果
          <span>${subjectStats.correct}/${subjectStats.total} 正确 · 已做 ${subjectStats.attempted}</span>
        </button>
      </div>
    </div>
    <div class="mock-card-grid">
      ${subject.types
        .map((type) => {
          const stats = getTypeStats(subject, type);
          const hasQuestions = stats.total > 0;
          return `
            <button class="mock-select-card ${hasQuestions ? "" : "is-disabled"}" type="button" ${
              hasQuestions ? `data-type="${type.id}"` : "disabled"
            }>
              <span>${type.subtitle}</span>
              <strong>${type.title}</strong>
              <small>${hasQuestions ? `${stats.total} 道练习题` : "题库整理中，暂未开放作答"}</small>
              <em>${hasQuestions ? `${stats.attempted}/${stats.total} 已做 · 正确 ${stats.correct}` : "施工中"}</em>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSubjectReview(subject) {
  const stats = getSubjectStats(subject);
  const reviewTypes = subject.types.filter((type) => getQuestionNumbers(type).length);
  const filters = reviewTypes
    .map(
      (type) => `
        <label class="mock-review-filter-chip">
          <input type="checkbox" value="${type.id}" data-review-filter checked />
          <span>${type.title}</span>
        </label>
      `
    )
    .join("");
  const rows = subject.types
    .flatMap((type) =>
      getQuestionNumbers(type).map((number) => {
        const record = getQuestionRecord(subject.id, type.id, number);
        const question = getQuestion(type, number);
        const isAiQuestion = isAiReviewQuestion(question);
        const status = isAiQuestion
          ? !record
            ? "未作答"
            : "已做"
          : !record
            ? "未作答"
            : !record.graded
              ? "未批改"
              : record.correct
                ? "正确"
                : "错误";
        const statusClass = isAiQuestion
          ? record
            ? "is-pending"
            : ""
          : !record
            ? ""
            : !record.graded
              ? "is-pending"
              : record.correct
                ? "is-correct"
                : "is-wrong";
        const answer = formatStoredAnswer(record?.answer, question);
        const correctAnswer = isAiQuestion
          ? hasSuccessfulAiReview(record)
            ? "AI feedback"
            : "AI pending"
          : isAnswerGradable(getCorrectAnswer(type, number))
            ? formatStoredAnswer(getCorrectAnswer(type, number), question)
            : "待补充";
        const detailId = `${subject.id}-${type.id}-${number}`;
        const detailContent = isAiQuestion ? renderAiFeedbackDetail(record) : escapeHTML(question?.explanation || "这道题暂无详解。");
        return `
          <tr data-review-question-row data-review-type="${type.id}" data-attempted="${record ? "1" : "0"}" data-graded="${record?.graded ? "1" : "0"}" data-correct="${record?.correct ? "1" : "0"}">
            <td>${type.title}</td>
            <td>第 ${number} 题</td>
            <td>${escapeHTML(answer)}</td>
            <td>${escapeHTML(correctAnswer)}</td>
            <td><span class="mock-review-status ${statusClass}">${status}</span></td>
            <td><button class="mock-detail-button" type="button" data-toggle-detail="${detailId}">详解</button></td>
          </tr>
          <tr class="mock-detail-row" data-detail-row="${detailId}" data-review-type="${type.id}" hidden>
            <td colspan="6">${detailContent}</td>
          </tr>
        `;
      })
    )
    .join("");

  return `
    <div class="mock-review-overlay" data-review-overlay>
      <div class="mock-review-dialog" role="dialog" aria-modal="true" aria-label="${subject.subtitle} 批改结果">
        <div class="mock-review-header">
          <div>
            <p class="eyebrow">Subject Review</p>
            <h3>${subject.title}</h3>
            <p data-review-headline>已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题，正确 ${stats.correct} 题。</p>
          </div>
          <button class="mock-review-close" type="button" data-close-review>关闭</button>
        </div>
        <details class="mock-review-filter-dropdown">
          <summary>
            <span>Question type filter</span>
            <strong data-review-filter-summary>All question types</strong>
          </summary>
          <div class="mock-review-filter-menu">
            <label class="mock-review-filter-chip is-select-all">
              <input type="checkbox" data-review-filter-all checked />
              <span>Select all</span>
            </label>
            ${filters}
          </div>
        </details>
        <div class="mock-review-summary">
          <span>完成率 <strong data-review-attempted>${stats.attempted}/${stats.total}</strong></span>
          <span>批改率 <strong data-review-graded>${stats.graded}/${stats.total}</strong></span>
          <span>正确题数 <strong data-review-correct>${stats.correct}</strong></span>
        </div>
        <div class="mock-review-table-wrap">
          <table class="mock-review-table">
            <thead>
              <tr>
                <th>题型</th>
                <th>题号</th>
                <th>你的答案</th>
                <th>正确答案</th>
                <th>结果</th>
                <th>详解</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openSubjectReview(subjectId) {
  const subject = findSubject(subjectId);
  if (!subject) return;
  gradeSubjectAnswers(subject);
  renderMockApp();
  renderProgressPanel();
  document.body.insertAdjacentHTML("beforeend", renderSubjectReview(subject));
}

function closeSubjectReview() {
  document.querySelector("[data-review-overlay]")?.remove();
  renderMockApp();
}

function renderAiFeedbackDetail(record) {
  const reviews = Array.isArray(record?.aiReviews) ? record.aiReviews.filter((review) => !review.error) : [];
  if (!reviews.length) {
    return "这道写作题暂无 AI 反馈。提交并批改后，反馈会显示在这里。";
  }

  return reviews
    .map(
      (review) => `
        <div class="mock-ai-detail">
          <h4>${escapeHTML(review.modelLabel || review.model || "AI Review")} · ${escapeHTML(review.total)}/20 · ${escapeHTML(review.level)}</h4>
          <p>${escapeHTML(review.overall_feedback || "")}</p>
          <strong>Top improvements</strong>
          ${renderListItems(review.top_3_improvements, "暂无修改建议。")}
        </div>
      `
    )
    .join("");
}

function updateReviewFilters(overlay) {
  const filterInputs = [...overlay.querySelectorAll("[data-review-filter]")];
  const selectAllInput = overlay.querySelector("[data-review-filter-all]");
  const checkedInputs = filterInputs.filter((input) => input.checked);
  const selectedTypes = new Set(checkedInputs.map((input) => input.value));
  const rows = [...overlay.querySelectorAll("[data-review-question-row]")];
  const visibleRows = [];

  rows.forEach((row) => {
    const visible = selectedTypes.has(row.dataset.reviewType);
    row.hidden = !visible;
    const detailRow = overlay.querySelector(`[data-detail-row="${row.querySelector("[data-toggle-detail]")?.dataset.toggleDetail}"]`);
    if (detailRow) detailRow.hidden = true;
    if (visible) visibleRows.push(row);
  });

  const attempted = visibleRows.filter((row) => row.dataset.attempted === "1").length;
  const graded = visibleRows.filter((row) => row.dataset.graded === "1").length;
  const correct = visibleRows.filter((row) => row.dataset.correct === "1").length;
  const total = visibleRows.length;
  const summaryTotal = total || 0;

  const headline = overlay.querySelector("[data-review-headline]");
  const attemptedNode = overlay.querySelector("[data-review-attempted]");
  const gradedNode = overlay.querySelector("[data-review-graded]");
  const correctNode = overlay.querySelector("[data-review-correct]");
  const filterSummary = overlay.querySelector("[data-review-filter-summary]");

  if (headline) headline.textContent = `已做 ${attempted}/${summaryTotal} 题，已批改 ${graded} 题，正确 ${correct} 题。`;
  if (attemptedNode) attemptedNode.textContent = `${attempted}/${summaryTotal}`;
  if (gradedNode) gradedNode.textContent = `${graded}/${summaryTotal}`;
  if (correctNode) correctNode.textContent = `${correct}`;
  if (selectAllInput) {
    selectAllInput.checked = checkedInputs.length === filterInputs.length;
    selectAllInput.indeterminate = checkedInputs.length > 0 && checkedInputs.length < filterInputs.length;
  }
  if (filterSummary) {
    filterSummary.textContent =
      checkedInputs.length === filterInputs.length
        ? "All question types"
        : checkedInputs.length
          ? `${checkedInputs.length} selected`
          : "No question types selected";
  }
}

function hasSuccessfulAiReview(record) {
  return Array.isArray(record?.aiReviews) && record.aiReviews.some((review) => !review.error && Number.isFinite(Number(review.total)));
}

function hasPendingAiReview() {
  return pendingAiReviewKeys.size > 0;
}

function getQuestionStatusClass(record, question) {
  if (!record) return "";
  if (question?.speakingMode) return "is-attempted";
  if (isAiReviewQuestion(question)) return "is-attempted";
  if (!record.graded) return "is-attempted";
  if (record.needsReview) return "is-attempted";
  return record.correct ? "is-correct" : "is-wrong";
}

function getQuestionStatusText(record, question) {
  if (!record) return "未作答";
  if (question?.speakingMode === "warmup-recording") return "已录音";
  if (question?.speakingMode === "monologue") return record.answer === "completed" ? "已完成" : "进行中";
  if (question?.speakingMode === "picture-response") return record.answer === "completed" ? "已完成" : "进行中";
  if (isAiReviewQuestion(question)) return "已做";
  if (!record.graded) return "已作答";
  return record.correct ? "正确" : "错误";
}

function getQuestionGroups(type) {
  const groups = [];
  const groupMap = new Map();

  getQuestions(type).forEach((question) => {
    const groupTitle = question.listeningTitle || question.passageTitle || "Practice Set";
    if (!groupMap.has(groupTitle)) {
      const group = { title: groupTitle, questions: [] };
      groupMap.set(groupTitle, group);
      groups.push(group);
    }
    groupMap.get(groupTitle).questions.push(question);
  });

  return groups;
}

function getQuestionGroupStats(subject, type, questions) {
  return questions.reduce(
    (summary, question) => {
      const record = getQuestionRecord(subject.id, type.id, question.number);
      summary.total += 1;
      if (record?.answer) summary.attempted += 1;
      if (record?.graded) summary.graded += 1;
      if (record?.correct) summary.correct += 1;
      return summary;
    },
    { total: 0, attempted: 0, graded: 0, correct: 0 },
  );
}

function shouldGroupQuestionList(type) {
  return ["reading", "listening"].includes(type.id) && getQuestions(type).some((question) => question.passageTitle || question.listeningGroupId);
}

function renderQuestionList(subject, type) {
  if (!mockStage) return;
  const stats = getTypeStats(subject, type);
  const questionNumbers = getQuestionNumbers(type);

  if (!questionNumbers.length) {
    mockStage.innerHTML = `
      <div class="mock-stage-heading">
        <button class="mock-back" type="button" data-reset="types">返回题型</button>
        <p class="eyebrow">Step 04</p>
        <h3>${type.subtitle} / ${type.title}</h3>
        <p>这个题型的题库正在整理中，目前暂未开放作答。</p>
      </div>
      <div class="mock-construction-card">
        <strong>施工中</strong>
        <span>题目、答案与讲解补齐后，这里会显示题号列表与做题记录。</span>
      </div>
    `;
    return;
  }

  if (type.id === "listening" && shouldGroupQuestionList(type)) {
    const listeningGroups = getQuestionGroups(type);
    const groupListMarkup = `
      <div class="mock-reading-group-list">
        ${listeningGroups
          .map((group) => {
            const groupStats = getQuestionGroupStats(subject, type, group.questions);
            const firstQuestion = group.questions[0];
            return `
              <section class="mock-reading-group mock-listening-group-card">
                <div class="mock-reading-group-header">
                  <div>
                    <span>Listening Test</span>
                    <h4>${escapeHTML(group.title)}</h4>
                    <p>${groupStats.attempted}/${groupStats.total} 已做 · 已批改 ${groupStats.graded} 题 · 正确 ${groupStats.correct} 题</p>
                  </div>
                  <em>${groupStats.total} 题</em>
                </div>
                <p class="mock-listening-group-intro">进入后会先看到完整题目与音频播放器。建议先读完 1-12 题，再点击播放作答。</p>
                <button class="button primary" type="button" data-question="${firstQuestion.number}">进入听力题组</button>
              </section>
            `;
          })
          .join("")}
      </div>
    `;

    mockStage.innerHTML = `
      <div class="mock-stage-heading">
        <button class="mock-back" type="button" data-reset="types">返回题型</button>
        <p class="eyebrow">Step 04</p>
        <h3>${type.subtitle} / ${type.title}</h3>
        <p>请先进入题组浏览所有题目，再播放音频作答。本题型已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题。</p>
      </div>
      <div class="mock-construction-card mock-listening-test-note">
        <strong>完整听力套题结构</strong>
        <span>Listening Text One、Two、Three 合起来是一套完整听力测验。当前页面支持单篇分开练习；未来做整套模拟考时，会按这三段难度与题型组合完整呈现。</span>
      </div>
      ${groupListMarkup}
    `;
    return;
  }

  if (type.id === "speaking") {
    const speakingSections = [
      {
        id: "warmup",
        label: "Type 01",
        title: "Warm-up Questions",
        note: "Not scored. Students record short answers and listen back for clarity.",
        questions: getQuestions(type).filter((question) => question.speakingMode === "warmup-recording"),
      },
      {
        id: "monologue",
        label: "Type 02",
        title: "Monologue + Follow-up",
        note: "Scored after the main response and three randomly selected follow-up questions are all recorded.",
        questions: getQuestions(type).filter((question) => question.speakingMode === "monologue"),
      },
      {
        id: "listening-response",
        label: "Type 03",
        title: "Picture-based Questions",
        note: "Students describe an image and answer all follow-up questions. Scoring will use a hidden image description.",
        questions: getQuestions(type).filter((question) => question.speakingMode === "picture-response"),
      },
    ];

    const sectionMarkup = speakingSections
      .map((section) => {
        const sectionStats = getQuestionGroupStats(subject, type, section.questions);
        const questionButtons = section.questions.length
          ? `
            <div class="mock-question-grid is-compact">
              ${section.questions
                .map((question) => {
                  const record = getQuestionRecord(subject.id, type.id, question.number);
                  return `
                    <button class="mock-question-button ${getQuestionStatusClass(record, question)}" type="button" data-question="${question.number}">
                      <span>${getQuestionStatusText(record, question)}</span>
                      <strong>${question.number}</strong>
                    </button>
                  `;
                })
                .join("")}
            </div>
          `
          : `<div class="mock-speaking-coming-soon">In preparation</div>`;

        return `
          <section class="mock-reading-group mock-speaking-type-group">
            <div class="mock-reading-group-header">
              <div>
                <span>${section.label}</span>
                <h4>${section.title}</h4>
                <p>${section.note}</p>
              </div>
              <em>${section.questions.length ? `${sectionStats.attempted}/${sectionStats.total}` : "Soon"}</em>
            </div>
            ${questionButtons}
          </section>
        `;
      })
      .join("");

    mockStage.innerHTML = `
      <div class="mock-stage-heading">
        <button class="mock-back" type="button" data-reset="types">返回题型</button>
        <p class="eyebrow">Step 04</p>
        <h3>Speaking Interview</h3>
        <p>口说练习分成三个类型：Warm-up 不评分，Monologue 完成主答与随机追问后再整体评分，Picture-based Questions 根据图片逐题作答。</p>
      </div>
      <div class="mock-reading-group-list">
        ${sectionMarkup}
      </div>
    `;
    return;
  }

  const questionListMarkup = shouldGroupQuestionList(type)
    ? `
      <div class="mock-reading-group-list">
        ${getQuestionGroups(type)
          .map((group) => {
            const groupStats = getQuestionGroupStats(subject, type, group.questions);
            return `
              <section class="mock-reading-group">
                <div class="mock-reading-group-header">
                  <div>
                    <span>Reading Text</span>
                    <h4>${escapeHTML(group.title)}</h4>
                    <p>${groupStats.attempted}/${groupStats.total} 已做 · 已批改 ${groupStats.graded} 题 · 正确 ${groupStats.correct} 题</p>
                  </div>
                  <em>${groupStats.total} 题</em>
                </div>
                <div class="mock-question-grid is-compact">
                  ${group.questions
                    .map((question) => {
                      const record = getQuestionRecord(subject.id, type.id, question.number);
                      return `
                        <button class="mock-question-button ${getQuestionStatusClass(record, question)}" type="button" data-question="${question.number}">
                          <span>${getQuestionStatusText(record, question)}</span>
                          <strong>${question.number}</strong>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    `
    : `
      <div class="mock-question-grid">
        ${questionNumbers
          .map((number) => {
            const record = getQuestionRecord(subject.id, type.id, number);
            const question = getQuestion(type, number);
            return `
              <button class="mock-question-button ${getQuestionStatusClass(record, question)}" type="button" data-question="${number}">
                <span>${getQuestionStatusText(record, question)}</span>
                <strong>${number}</strong>
              </button>
            `;
          })
          .join("")}
      </div>
    `;

  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="types">返回题型</button>
      <p class="eyebrow">Step 04</p>
      <h3>${type.subtitle} / ${type.title}</h3>
      <p>请选择题号进入练习。本题型已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题。</p>
    </div>
    ${questionListMarkup}
  `;
}

function getAnswerOptions(question) {
  if (Array.isArray(question?.options) && question.options.length) {
    return question.options.map((option) => [option.value, option.label, option.image || ""]);
  }

  return [];
}

function getAnswerPanelHeading(question) {
  const answerType = getQuestionAnswerType(question);
  if (isAiReviewQuestion(question)) return "Write Essay";
  if (answerType === "input") return "Write Answer";
  if (answerType === "multiChoice") return `Choose ${question.maxSelections || 2} Answers`;
  return "Select Answer";
}

function renderWordBank(question) {
  if (!Array.isArray(question?.wordBank) || !question.wordBank.length) return "";

  return `
    <div class="mock-word-bank" aria-label="词汇选项">
      ${question.wordBank
        .map(
          (item) => `
            <span>
              <strong>${escapeHTML(item.value)}</strong>
              ${escapeHTML(item.label)}
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderAnswerOptions(question, record, correctAnswer) {
  const answerType = getQuestionAnswerType(question);

  if (answerType === "input") {
    const fields = question.inputFields || [{ id: "answer", label: "答案", type: "number" }];
    const saved = parseStoredInputAnswer(record?.answer);
    return `
      <div class="mock-input-fields">
        ${fields
          .map((field) => {
            const value = saved[field.id] || "";
            const acceptedValues = Array.isArray(parseStoredInputAnswer(correctAnswer)[field.id])
              ? parseStoredInputAnswer(correctAnswer)[field.id]
              : [parseStoredInputAnswer(correctAnswer)[field.id]];
            const gradedClass =
              record?.graded && isAnswerGradable(correctAnswer)
                ? acceptedValues.some((acceptedValue) => normalizeInputAnswer(value) === normalizeInputAnswer(acceptedValue))
                  ? "is-correct"
                  : "is-wrong"
                : "";
            const fieldControl =
              field.type === "textarea"
                ? `
                  <textarea
                    name="mock-input-${field.id}"
                    rows="${field.rows || 10}"
                    placeholder="${escapeHTML(field.placeholder || "")}"
                    autocomplete="off"
                  >${escapeHTML(value)}</textarea>
                `
                : `
                  <input
                    type="${field.type === "number" ? "number" : "text"}"
                    name="mock-input-${field.id}"
                    value="${escapeHTML(value)}"
                    inputmode="${field.type === "number" ? "numeric" : "text"}"
                    placeholder="${escapeHTML(field.placeholder || "")}"
                    autocomplete="off"
                  />
                `;
            return `
              <label class="mock-input-field ${field.type === "textarea" ? "is-textarea" : ""} ${gradedClass}">
                <span>${escapeHTML(field.label)}</span>
                ${fieldControl}
              </label>
            `;
          })
          .join("")}
      </div>
    `;
  }

  const inputType = answerType === "multiChoice" ? "checkbox" : "radio";
  const selectedValues =
    answerType === "multiChoice"
      ? String(record?.answer || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  return `
    <div class="mock-options" aria-label="选项">
      ${getAnswerOptions(question)
        .map(([value, label, image]) => {
          const checked =
            inputType === "checkbox" ? (selectedValues.includes(value) ? "checked" : "") : record?.answer === value ? "checked" : "";
          const optionClass = record?.graded
            ? value === correctAnswer || (answerType === "multiChoice" && String(correctAnswer).split(",").includes(value))
              ? "is-correct"
              : (inputType === "checkbox" ? selectedValues.includes(value) : record.answer === value)
                ? "is-wrong"
                : ""
            : "";
          const optionImage = image
            ? `<span class="mock-option-image"><img src="${image}" alt="选项 ${value}" loading="lazy" decoding="async" /></span>`
            : "";
          return `
            <label class="mock-option-card ${optionClass}">
              <input type="${inputType}" name="mock-answer" value="${value}" ${checked} />
              <span class="mock-option-label">${value}${label && label !== value ? `. ${escapeHTML(label)}` : ""}</span>
              ${optionImage}
            </label>
          `;
        })
        .join("")}
    </div>
  `;
}

function saveListeningGroupAnswers(subject, type) {
  if (!mockStage) return;
  mockStage.querySelectorAll("[data-listening-question]").forEach((questionNode) => {
    const questionNumber = Number(questionNode.dataset.listeningQuestion);
    const question = getQuestion(type, questionNumber);
    if (getQuestionAnswerType(question) === "input") {
      const fields = question.inputFields || [{ id: "answer" }];
      const values = {};
      fields.forEach((field) => {
        const input = questionNode.querySelector(`[name="listening-input-${questionNumber}-${field.id}"]`);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          values[field.id] = input.value.trim();
        }
      });
      if (!Object.values(values).some(Boolean)) return;
      const key = getQuestionKey(subject.id, type.id, questionNumber);
      const existing = mockProgress.answers[key] || {};
      mockProgress.answers[key] = {
        ...existing,
        answer: JSON.stringify(values),
        graded: false,
        correct: null,
        updatedAt: new Date().toISOString(),
      };
      return;
    }

    const selected = questionNode.querySelector(`input[name="listening-answer-${questionNumber}"]:checked`);
    if (!(selected instanceof HTMLInputElement)) return;
    const key = getQuestionKey(subject.id, type.id, questionNumber);
    const existing = mockProgress.answers[key] || {};
    mockProgress.answers[key] = {
      ...existing,
      answer: selected.value,
      graded: false,
      correct: null,
      updatedAt: new Date().toISOString(),
    };
  });
  saveProgress();
  renderProgressPanel();
}

function renderListeningGroup(subject, type, groupId) {
  const questions = getQuestions(type).filter((question) => question.listeningGroupId === groupId);
  if (!questions.length) return;

  const firstQuestion = questions[0];
  const groupStats = getQuestionGroupStats(subject, type, questions);
  let currentInstruction = "";
  const questionCards = questions
    .map((question) => {
      const record = getQuestionRecord(subject.id, type.id, question.number);
      const correctAnswer = getCorrectAnswer(type, question.number);
      const instructionMarkup =
        question.sectionInstruction && question.sectionInstruction !== currentInstruction
          ? ((currentInstruction = question.sectionInstruction),
            `<div class="mock-listening-section-note">${escapeHTML(question.sectionInstruction)}</div>`)
          : "";
      const answerType = getQuestionAnswerType(question);
      const options =
        answerType === "input"
          ? (() => {
              const saved = parseStoredInputAnswer(record?.answer);
              const fields = question.inputFields || [{ id: "answer", label: "Answer", type: "text" }];
              const correctValues = parseStoredInputAnswer(correctAnswer);
              return `
                <div class="mock-input-fields">
                  ${fields
                    .map((field) => {
                      const value = saved[field.id] || "";
                      const acceptedValues = Array.isArray(correctValues[field.id]) ? correctValues[field.id] : [correctValues[field.id]];
                      const gradedClass =
                        record?.graded && isAnswerGradable(correctAnswer)
                          ? acceptedValues.some((acceptedValue) => normalizeInputAnswer(value) === normalizeInputAnswer(acceptedValue))
                            ? "is-correct"
                            : "is-wrong"
                          : "";
                      return `
                        <label class="mock-input-field ${gradedClass}">
                          <span>${escapeHTML(field.label || "Answer")}</span>
                          <input
                            type="text"
                            name="listening-input-${question.number}-${field.id}"
                            value="${escapeHTML(value)}"
                            autocomplete="off"
                            placeholder="${escapeHTML(field.placeholder || "Write your answer")}"
                          />
                        </label>
                      `;
                    })
                    .join("")}
                </div>
              `;
            })()
          : `
            <div class="mock-options mock-listening-options">
              ${getAnswerOptions(question)
                .map(([value, label]) => {
                  const checked = record?.answer === value ? "checked" : "";
                  const optionClass = record?.graded
                    ? value === correctAnswer
                      ? "is-correct"
                      : record.answer === value
                        ? "is-wrong"
                        : ""
                    : "";
                  return `
                    <label class="mock-option-card ${optionClass}">
                      <input type="radio" name="listening-answer-${question.number}" value="${escapeHTML(value)}" ${checked} />
                      <span class="mock-option-label">${escapeHTML(value)}${label && label !== value ? `. ${escapeHTML(label)}` : ""}</span>
                    </label>
                  `;
                })
                .join("")}
            </div>
          `;

      return `
        ${instructionMarkup}
        <article class="mock-listening-question" data-listening-question="${question.number}">
          <div class="mock-listening-question-head">
            <span>Question ${question.number}</span>
            <strong>${escapeHTML(getQuestionStatusText(record, question))}</strong>
          </div>
          <p>${escapeHTML(formatQuestionText(question.text))}</p>
          ${options}
        </article>
      `;
    })
    .join("");

  mockStage.innerHTML = `
    <div class="mock-question-view mock-listening-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" data-reset="questions">返回题组</button>
        <span>${subject.title} · ${type.title} · ${escapeHTML(firstQuestion.listeningTitle)}</span>
      </div>
      <section class="mock-listening-player-card">
        <div>
          <p class="eyebrow">Listening Practice</p>
          <h3>${escapeHTML(firstQuestion.listeningTitle)}</h3>
          <p>先浏览下方所有题目，再播放音频。音频只需要播放一次，答案会自动保存在本地。</p>
          <p class="mock-listening-stats">${groupStats.attempted}/${groupStats.total} 已做 · 已批改 ${groupStats.graded} 题 · 正确 ${groupStats.correct} 题</p>
        </div>
        <audio controls preload="none" src="${escapeHTML(firstQuestion.audioSrc)}"></audio>
      </section>
      <section class="mock-listening-paper">
        ${questionCards}
      </section>
      <div class="mock-question-actions">
        <button class="button ghost dark" type="button" data-reset="questions">返回题组</button>
        <button class="button ghost dark" type="button" data-leave-review>离开并批改</button>
      </div>
    </div>
  `;
}

function getSpeakingRecordingKey(subjectId, typeId, questionIndex, segmentId = "answer") {
  return `${getQuestionKey(subjectId, typeId, questionIndex)}:${segmentId}`;
}

function getSpeakingProgressKey(subjectId, typeId, questionIndex) {
  return getQuestionKey(subjectId, typeId, questionIndex);
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function drawNextMonologueFollowUp(subject, type, questionIndex, question) {
  const key = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const record = mockProgress.answers[key] || {};
  const existing = Array.isArray(record.speakingFollowUps) ? record.speakingFollowUps : [];
  if (existing.length >= (question.followUpCount || 3)) return existing;

  const remaining = (question.followUps || []).filter((prompt) => !existing.includes(prompt));
  if (!remaining.length) return existing;

  const followUps = [...existing, shuffleArray(remaining)[0]];
  mockProgress.answers[key] = {
    ...record,
    speakingFollowUps: followUps,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  return followUps;
}

function getMonologueFollowUps(subject, type, questionIndex) {
  const key = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const existing = mockProgress.answers[key]?.speakingFollowUps;
  return Array.isArray(existing) ? existing : [];
}

function getSpeakingSegments(subject, type, questionIndex, question, options = {}) {
  if (question?.speakingMode === "picture-response") {
    return (question.pictureQuestions || []).map((prompt, index) => ({
      id: `picture-${index + 1}`,
      label: `Question ${index + 1}`,
      prompt,
      timeLimit: "30 seconds",
    }));
  }

  if (question?.speakingMode !== "monologue") {
    return [{ id: "answer", label: "Answer", prompt: question?.text || "", timeLimit: question?.timeLimit || "30 seconds" }];
  }

  const followUps = options.drawNext ? drawNextMonologueFollowUp(subject, type, questionIndex, question) : getMonologueFollowUps(subject, type, questionIndex);
  return [
    { id: "main", label: "Main response", prompt: question.text, timeLimit: question.timeLimit || "2 minutes" },
    ...followUps.map((prompt, index) => ({
      id: `followup-${index + 1}`,
      label: `Follow-up ${index + 1}`,
      prompt,
      timeLimit: "30 seconds",
    })),
  ];
}

function getSpeakingCompletedSegments(subject, type, questionIndex, question) {
  return getSpeakingSegments(subject, type, questionIndex, question).filter((segment) =>
    speakingRecordings.has(getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id))
  );
}

function getSpeakingExpectedSegmentCount(question) {
  if (question?.speakingMode === "monologue") return 1 + (question.followUpCount || 3);
  if (question?.speakingMode === "picture-response") return question.pictureQuestions?.length || 0;
  return 1;
}

function cleanupSpeakingStream() {
  stopSpeakingMeter();
  if (activeSpeakingStream) {
    activeSpeakingStream.getTracks().forEach((track) => track.stop());
  }
  activeSpeakingStream = null;
  if (speakingMeterSource) {
    speakingMeterSource.disconnect();
    speakingMeterSource = null;
  }
  speakingAnalyser = null;
  if (speakingAudioContext) {
    speakingAudioContext.close().catch(() => {});
    speakingAudioContext = null;
  }
}

async function getReusableSpeakingStream() {
  const hasLiveStream = activeSpeakingStream?.getAudioTracks().some((track) => track.readyState === "live");
  if (hasLiveStream) return activeSpeakingStream;

  activeSpeakingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return activeSpeakingStream;
}

function stopSpeakingMeter() {
  if (speakingMeterFrame) {
    window.cancelAnimationFrame(speakingMeterFrame);
    speakingMeterFrame = null;
  }
  if (speakingMeterSource) {
    speakingMeterSource.disconnect();
    speakingMeterSource = null;
  }
}

function startSpeakingMeter(stream, meterKey = "") {
  stopSpeakingMeter();
  const meters = [...(mockStage?.querySelectorAll("[data-speaking-meter]") || [])];
  const meter = meters.find((node) => node.dataset.speakingMeter === meterKey) || meters[0];
  if (!meter) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!speakingAudioContext || speakingAudioContext.state === "closed") {
    speakingAudioContext = new AudioContextClass();
  }
  if (speakingAudioContext.state === "suspended") {
    speakingAudioContext.resume().catch(() => {});
  }

  speakingAnalyser = speakingAudioContext.createAnalyser();
  speakingAnalyser.fftSize = 256;
  speakingMeterSource = speakingAudioContext.createMediaStreamSource(stream);
  speakingMeterSource.connect(speakingAnalyser);
  const samples = new Uint8Array(speakingAnalyser.fftSize);

  const update = () => {
    speakingAnalyser.getByteTimeDomainData(samples);
    let sum = 0;
    samples.forEach((sample) => {
      const value = sample - 128;
      sum += value * value;
    });
    const rms = Math.sqrt(sum / samples.length);
    const level = Math.min(1, rms / 34);
    meter.style.setProperty("--speaking-level", `${Math.max(0.04, level) * 100}%`);
    meter.classList.toggle("is-live", level > 0.08);
    speakingMeterFrame = window.requestAnimationFrame(update);
  };

  update();
}

function isSpeakingRecording(questionKey) {
  return activeSpeakingRecorder?.state === "recording" && activeSpeakingKey === questionKey;
}

function saveSpeakingAttempt(subject, type, questionIndex, question) {
  const key = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  const completed = getSpeakingCompletedSegments(subject, type, questionIndex, question);
  const expectedSegmentCount = getSpeakingExpectedSegmentCount(question);
  mockProgress.answers[key] = {
    ...(mockProgress.answers[key] || {}),
    answer: completed.length >= expectedSegmentCount ? "completed" : "in-progress",
    graded: false,
    correct: null,
    speakingCompletedSegments: completed.map((segment) => segment.id),
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
}

async function startSpeakingRecording(subject, type, questionIndex, segmentId = "answer") {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    window.alert("当前浏览器不支持录音功能。请使用最新版 Chrome 或 Edge 再试。");
    return;
  }

  if (activeSpeakingRecorder?.state === "recording") {
    window.alert("已有录音正在进行，请先停止当前录音。");
    return;
  }

  const question = getQuestion(type, questionIndex);
  const key = getSpeakingRecordingKey(subject.id, type.id, questionIndex, segmentId);
  try {
    const stream = await getReusableSpeakingStream();
    activeSpeakingChunks = [];
    activeSpeakingKey = key;
    activeSpeakingRecorder = new MediaRecorder(stream);
    activeSpeakingRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) activeSpeakingChunks.push(event.data);
    });
    activeSpeakingRecorder.addEventListener("stop", () => {
      stopSpeakingMeter();
      const blob = new Blob(activeSpeakingChunks, { type: activeSpeakingRecorder.mimeType || "audio/webm" });
      const previous = speakingRecordings.get(key);
      if (previous?.url) URL.revokeObjectURL(previous.url);
      speakingRecordings.set(key, {
        blob,
        url: URL.createObjectURL(blob),
        recordedAt: new Date().toISOString(),
      });
      activeSpeakingRecorder = null;
      activeSpeakingChunks = [];
      activeSpeakingKey = "";
      saveSpeakingAttempt(subject, type, questionIndex, question);
      renderSpeakingQuestion(subject, type, questionIndex);
    });
    activeSpeakingRecorder.start();
    renderSpeakingQuestion(subject, type, questionIndex);
    startSpeakingMeter(stream, key);
  } catch (error) {
    cleanupSpeakingStream();
    activeSpeakingRecorder = null;
    activeSpeakingChunks = [];
    activeSpeakingKey = "";
    window.alert("无法开启麦克风。请检查浏览器麦克风权限后再试。");
  }
}

function stopSpeakingRecording() {
  if (activeSpeakingRecorder?.state === "recording") {
    activeSpeakingRecorder.stop();
  }
}

function clearSpeakingRecording(subject, type, questionIndex) {
  const question = getQuestion(type, questionIndex);
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  getSpeakingSegments(subject, type, questionIndex, question).forEach((segment) => {
    const recordingKey = getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id);
    const recording = speakingRecordings.get(recordingKey);
    if (recording?.url) URL.revokeObjectURL(recording.url);
    speakingRecordings.delete(recordingKey);
  });
  delete mockProgress.answers[progressKey];
  saveProgress();
  renderSpeakingQuestion(subject, type, questionIndex);
}

function renderSpeakingMonologue(subject, type, questionIndex, question) {
  const questionNumbers = getQuestionNumbers(type);
  const currentPosition = questionNumbers.indexOf(questionIndex);
  const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
  const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const expectedSegmentCount = getSpeakingExpectedSegmentCount(question);
  const anyRecordingNow = activeSpeakingRecorder?.state === "recording";
  let segments = getSpeakingSegments(subject, type, questionIndex, question);
  let completed = getSpeakingCompletedSegments(subject, type, questionIndex, question);
  if (!anyRecordingNow && completed.length === segments.length && completed.length < expectedSegmentCount) {
    segments = getSpeakingSegments(subject, type, questionIndex, question, { drawNext: true });
    completed = getSpeakingCompletedSegments(subject, type, questionIndex, question);
  }
  const allComplete = completed.length >= expectedSegmentCount;
  const promptList = (question.prompts || [])
    .map((prompt) => `<li>${escapeHTML(prompt)}</li>`)
    .join("");

  const segmentCards = segments
    .map((segment, index) => {
      const recordingKey = getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id);
      const recording = speakingRecordings.get(recordingKey);
      const recordingNow = isSpeakingRecording(recordingKey);
      return `
        <article class="mock-speaking-segment ${recordingNow ? "is-recording" : ""}">
          <div class="mock-speaking-segment-head">
            <div>
              <span>${escapeHTML(segment.label)}</span>
              <strong>${recording ? "Recorded" : "Ready"}</strong>
            </div>
            <em>${escapeHTML(segment.timeLimit)}</em>
          </div>
          <p>${escapeHTML(segment.prompt)}</p>
          <div class="mock-speaking-meter ${recordingNow ? "is-active" : ""}" aria-label="Microphone input level" data-speaking-meter="${escapeHTML(recordingKey)}">
            <span></span>
          </div>
          <div class="mock-speaking-actions">
            <button class="button primary" type="button" ${recordingNow ? "data-stop-speaking-recording" : "data-start-speaking-recording"} data-speaking-segment="${segment.id}" ${!recordingNow && anyRecordingNow ? "disabled" : ""}>
              ${recordingNow ? "Stop" : recording ? "Record Again" : "Start Record"}
            </button>
          </div>
          ${
            recording
              ? `<audio class="mock-speaking-audio" controls preload="metadata" src="${escapeHTML(recording.url)}"></audio>`
              : `<div class="mock-speaking-empty">No recording yet.</div>`
          }
        </article>
      `;
    })
    .join("");

  mockStage.innerHTML = `
    <div class="mock-question-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" data-reset="questions" ${anyRecordingNow ? "disabled" : ""}>返回题号</button>
        <span>${subject.title} · ${type.title} · Monologue</span>
      </div>
      <div class="mock-speaking-monologue-layout">
        <section class="mock-speaking-prompt-card">
          <p class="eyebrow">Speaking Practice</p>
          <h3>Monologue</h3>
          <p class="mock-speaking-type">Main topic + 3 follow-up questions</p>
          <p class="mock-speaking-question">${escapeHTML(question.text || "")}</p>
          <div class="mock-speaking-cue-card">
            <strong>You should say:</strong>
            <ul>${promptList}</ul>
          </div>
          <div class="mock-speaking-meta">
            <span>Preparation: ${escapeHTML(question.preparationTime || "1 minute")}</span>
            <span>Main response: ${escapeHTML(question.timeLimit || "2 minutes")}</span>
            <span>Progress: ${completed.length}/${expectedSegmentCount} recordings</span>
          </div>
        </section>
        <section class="mock-speaking-recorder-card">
          <p class="eyebrow">Recorder</p>
          <h3>Record Each Part</h3>
          <p class="mock-speaking-status ${anyRecordingNow ? "is-recording" : ""}">
            ${anyRecordingNow ? "Recording now..." : allComplete ? "All recordings are ready. Submit them together for review." : "Record the current question. The next follow-up will appear only after you finish."}
          </p>
          <div class="mock-speaking-segment-list">
            ${segmentCards}
          </div>
          <p class="mock-answer-note">Monologue 会把主陈述和 3 个追问一起提交评分。当前评分接口先预留，录音只保存在当前浏览器页面中。</p>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" data-clear-speaking-recording ${completed.length && !anyRecordingNow ? "" : "disabled"}>全部重录</button>
            <button class="button primary" type="button" data-submit-speaking-review ${allComplete && !anyRecordingNow ? "" : "disabled"}>提交评分</button>
            <button class="button ghost dark" type="button" ${previous && !anyRecordingNow ? `data-question="${previous}"` : "disabled"}>上一题</button>
            <button class="button primary" type="button" ${next && !anyRecordingNow ? `data-question="${next}"` : "disabled"}>下一题</button>
          </div>
        </section>
      </div>
    </div>
  `;

  if (allComplete) {
    mockProgress.answers[progressKey] = {
      ...(mockProgress.answers[progressKey] || {}),
      answer: "completed",
      graded: false,
      correct: null,
      speakingCompletedSegments: completed.map((segment) => segment.id),
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
  }
}

function renderSpeakingPictureResponse(subject, type, questionIndex, question) {
  const questionNumbers = getQuestionNumbers(type);
  const currentPosition = questionNumbers.indexOf(questionIndex);
  const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
  const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  const completed = getSpeakingCompletedSegments(subject, type, questionIndex, question);
  const expectedSegmentCount = getSpeakingExpectedSegmentCount(question);
  const allComplete = completed.length >= expectedSegmentCount;
  const anyRecordingNow = activeSpeakingRecorder?.state === "recording";

  const segmentCards = segments
    .map((segment) => {
      const recordingKey = getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id);
      const recording = speakingRecordings.get(recordingKey);
      const recordingNow = isSpeakingRecording(recordingKey);
      return `
        <article class="mock-speaking-segment ${recordingNow ? "is-recording" : ""}">
          <div class="mock-speaking-segment-head">
            <div>
              <span>${escapeHTML(segment.label)}</span>
              <strong>${recording ? "Recorded" : "Ready"}</strong>
            </div>
            <em>${escapeHTML(segment.timeLimit)}</em>
          </div>
          <p>${escapeHTML(segment.prompt)}</p>
          <div class="mock-speaking-meter ${recordingNow ? "is-active" : ""}" aria-label="Microphone input level" data-speaking-meter="${escapeHTML(recordingKey)}">
            <span></span>
          </div>
          <div class="mock-speaking-actions">
            <button class="button primary" type="button" ${recordingNow ? "data-stop-speaking-recording" : "data-start-speaking-recording"} data-speaking-segment="${segment.id}" ${!recordingNow && anyRecordingNow ? "disabled" : ""}>
              ${recordingNow ? "Stop" : recording ? "Record Again" : "Start Record"}
            </button>
          </div>
          ${
            recording
              ? `<audio class="mock-speaking-audio" controls preload="metadata" src="${escapeHTML(recording.url)}"></audio>`
              : `<div class="mock-speaking-empty">No recording yet.</div>`
          }
        </article>
      `;
    })
    .join("");

  mockStage.innerHTML = `
    <div class="mock-question-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" data-reset="questions" ${anyRecordingNow ? "disabled" : ""}>返回题号</button>
        <span>${subject.title} · ${type.title} · Picture-based Questions</span>
      </div>
      <div class="mock-speaking-picture-layout">
        <section class="mock-speaking-prompt-card">
          <p class="eyebrow">Picture-based Speaking</p>
          <h3>${escapeHTML(question.imageTitle || "Picture Task")}</h3>
          <p class="mock-speaking-type">Look at the picture and answer all questions</p>
          <div class="mock-speaking-image-card">
            <img src="${escapeHTML(question.image)}" alt="${escapeHTML(question.imageTitle || "Speaking picture")}" loading="lazy" decoding="async" />
          </div>
          <div class="mock-speaking-meta">
            <span>${expectedSegmentCount} questions</span>
            <span>${escapeHTML(question.timeLimit || "30 seconds per question")}</span>
            <span>Progress: ${completed.length}/${expectedSegmentCount} recordings</span>
          </div>
        </section>
        <section class="mock-speaking-recorder-card">
          <p class="eyebrow">Recorder</p>
          <h3>Answer the Questions</h3>
          <p class="mock-speaking-status ${anyRecordingNow ? "is-recording" : ""}">
            ${anyRecordingNow ? "Recording now..." : allComplete ? "All recordings are ready. Submit them together for review." : "Record one answer for each picture question."}
          </p>
          <div class="mock-speaking-segment-list">
            ${segmentCards}
          </div>
          <p class="mock-answer-note">图片说明会保存在后台数据中用于未来评分，不会显示给学生。当前录音只保存在当前浏览器页面。</p>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" data-clear-speaking-recording ${completed.length && !anyRecordingNow ? "" : "disabled"}>全部重录</button>
            <button class="button primary" type="button" data-submit-speaking-review ${allComplete && !anyRecordingNow ? "" : "disabled"}>提交评分</button>
            <button class="button ghost dark" type="button" ${previous && !anyRecordingNow ? `data-question="${previous}"` : "disabled"}>上一题</button>
            <button class="button primary" type="button" ${next && !anyRecordingNow ? `data-question="${next}"` : "disabled"}>下一题</button>
          </div>
        </section>
      </div>
    </div>
  `;

  if (allComplete) {
    mockProgress.answers[progressKey] = {
      ...(mockProgress.answers[progressKey] || {}),
      answer: "completed",
      graded: false,
      correct: null,
      speakingCompletedSegments: completed.map((segment) => segment.id),
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
  }
}

function renderSpeakingQuestion(subject, type, questionIndex) {
  if (!mockStage) return;

  const questionNumbers = getQuestionNumbers(type);
  const currentPosition = questionNumbers.indexOf(questionIndex);
  const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
  const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
  const question = getQuestion(type, questionIndex);
  if (question?.speakingMode === "monologue") {
    renderSpeakingMonologue(subject, type, questionIndex, question);
    return;
  }
  if (question?.speakingMode === "picture-response") {
    renderSpeakingPictureResponse(subject, type, questionIndex, question);
    return;
  }
  const key = getSpeakingRecordingKey(subject.id, type.id, questionIndex);
  const recording = speakingRecordings.get(key);
  const recordingNow = isSpeakingRecording(key);
  const statusText = recordingNow
    ? "Recording now..."
    : recording
      ? "Recording saved for this session. You can listen back or record again."
      : "This warm-up question is not scored. Record your answer and listen back to check clarity.";

  mockStage.innerHTML = `
    <div class="mock-question-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" data-reset="questions">返回题号</button>
        <span>${subject.title} · ${type.title} · Question ${questionIndex}</span>
      </div>
      <div class="mock-speaking-layout">
        <section class="mock-speaking-prompt-card">
          <p class="eyebrow">Speaking Practice</p>
          <h3>Question ${questionIndex}</h3>
          <p class="mock-speaking-type">${escapeHTML(question.speakingTitle || "Warm-up Questions")} · Not scored</p>
          <p class="mock-speaking-question">${escapeHTML(question.text || "")}</p>
          <div class="mock-speaking-meta">
            <span>Suggested time: ${escapeHTML(question.timeLimit || "30 seconds")}</span>
            <span>Focus: clear answer, natural pace, complete sentence</span>
          </div>
        </section>
        <section class="mock-speaking-recorder-card">
          <p class="eyebrow">Recorder</p>
          <h3>Record Your Answer</h3>
          <p class="mock-speaking-status ${recordingNow ? "is-recording" : ""}">${statusText}</p>
          <div class="mock-speaking-meter ${recordingNow ? "is-active" : ""}" aria-label="Microphone input level" data-speaking-meter="${escapeHTML(key)}">
            <span></span>
          </div>
          <div class="mock-speaking-actions">
            <button class="button primary" type="button" ${recordingNow ? "data-stop-speaking-recording" : "data-start-speaking-recording"}>
              ${recordingNow ? "Stop" : recording ? "Record Again" : "Start Record"}
            </button>
            <button class="button ghost dark" type="button" data-clear-speaking-recording ${recording && !recordingNow ? "" : "disabled"}>Clear</button>
          </div>
          ${
            recording
              ? `<audio class="mock-speaking-audio" controls preload="metadata" src="${escapeHTML(recording.url)}"></audio>`
              : `<div class="mock-speaking-empty">No recording yet.</div>`
          }
          <p class="mock-answer-note">录音只保存在当前浏览器页面中，不会上传，也不会计分。</p>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" ${previous && !recordingNow ? `data-question="${previous}"` : "disabled"}>上一题</button>
            <button class="button ghost dark" type="button" data-reset="questions" ${recordingNow ? "disabled" : ""}>返回题号</button>
            <button class="button primary" type="button" ${next && !recordingNow ? `data-question="${next}"` : "disabled"}>下一题</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderQuestion(subject, type, questionIndex) {
  if (!mockStage) return;

  const questionNumbers = getQuestionNumbers(type);
  const currentPosition = questionNumbers.indexOf(questionIndex);
  const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
  const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
  const key = getQuestionKey(subject.id, type.id, questionIndex);
  const record = mockProgress.answers[key];
  const question = getQuestion(type, questionIndex);
  if (type.id === "listening" && question?.listeningGroupId) {
    clearWritingTimerInterval();
    renderListeningGroup(subject, type, question.listeningGroupId);
    return;
  }
  if (type.id === "speaking" && question?.speakingMode) {
    clearWritingTimerInterval();
    renderSpeakingQuestion(subject, type, questionIndex);
    return;
  }
  const correctAnswer = getCorrectAnswer(type, questionIndex);
  const answerType = getQuestionAnswerType(question);
  if (!isAiReviewQuestion(question)) clearWritingTimerInterval();
  const isPlaceholder = !question?.context && !question?.text && !question?.image;
  const sourceLabel = question?.sourceNumber ? `原题 ${question.sourceNumber}` : "";
  const questionText = formatQuestionText(
    question?.text ||
      (question?.sharedStemImage
        ? `请根据下图完成${sourceLabel ? ` ${sourceLabel}` : ""} 的填空。`
        : "请根据题目图示作答。")
  );
  const questionContext = question?.context ? `<p class="mock-question-context">${escapeHTML(question.context)}</p>` : "";
  const hasPassage = Boolean(question?.passageText);
  const readingPassage = hasPassage
    ? `
      <div class="mock-reading-passage">
        <p class="eyebrow">Reading Text</p>
        <h3>${escapeHTML(question.passageTitle || "Reading Text")}</h3>
        <div>${escapeHTML(question.passageText)}</div>
      </div>
    `
    : "";
  const questionPrompt = `
    <p class="eyebrow">${isPlaceholder ? "Placeholder Question" : "Practice Question"}</p>
    <h3>第 ${questionIndex} 题</h3>
    ${questionContext}
    <p class="mock-question-text">${escapeHTML(questionText)}</p>
    ${renderWordBank(question)}
  `;
  const questionImage = question?.image
    ? `<div class="mock-question-visual"><img src="${question.image}" alt="${type.title} question ${questionIndex} visual" loading="lazy" decoding="async" /></div>`
    : "";
  const aiReviewNotice = isAiReviewQuestion(question)
    ? `
      <div class="mock-ai-review-note">
        <strong>AI review prepared</strong>
        <span>当前版本会先保存作文内容。提交后会生成分项诊断、总分与修改建议。</span>
      </div>
    `
    : "";
  const writingMeta = isAiReviewQuestion(question)
    ? `
      <div class="mock-writing-meta">
        <span><strong>Time Allowed</strong>${escapeHTML(question.timeAllowed || "30 minutes")}</span>
        <span><strong>Word Requirement</strong>${escapeHTML(question.wordRequirement || "You should write at least 200 words.")}</span>
      </div>
    `
    : "";
  const savedInputValues = parseStoredInputAnswer(record?.answer);
  const currentEssay = savedInputValues.essay || "";
  const initialWordCount = getWordCount(currentEssay);
  const durationSeconds = parseDurationSeconds(question?.timeAllowed);
  const timer = isAiReviewQuestion(question) ? ensureQuestionTimer(subject.id, type.id, questionIndex, durationSeconds) : null;
  const remainingSeconds = timer ? getTimerRemainingSeconds(timer) : durationSeconds;
  const writingTools = isAiReviewQuestion(question)
    ? `
      <div class="mock-writing-tools">
        <span><strong data-writing-word-count>${initialWordCount}</strong> words</span>
        <span class="${remainingSeconds <= 0 ? "is-expired" : ""}"><strong data-writing-timer>${formatTimerSeconds(remainingSeconds)}</strong> remaining</span>
      </div>
    `
    : "";
  const answerNote = isAiReviewQuestion(question)
    ? `<p class="mock-answer-note">请完成作文后点击“离开并批改”。目前会进入结果页并显示待 AI 批改状态。</p>`
    : answerType === "input"
      ? `<p class="mock-answer-note">请直接在输入框填写数字或文字，不用从选项中选择。</p>`
      : answerType === "multiChoice"
        ? `<p class="mock-answer-note">此题型需选择 ${question.maxSelections || 2} 个选项。</p>`
        : "";
  const actionButtons = `
    <div class="mock-question-actions">
      <button class="button ghost dark" type="button" ${previous ? `data-question="${previous}"` : "disabled"}>上一题</button>
      <button class="button ghost dark" type="button" data-leave-review>离开并批改</button>
      <button class="button primary" type="button" ${next ? `data-question="${next}"` : "disabled"}>下一题</button>
    </div>
  `;
  const canRetryAiReview = hasSuccessfulAiReview(record);
  const aiSubmitLocked = !canRetryAiReview && hasPendingAiReview();
  const aiActionButtons = `
    <div class="mock-question-actions">
      <button class="button ghost dark" type="button" ${previous ? `data-question="${previous}"` : "disabled"}>上一题</button>
      <button class="button primary" type="button" ${canRetryAiReview ? "data-view-ai-review" : "data-submit-ai-review"} ${aiSubmitLocked ? "disabled" : ""}>
        ${canRetryAiReview ? "看评论" : "提交并批改"}
      </button>
      ${canRetryAiReview ? `<button class="button ghost dark" type="button" data-retry-ai-question>再试一次</button>` : ""}
      <button class="button ghost dark" type="button" data-abandon-ai-question>放弃</button>
    </div>
  `;

  if (isAiReviewQuestion(question)) {
    mockStage.innerHTML = `
      <div class="mock-question-view">
        <div class="mock-question-topbar">
          <button class="mock-back" type="button" data-reset="questions">返回题号</button>
          <span>${subject.title} · ${type.title} · Question ${questionIndex}${sourceLabel ? ` · Source ${question.sourceNumber}` : ""}</span>
        </div>
        <div class="mock-writing-layout">
          <section class="mock-writing-prompt">
            <p class="eyebrow">Practice Question</p>
            <h3>第 ${questionIndex} 题</h3>
            ${questionContext}
            ${writingMeta}
            <p class="mock-question-text">${escapeHTML(questionText)}</p>
          </section>
          <section class="mock-writing-answer">
            <div class="mock-writing-answer-head">
              <div>
                <p class="eyebrow">Answer</p>
                <h3>${getAnswerPanelHeading(question)}</h3>
              </div>
              <span>Draft saved locally</span>
            </div>
            ${renderAnswerOptions(question, record, correctAnswer)}
            ${writingTools}
            ${aiReviewNotice}
            ${answerNote}
            ${aiActionButtons}
          </section>
        </div>
      </div>
    `;
    initializeWritingTools(subject.id, type.id, questionIndex);
    return;
  }

  mockStage.innerHTML = `
    <div class="mock-question-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" data-reset="questions">返回题号</button>
        <span>${subject.title} · ${type.title} · Question ${questionIndex}${sourceLabel ? ` · Source ${question.sourceNumber}` : ""}</span>
      </div>
      <div class="mock-question-layout ${hasPassage ? "has-reading-passage" : ""}">
        <div class="mock-question-content">
          ${hasPassage ? readingPassage : questionPrompt}
          ${questionImage}
        </div>
        <div class="mock-question-panel">
          ${hasPassage ? `<div class="mock-reading-question">${questionPrompt}</div>` : ""}
          <p class="eyebrow">Answer</p>
          <h3>${getAnswerPanelHeading(question)}</h3>
          ${renderAnswerOptions(question, record, correctAnswer)}
          ${aiReviewNotice}
          ${answerNote}
          ${actionButtons}
        </div>
      </div>
    </div>
  `;
}

function renderMockApp() {
  if (!mockApp || !mockStage) return;

  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  const activeQuestion = subject && type && mockState.questionIndex ? getQuestion(type, mockState.questionIndex) : null;
  if (!isAiReviewQuestion(activeQuestion)) clearWritingTimerInterval();
  renderBreadcrumb(subject, type);
  renderProgressPanel();

  if (!mockState.gradeBand) {
    renderGradeBandList();
    return;
  }

  if (mockState.gradeBand === "7-9") {
    renderGradeConstruction();
    return;
  }

  if (!subject) {
    renderSubjectList();
    return;
  }

  if (!type) {
    renderTypeList(subject);
    return;
  }

  if (!mockState.questionIndex) {
    renderQuestionList(subject, type);
    return;
  }

  renderQuestion(subject, type, mockState.questionIndex);
}

function initializeWritingTools(subjectId, typeId, questionIndex) {
  clearWritingTimerInterval();

  const subject = findSubject(subjectId);
  const type = findType(subject, typeId);
  const question = getQuestion(type, questionIndex);
  if (!isAiReviewQuestion(question) || !mockStage) return;

  const textarea = mockStage.querySelector('textarea[name="mock-input-essay"]');
  const wordCountNode = mockStage.querySelector("[data-writing-word-count]");
  const timerNode = mockStage.querySelector("[data-writing-timer]");
  const timerWrap = timerNode?.closest("span");
  const durationSeconds = parseDurationSeconds(question.timeAllowed);
  const timer = ensureQuestionTimer(subjectId, typeId, questionIndex, durationSeconds);

  const updateWordCount = () => {
    if (wordCountNode && textarea) {
      wordCountNode.textContent = String(getWordCount(textarea.value));
    }
  };

  const updateTimer = () => {
    const remaining = getTimerRemainingSeconds(timer);
    if (timerNode) timerNode.textContent = formatTimerSeconds(remaining);
    if (timerWrap) timerWrap.classList.toggle("is-expired", remaining <= 0);
    if (remaining <= 0) clearWritingTimerInterval();
  };

  textarea?.addEventListener("input", updateWordCount);
  updateWordCount();
  updateTimer();
  writingTimerInterval = window.setInterval(updateTimer, 1000);
}

function saveCurrentAnswerFromForm() {
  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  if (!subject || !type || !mockState.questionIndex || !mockStage) return;

  const question = getQuestion(type, mockState.questionIndex);
  const answerType = getQuestionAnswerType(question);

  if (answerType === "input") {
    const fields = question.inputFields || [{ id: "answer" }];
    const values = {};
    fields.forEach((field) => {
      const input = mockStage.querySelector(`[name="mock-input-${field.id}"]`);
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        values[field.id] = input.value.trim();
      }
    });
    saveCurrentAnswer(JSON.stringify(values));
    return;
  }

  if (answerType === "multiChoice") {
    const checked = [...mockStage.querySelectorAll('input[name="mock-answer"]:checked')].map((input) => input.value);
    saveCurrentAnswer(checked.sort().join(","));
    return;
  }

  const selected = mockStage.querySelector('input[name="mock-answer"]:checked');
  if (selected instanceof HTMLInputElement) {
    saveCurrentAnswer(selected.value);
  }
}

function saveCurrentAnswer(answer) {
  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  if (!subject || !type || !mockState.questionIndex) return;

  const key = getQuestionKey(subject.id, type.id, mockState.questionIndex);
  const existing = mockProgress.answers[key] || {};
  mockProgress.answers[key] = {
    ...existing,
    answer,
    graded: false,
    correct: null,
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    renderProgressPanel();
}

function getWritingReviewItems(question) {
  return [
    {
      key: "language_accuracy",
      reasonKey: "language_accuracy_reason",
      title: "Language Accuracy",
      max: 8,
    },
    {
      key: "vocabulary",
      reasonKey: "vocabulary_reason",
      title: "Vocabulary",
      max: 4,
    },
    {
      key: "content_organisation",
      reasonKey: "content_organisation_reason",
      title: "Content and Organisation",
      max: 8,
    },
  ];
}

function renderListItems(items, fallback) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return `
    <ul>
      ${(list.length ? list : [fallback]).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
    </ul>
  `;
}

function renderAiWritingModelResult(review, isLoading) {
  const hasScore = Number.isFinite(Number(review?.total));
  const modelError = review?.error || "";
  const rubricRows = getWritingReviewItems()
    .map((item) => {
      const score = hasScore ? review[item.key] : "--";
      const reason = hasScore
          ? review[item.reasonKey]
          : modelError
            ? modelError
          : isLoading
            ? "AI is reviewing this essay."
            : "Waiting for AI review";
      return `
        <div class="mock-ai-score-card">
          <span>${escapeHTML(item.title)}</span>
          <strong>${escapeHTML(score)}/${item.max}</strong>
          <small>${escapeHTML(reason)}</small>
        </div>
      `;
    })
    .join("");

  return `
    <section class="mock-ai-model-result">
      ${modelError ? `<div class="mock-ai-error">${escapeHTML(modelError)}</div>` : ""}
      <div class="mock-ai-review-total">
        <span>Total Score</span>
        <strong>${hasScore ? escapeHTML(review.total) : "--"}/20</strong>
        <small>${hasScore ? escapeHTML(review.level) : modelError ? "Review failed" : isLoading ? "Reviewing..." : "Not reviewed yet"}</small>
      </div>
      <div class="mock-ai-score-grid">
        ${rubricRows}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>Overall Feedback</h4>
        <p>${escapeHTML(hasScore ? review.overall_feedback : isLoading ? "AI is generating feedback." : "Submit the essay to generate feedback.")}</p>
      </div>
      <div class="mock-ai-feedback-block">
        <h4>Strengths</h4>
        ${renderListItems(hasScore ? review.strengths : [], isLoading ? "Reviewing strengths..." : "No strengths generated yet.")}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>Weaknesses</h4>
        ${renderListItems(hasScore ? review.weaknesses : [], isLoading ? "Reviewing weaknesses..." : "No weaknesses generated yet.")}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>Top 3 Improvements</h4>
        ${renderListItems(hasScore ? review.top_3_improvements : [], isLoading ? "Generating improvement advice..." : "No advice generated yet.")}
      </div>
    </section>
  `;
}

function renderAiWritingReview(subject, type, questionIndex, status = "ready", errorMessage = "") {
  const question = getQuestion(type, questionIndex);
  const record = getQuestionRecord(subject.id, type.id, questionIndex);
  const essay = parseStoredInputAnswer(record?.answer).essay || "";
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const config = window.rewardSchoolAiConfig || {};
  const modelNames = (config.models || [{ id: "pro", label: "Pro" }]).map((model) =>
    typeof model === "string" ? { id: model, label: model } : model
  );
  const activeModelIds = new Set(modelNames.map((model) => model.id));
  const reviews = Array.isArray(record?.aiReviews)
    ? record.aiReviews.filter((review) => activeModelIds.has(review.model))
    : record?.aiReview
      ? [{ ...record.aiReview, model: record.aiReview.model || "AI", modelLabel: record.aiReview.modelLabel || "Pro" }]
      : [];
  const isLoading = status === "loading";
  const hasReview = reviews.length > 0;
  const reviewSections = (hasReview ? reviews : modelNames.map((model) => ({ model: model.id, modelLabel: model.label })))
    .map((review) => renderAiWritingModelResult(review, isLoading || !hasReview))
    .join("");

  return `
    <div class="mock-review-overlay" data-ai-review-overlay>
      <div class="mock-ai-review-dialog" role="dialog" aria-modal="true" aria-label="Writing AI review">
        <div class="mock-review-header">
          <div>
            <p class="eyebrow">AI Writing Review</p>
            <h3>Writing Feedback</h3>
            <p>${isLoading ? "AI 正在批改作文，请稍等。" : hasReview ? "以下为 AI 根据写作诊断维度生成的评分与反馈。" : "提交作文后会显示 AI 批改结果。"} Essay word count: ${wordCount}</p>
          </div>
          <button class="mock-review-close" type="button" data-close-ai-review>关闭</button>
        </div>
        ${errorMessage ? `<div class="mock-ai-error">${escapeHTML(errorMessage)}</div>` : ""}
        <div class="mock-ai-model-results">
          ${reviewSections}
        </div>
      </div>
    </div>
  `;
}

function openAiWritingReview(subject, type, questionIndex, status = "ready", errorMessage = "") {
  document.querySelector("[data-ai-review-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", renderAiWritingReview(subject, type, questionIndex, status, errorMessage));
}

function closeAiWritingReview() {
  document.querySelector("[data-ai-review-overlay]")?.remove();
}

function resetAiWritingReview(subject, type, questionIndex) {
  const confirmed = window.confirm("确定要再试一次吗？这会删除本题已有分数与 AI 反馈，并重置计时器。作文内容会保留。");
  if (!confirmed) return;

  const key = getQuestionKey(subject.id, type.id, questionIndex);
  const existing = mockProgress.answers[key] || {};
  const { aiReview, aiReviews, correctAnswer, ...rest } = existing;
  mockProgress.answers[key] = {
    ...rest,
    graded: false,
    correct: null,
    updatedAt: new Date().toISOString(),
  };
  mockProgress.timers = mockProgress.timers || {};
  delete mockProgress.timers[key];
  saveProgress();
  renderMockApp();
}

function buildAiWritingPrompt(question, essay) {
  const config = window.rewardSchoolAiConfig || {};
  const template = config.writingPromptTemplate || question.aiPromptTemplate || "";
  return template.replaceAll("{{QUESTION}}", question.text || "").replaceAll("{{ESSAY}}", essay || "");
}

function extractJsonObject(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw error;
  }
}

function normalizeScore(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, Math.round(number)));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return String(hash);
}

function normalizeAiWritingReviewResult(raw) {
  const languageAccuracy = normalizeScore(raw.language_accuracy, 8);
  const vocabulary = normalizeScore(raw.vocabulary, 4);
  const contentOrganisation = normalizeScore(raw.content_organisation, 8);
  const total = normalizeScore(raw.total ?? languageAccuracy + vocabulary + contentOrganisation, 20);
  return {
    language_accuracy: languageAccuracy,
    language_accuracy_reason: String(raw.language_accuracy_reason || "").trim(),
    vocabulary,
    vocabulary_reason: String(raw.vocabulary_reason || "").trim(),
    content_organisation: contentOrganisation,
    content_organisation_reason: String(raw.content_organisation_reason || "").trim(),
    total,
    level: String(raw.level || "").trim(),
    overall_feedback: String(raw.overall_feedback || "").trim(),
    strengths: normalizeStringArray(raw.strengths),
    weaknesses: normalizeStringArray(raw.weaknesses),
    top_3_improvements: normalizeStringArray(raw.top_3_improvements),
    reviewedAt: new Date().toISOString(),
  };
}

async function requestAiWritingReview(question, essay, modelConfig) {
  const model = typeof modelConfig === "string" ? modelConfig : modelConfig.id;
  const modelLabel = typeof modelConfig === "string" ? modelConfig : modelConfig.label || modelConfig.id;

  if (!window.rewardSchoolApi?.reviewWriting) throw new Error("Reward School API client is missing.");

  const payload = await window.rewardSchoolApi.reviewWriting({
    question: question.text || "",
    essay,
    sourceId: String(question.sourceId || question.id || question.number || ""),
  });
  return {
    ...normalizeAiWritingReviewResult(payload),
    model,
    modelLabel: payload.modelLabel || modelLabel,
    backendModel: payload.model,
  };
}

function getAiReviewCooldownRemainingMs() {
  const lastSubmittedAt = Number(mockProgress.aiReviewLastSubmittedAt || 0);
  if (!Number.isFinite(lastSubmittedAt) || lastSubmittedAt <= 0) return 0;
  return Math.max(0, AI_REVIEW_SESSION_COOLDOWN_MS - (Date.now() - lastSubmittedAt));
}

function markAiReviewSubmitted() {
  mockProgress.aiReviewLastSubmittedAt = Date.now();
  saveProgress();
}

async function submitAiWritingReview(subject, type, questionIndex) {
  const question = getQuestion(type, questionIndex);
  const record = getQuestionRecord(subject.id, type.id, questionIndex);
  const essay = parseStoredInputAnswer(record?.answer).essay || "";
  if (!essay.trim()) {
    window.alert("请先完成作文内容，再提交批改。");
    return;
  }

  const config = window.rewardSchoolAiConfig || {};
  const models = (config.models || [{ id: "pro", label: "Pro" }]).slice(0, 1);
  const latestRecord = getQuestionRecord(subject.id, type.id, questionIndex);
  if (hasSuccessfulAiReview(latestRecord)) {
    openAiWritingReview(subject, type, questionIndex, "ready");
    return;
  }

  const pendingKey = `${subject.id}:${type.id}:${questionIndex}`;
  if (hasPendingAiReview() && !pendingAiReviewKeys.has(pendingKey)) {
    window.alert("已有一篇作文正在批改中，请等分数回来后再提交下一篇。");
    return;
  }
  if (pendingAiReviewKeys.has(pendingKey)) return;

  const cooldownRemainingMs = getAiReviewCooldownRemainingMs();
  if (cooldownRemainingMs > 0) {
    const seconds = Math.ceil(cooldownRemainingMs / 1000);
    window.alert(`This session can submit one AI review per minute. Please wait ${seconds} second${seconds === 1 ? "" : "s"} before submitting again.`);
    return;
  }

  pendingAiReviewKeys.add(pendingKey);
  markAiReviewSubmitted();
  openAiWritingReview(subject, type, questionIndex, "loading");

  try {
    const results = await Promise.allSettled(models.map((model) => requestAiWritingReview(question, essay, model)));
    const aiReviews = results.map((result, index) => {
      const modelConfig = models[index];
      const model = typeof modelConfig === "string" ? modelConfig : modelConfig.id;
      const modelLabel = typeof modelConfig === "string" ? modelConfig : modelConfig.label || modelConfig.id;
      if (result.status === "fulfilled") return result.value;
      return {
        model,
        modelLabel,
        error: result.reason?.message || "AI review failed.",
        reviewedAt: new Date().toISOString(),
      };
    });
    const key = getQuestionKey(subject.id, type.id, questionIndex);
    mockProgress.answers[key] = {
      ...(mockProgress.answers[key] || {}),
      graded: aiReviews.some((review) => !review.error),
      correct: null,
      aiReviews,
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    openAiWritingReview(subject, type, questionIndex, "ready");
  } catch (error) {
    openAiWritingReview(subject, type, questionIndex, "error", error.message || "AI 批改失败，请稍后再试。");
  } finally {
    pendingAiReviewKeys.delete(pendingKey);
  }
}

function leaveAndReviewSubject() {
  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  if (!subject || !type || !mockState.questionIndex) return;

  const confirmed = window.confirm("确定要离开当前题目并批改本科目吗？系统会批改当前科目下所有已作答题目。");
  if (!confirmed) return;

  if (type.id === "listening") {
    saveListeningGroupAnswers(subject, type);
  } else {
    saveCurrentAnswerFromForm();
  }

  mockState = { ...mockState, questionIndex: null };
  openSubjectReview(subject.id);
}

function showSecureApiNotice() {
  const config = window.rewardSchoolAiConfig || {};
  if (!config.requiresSecureApi || document.querySelector("[data-secure-api-notice]")) return;

  const notice = document.createElement("div");
  notice.className = "mock-ai-error";
  notice.dataset.secureApiNotice = "true";
  notice.innerHTML = `
    <strong>AI 批改需要切换到 HTTP 版本页面。</strong>
    当前是 HTTPS 页面，浏览器会拦截对 HTTP API 的请求。
    <a href="${escapeHTML(config.onlineFrontendUrl || "http://39.105.34.236/aeas-mock.html")}">打开可用版本</a>
  `;
  mockApp?.insertAdjacentElement("afterbegin", notice);
}

if (mockApp) {
  showSecureApiNotice();
  mockApp.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

    if (target.name === "mock-answer") {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      const question = getQuestion(type, mockState.questionIndex);
      if (getQuestionAnswerType(question) === "multiChoice") {
        const maxSelections = question.maxSelections || 2;
        const checked = [...mockStage.querySelectorAll('input[name="mock-answer"]:checked')];
        if (checked.length > maxSelections) {
          target.checked = false;
          return;
        }
      }
      saveCurrentAnswerFromForm();
      return;
    }

    if (target.name.startsWith("listening-answer-")) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type) saveListeningGroupAnswers(subject, type);
      return;
    }

    if (target.name.startsWith("listening-input-")) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type) saveListeningGroupAnswers(subject, type);
      return;
    }

    if (target.name.startsWith("mock-input-")) {
      saveCurrentAnswerFromForm();
    }
  });

  mockApp.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.resetPractice !== undefined) {
      const confirmed = window.confirm("确定要重新练习吗？当前浏览器里的做题记录会被清空。");
      if (confirmed) resetProgress();
      return;
    }

    if (target.dataset.reviewSubject) {
      openSubjectReview(target.dataset.reviewSubject);
      return;
    }

    const reset = target.dataset.reset;
    if (reset === "grades") {
      setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
      return;
    }
    if (reset === "subjects") {
      setMockState({ subjectId: null, typeId: null, questionIndex: null });
      return;
    }
    if (reset === "types") {
      setMockState({ typeId: null, questionIndex: null });
      return;
    }
    if (reset === "questions") {
      setMockState({ questionIndex: null });
      return;
    }

    if (target.dataset.gradeBand) {
      setMockState({ gradeBand: target.dataset.gradeBand, subjectId: null, typeId: null, questionIndex: null });
      return;
    }

    if (target.dataset.subject) {
      setMockState({ subjectId: target.dataset.subject, typeId: null, questionIndex: null });
      return;
    }

    if (target.dataset.type) {
      setMockState({ typeId: target.dataset.type, questionIndex: null });
      return;
    }

    if (target.dataset.leaveReview !== undefined) {
      leaveAndReviewSubject();
      return;
    }

    if (target.dataset.submitAiReview !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      const question = getQuestion(type, mockState.questionIndex);
      if (subject && type && question && isAiReviewQuestion(question)) {
        saveCurrentAnswerFromForm();
        submitAiWritingReview(subject, type, mockState.questionIndex);
      }
      return;
    }

    if (target.dataset.viewAiReview !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      const question = getQuestion(type, mockState.questionIndex);
      if (subject && type && question && isAiReviewQuestion(question)) {
        openAiWritingReview(subject, type, mockState.questionIndex);
      }
      return;
    }

    if (target.dataset.abandonAiQuestion !== undefined) {
      setMockState({ questionIndex: null });
      return;
    }

    if (target.dataset.retryAiQuestion !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type && mockState.questionIndex) {
        resetAiWritingReview(subject, type, mockState.questionIndex);
      }
      return;
    }

    if (target.dataset.startSpeakingRecording !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type && mockState.questionIndex) {
        startSpeakingRecording(subject, type, mockState.questionIndex, target.dataset.speakingSegment || "answer");
      }
      return;
    }

    if (target.dataset.stopSpeakingRecording !== undefined) {
      stopSpeakingRecording();
      return;
    }

    if (target.dataset.clearSpeakingRecording !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type && mockState.questionIndex) {
        clearSpeakingRecording(subject, type, mockState.questionIndex);
      }
      return;
    }

    if (target.dataset.submitSpeakingReview !== undefined) {
      window.alert("Speaking review interface is prepared. We will connect the scoring model after confirming the rubric and API path.");
      return;
    }

    if (target.dataset.question) {
      saveCurrentAnswerFromForm();
      setMockState({ questionIndex: Number(target.dataset.question) });
    }
  });

  renderMockApp();
}

document.addEventListener(
  "click",
  (event) => {
    const filterMenu = event.target?.closest?.(".mock-review-filter-menu");
    if (!filterMenu) return;

    const dropdown = filterMenu.closest(".mock-review-filter-dropdown");
    if (dropdown) {
      window.setTimeout(() => {
        dropdown.open = true;
      }, 0);
    }
  },
  true
);

document.addEventListener(
  "wheel",
  (event) => {
    const filterMenu = event.target?.closest?.(".mock-review-filter-menu");
    if (filterMenu) event.stopPropagation();
  },
  { capture: true, passive: false }
);

document.addEventListener("click", (event) => {
  document.querySelectorAll(".mock-review-filter-dropdown[open]").forEach((dropdown) => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
  });

  const detailButton = event.target?.closest?.("[data-toggle-detail]");
  if (detailButton) {
    const row = document.querySelector(`[data-detail-row="${detailButton.dataset.toggleDetail}"]`);
    if (row) row.hidden = !row.hidden;
    return;
  }

  const closeButton = event.target?.closest?.("[data-close-review]");
  if (closeButton) {
    closeSubjectReview();
    return;
  }

  const closeAiButton = event.target?.closest?.("[data-close-ai-review]");
  if (closeAiButton) {
    closeAiWritingReview();
    return;
  }

  if (event.target?.matches?.("[data-review-overlay]")) {
    closeSubjectReview();
  }

  if (event.target?.matches?.("[data-ai-review-overlay]")) {
    closeAiWritingReview();
  }
});

document.addEventListener("change", (event) => {
  if (event.target?.matches?.("[data-review-filter-all]")) {
    const overlay = event.target.closest("[data-review-overlay]");
    if (overlay) {
      overlay.querySelectorAll("[data-review-filter]").forEach((input) => {
        input.checked = event.target.checked;
      });
      updateReviewFilters(overlay);
    }
    return;
  }

  if (event.target?.matches?.("[data-review-filter]")) {
    const overlay = event.target.closest("[data-review-overlay]");
    if (overlay) updateReviewFilters(overlay);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSubjectReview();
    closeAiWritingReview();
  }
});

window.addEventListener("beforeunload", () => {
  cleanupSpeakingStream();
});

