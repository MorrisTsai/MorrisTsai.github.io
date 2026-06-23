const MOCK_STORAGE_KEY = "rewardSchoolAeasMockProgressV2";
const PLACEHOLDER_IMAGE = "assets/mock-test-placeholder.svg";
const rawMathQuestionGroups = window.aeasMockMathQuestionsByType || {};
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

function createPlaceholderQuestions(count) {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    image: PLACEHOLDER_IMAGE,
    correctAnswer: ["B", "D", "A", "C", "B"][index % 5],
    explanation: "这道题目前仍为 placeholder。正式题目上线后，这里会显示对应详解与解题步骤。",
  }));
}

const mockSubjects = [
  {
    id: "english",
    title: "English Language Proficiency",
    subtitle: "英语能力",
    description: "阅读、词汇、写作与英文表达基础诊断。",
    types: [
      { id: "reading", title: "Reading", subtitle: "阅读理解", questions: 5 },
      { id: "vocabulary", title: "Vocabulary", subtitle: "词汇运用", questions: 5 },
      { id: "grammar", title: "Language Use", subtitle: "语法与语言运用", questions: 5 },
      { id: "listening", title: "Listening", subtitle: "听力理解", questions: 5 },
      { id: "writing", title: "Writing", subtitle: "写作任务", questions: 5 },
      { id: "speaking", title: "Speaking Interview", subtitle: "口语面试", questions: 5 },
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
    description: "图形规律、空间推理与模式识别诊断。",
    types: [
      { id: "patterns", title: "图形规律", subtitle: "Pattern Reasoning", questions: 5 },
      { id: "sequence", title: "序列判断", subtitle: "Sequence Logic", questions: 5 },
      { id: "matrices", title: "矩阵推理", subtitle: "Figure Matrices", questions: 5 },
      { id: "analogies", title: "图形类比", subtitle: "Figure Analogies", questions: 5 },
      { id: "classification", title: "图形分类", subtitle: "Classification", questions: 5 },
      { id: "rotation", title: "旋转与折叠", subtitle: "Rotation & Folding", questions: 5 },
      { id: "spatial", title: "空间推理", subtitle: "Spatial Reasoning", questions: 5 },
    ],
  },
];

const mockApp = document.querySelector("[data-mock-app]");
const mockStage = document.querySelector("[data-mock-stage]");
const mockBreadcrumb = document.querySelector("[data-mock-breadcrumb]");
const mockProgressPanel = document.querySelector("[data-mock-progress]");

let mockState = {
  subjectId: null,
  typeId: null,
  questionIndex: null,
};

let mockProgress = loadProgress();

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
  };
  saveProgress();
  setMockState({ subjectId: null, typeId: null, questionIndex: null });
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

function getQuestionKey(subjectId, typeId, questionIndex) {
  return `${subjectId}.${typeId}.${questionIndex}`;
}

function getQuestionNumbers(type) {
  return getQuestions(type).map((question) => question.number);
}

function getQuestions(type) {
  return Array.isArray(type.questions) ? type.questions : createPlaceholderQuestions(type.questions);
}

function getQuestion(type, questionIndex) {
  return getQuestions(type).find((question) => question.number === questionIndex);
}

