const MOCK_STORAGE_KEY = "rewardSchoolAeasMockProgressV2";
const rawMathQuestionGroups = window.aeasMockMathQuestionsByType || {};
const rawReadingQuestionGroups = window.aeasMockReadingQuestionsByType || {};
const rawVocabularyQuestionGroups = window.aeasMockVocabularyQuestionsByType || {};
const rawGapFillingQuestionGroups = window.aeasMockGapFillingQuestionsByType || {};
const rawWritingQuestionGroups = window.aeasMockWritingQuestionsByType || {};
const rawNonVerbalQuestionGroups = window.aeasMockNonVerbalQuestionsByType || {};
const nonVerbalMeta = window.aeasMockNonVerbalMeta || {};
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
    .replace(/\s+/g, "")
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
    const userValues = parseStoredInputAnswer(recordAnswer);
    const correctValues = parseStoredInputAnswer(correctAnswer);
    const fieldIds = (question.inputFields || [{ id: "answer" }]).map((field) => field.id);
    return fieldIds.every((fieldId) => {
      const acceptedValues = Array.isArray(correctValues[fieldId]) ? correctValues[fieldId] : [correctValues[fieldId]];
      return acceptedValues.some((acceptedValue) => normalizeInputAnswer(userValues[fieldId]) === normalizeInputAnswer(acceptedValue));
    });
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
      mockProgress.answers[key] = {
        ...record,
        graded: canGrade,
        correct: canGrade ? compareAnswers(record.answer, correctAnswer, question) : null,
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

function getQuestionStatusClass(record, question) {
  if (!record) return "";
  if (isAiReviewQuestion(question)) return "is-attempted";
  if (!record.graded) return "is-attempted";
  return record.correct ? "is-correct" : "is-wrong";
}

function getQuestionStatusText(record, question) {
  if (!record) return "未作答";
  if (isAiReviewQuestion(question)) return "已做";
  if (!record.graded) return "已作答";
  return record.correct ? "正确" : "错误";
}

function getQuestionGroups(type) {
  const groups = [];
  const groupMap = new Map();

  getQuestions(type).forEach((question) => {
    const groupTitle = question.passageTitle || "Practice Set";
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
  return type.id === "reading" && getQuestions(type).some((question) => question.passageTitle);
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
            ? `<span class="mock-option-image"><img src="${image}" alt="选项 ${value}" /></span>`
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

function renderQuestion(subject, type, questionIndex) {
  if (!mockStage) return;

  const questionNumbers = getQuestionNumbers(type);
  const currentPosition = questionNumbers.indexOf(questionIndex);
  const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
  const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
  const key = getQuestionKey(subject.id, type.id, questionIndex);
  const record = mockProgress.answers[key];
  const question = getQuestion(type, questionIndex);
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
    ? `<div class="mock-question-visual"><img src="${question.image}" alt="${type.title} question ${questionIndex} visual" /></div>`
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
  const aiActionButtons = `
    <div class="mock-question-actions">
      <button class="button ghost dark" type="button" ${previous ? `data-question="${previous}"` : "disabled"}>上一题</button>
      <button class="button primary" type="button" ${canRetryAiReview ? "data-view-ai-review" : "data-submit-ai-review"}>
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
  const config = window.rewardSchoolAiConfig || {};
  if (!config.apiKey) throw new Error("AI API key is missing.");
  const model = typeof modelConfig === "string" ? modelConfig : modelConfig.id;
  const modelLabel = typeof modelConfig === "string" ? modelConfig : modelConfig.label || modelConfig.id;

  if (!config.endpoint) throw new Error("AI API endpoint is missing.");

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an AEAS writing assessment engine. Return only valid JSON matching the requested schema. No markdown, no code fences, no extra text.",
        },
        {
          role: "user",
          content: buildAiWritingPrompt(question, essay),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed: ${response.status} ${errorText.slice(0, 180)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response.");
  return {
    ...normalizeAiWritingReviewResult(extractJsonObject(content)),
    model,
    modelLabel,
  };
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
  const models = config.models || [{ id: "pro", label: "Pro" }];
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
  }
}

function leaveAndReviewSubject() {
  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  if (!subject || !type || !mockState.questionIndex) return;

  const confirmed = window.confirm("确定要离开当前题目并批改本科目吗？系统会批改当前科目下所有已作答题目。");
  if (!confirmed) return;

  saveCurrentAnswerFromForm();

  mockState = { ...mockState, questionIndex: null };
  openSubjectReview(subject.id);
}

if (mockApp) {
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