function getCorrectAnswer(type, questionIndex) {
  return getQuestion(type, questionIndex)?.correctAnswer || "A";
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
      mockProgress.answers[key] = {
        ...record,
        graded: true,
        correct: record.answer === correctAnswer,
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

  const parts = ["科目"];
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

function renderSubjectList() {
  if (!mockStage) return;
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <p class="eyebrow">Step 01</p>
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
          <p class="eyebrow">Step 02</p>
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
          const isRealSet = Array.isArray(type.questions);
          return `
            <button class="mock-select-card" type="button" data-type="${type.id}">
              <span>${type.subtitle}</span>
              <strong>${type.title}</strong>
              <small>${stats.total} 道${isRealSet ? "练习题" : " placeholder 题"}</small>
              <em>${stats.attempted}/${stats.total} 已做 · 正确 ${stats.correct}</em>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSubjectReview(subject) {
  const stats = getSubjectStats(subject);
  const rows = subject.types
    .flatMap((type) =>
      getQuestionNumbers(type).map((number) => {
        const record = getQuestionRecord(subject.id, type.id, number);
        const status = !record
          ? "未作答"
          : !record.graded
            ? "未批改"
            : record.correct
              ? "正确"
              : "错误";
        const statusClass = !record ? "" : !record.graded ? "is-pending" : record.correct ? "is-correct" : "is-wrong";
        const answer = record?.answer || "-";
        const correctAnswer = getCorrectAnswer(type, number);
        const question = getQuestion(type, number);
        const detailId = `${subject.id}-${type.id}-${number}`;
        return `
          <tr>
            <td>${type.subtitle}</td>
            <td>第 ${number} 题</td>
            <td>${answer}</td>
            <td>${correctAnswer}</td>
            <td><span class="mock-review-status ${statusClass}">${status}</span></td>
            <td><button class="mock-detail-button" type="button" data-toggle-detail="${detailId}">详解</button></td>
          </tr>
          <tr class="mock-detail-row" data-detail-row="${detailId}" hidden>
            <td colspan="6">${escapeHTML(question?.explanation || "这道题暂无详解。")}</td>
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
            <p>已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题，正确 ${stats.correct} 题。</p>
          </div>
          <button class="mock-review-close" type="button" data-close-review>关闭</button>
        </div>
        <div class="mock-review-summary">
          <span>完成率 <strong>${stats.attempted}/${stats.total}</strong></span>
          <span>批改率 <strong>${stats.graded}/${stats.total}</strong></span>
          <span>正确题数 <strong>${stats.correct}</strong></span>
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

function getQuestionStatusClass(record) {
  if (!record) return "";
  if (!record.graded) return "is-attempted";
  return record.correct ? "is-correct" : "is-wrong";
}

function getQuestionStatusText(record) {
  if (!record) return "未作答";
  if (!record.graded) return "已作答";
  return record.correct ? "正确" : "错误";
}

function renderQuestionList(subject, type) {
  if (!mockStage) return;
  const stats = getTypeStats(subject, type);

  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="types">返回题型</button>
      <p class="eyebrow">Step 03</p>
      <h3>${type.subtitle} / ${type.title}</h3>
      <p>请选择题号进入练习。本题型已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题。</p>
    </div>
    <div class="mock-question-grid">
      ${getQuestionNumbers(type)
        .map((number) => {
          const record = getQuestionRecord(subject.id, type.id, number);
          return `
            <button class="mock-question-button ${getQuestionStatusClass(record)}" type="button" data-question="${number}">
              <span>${getQuestionStatusText(record)}</span>
              <strong>${number}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function getAnswerOptions(question) {
  if (Array.isArray(question?.options) && question.options.length) {
    return question.options.map((option) => [option.value, option.label]);
  }

  return ["A", "B", "C", "D"].map((value) => [value, `Placeholder option ${value}`]);
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
  const isPlaceholder = !question?.text && (!question?.image || question.image === PLACEHOLDER_IMAGE);
  const questionText = question?.text || "这里未来会显示正式题干、选项、图片或写作提示。";
  const questionContext = question?.context ? `<p class="mock-question-context">${escapeHTML(question.context)}</p>` : "";
  const questionImage = question?.image
    ? `<div class="mock-question-visual"><img src="${question.image}" alt="${type.subtitle}第 ${questionIndex} 题图示" /></div>`
    : "";

  mockStage.innerHTML = `
    <div class="mock-question-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" data-reset="questions">返回题号</button>
        <span>${subject.subtitle} · ${type.subtitle} · 第 ${questionIndex} 题</span>
      </div>
      <div class="mock-question-layout">
        <div class="mock-question-content">
          <p class="eyebrow">${isPlaceholder ? "Placeholder Question" : "Practice Question"}</p>
          <h3>第 ${questionIndex} 题</h3>
          ${questionContext}
          <p class="mock-question-text">${escapeHTML(questionText)}</p>
          ${questionImage}
        </div>
        <div class="mock-question-panel">
          <p class="eyebrow">Answer</p>
          <h3>选择答案</h3>
          <div class="mock-options" aria-label="选项">
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
                  <label class="${optionClass}">
                    <input type="radio" name="mock-answer" value="${value}" ${checked} />
                    <span>${value}. ${escapeHTML(label)}</span>
                  </label>
                `;
              })
              .join("")}
          </div>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" ${previous ? `data-question="${previous}"` : "disabled"}>上一题</button>
            <button class="button ghost dark" type="button" data-leave-review>离开并批改</button>
            <button class="button primary" type="button" ${next ? `data-question="${next}"` : "disabled"}>下一题</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMockApp() {
  if (!mockApp || !mockStage) return;

  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  renderBreadcrumb(subject, type);
  renderProgressPanel();

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

function leaveAndReviewSubject() {
  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  if (!subject || !type || !mockState.questionIndex) return;

  const confirmed = window.confirm("确定要离开当前题目并批改本科目吗？系统会批改当前科目下所有已作答题目。");
  if (!confirmed) return;

  const selected = mockStage.querySelector('input[name="mock-answer"]:checked');
  if (selected) {
    saveCurrentAnswer(selected.value);
  }

  mockState = { ...mockState, questionIndex: null };
  openSubjectReview(subject.id);
}

if (mockApp) {
  mockApp.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "mock-answer") {
      saveCurrentAnswer(target.value);
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

    if (target.dataset.question) {
      setMockState({ questionIndex: Number(target.dataset.question) });
    }
  });

  renderMockApp();
}

document.addEventListener("click", (event) => {
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

  if (event.target?.matches?.("[data-review-overlay]")) {
    closeSubjectReview();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSubjectReview();
  }
});
