const MOCK_STORAGE_KEY = "rewardSchoolAeasMockProgressV2";
const MOCK_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";
const PRACTICE_KIND = "aeas-mock";
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
const pendingAiReviewMeta = new Map();
const speakingReviewProgressLogs = new Map();
const speakingReviewProgressTimers = new Map();
const MOCK_SCRIPT_BASE_URL = (() => {
  try {
    return new URL(".", document.currentScript?.src || window.location.href).href;
  } catch (error) {
    return "";
  }
})();
const SPEAKING_RECORDINGS_DB_NAME = "rewardSchoolAeasMockRecordings";
const SPEAKING_RECORDINGS_DB_VERSION = 1;
const SPEAKING_RECORDINGS_STORE = "recordings";
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

const FULL_MOCK_TEST_INTERNAL_MINUTES = 30;
const PRE_CLASS_MOCK_TEST_ID = "full-mock-test";
const RANDOM_MOCK_TEST_ID = "random-mock-test";
let randomMockSession = {
  active: false,
  completed: false,
  awaitingStart: false,
};

function cloneQuestionForMockTest(question, number, sourceType) {
  return {
    ...question,
    number,
    sourceNumber: question.sourceNumber || question.number,
    sourceType,
  };
}

function takeQuestionsForMockTest(questions, count, sourceType) {
  return (questions || [])
    .slice(0, count)
    .map((question, index) => cloneQuestionForMockTest(question, index + 1, sourceType));
}

function shuffleMockItems(items) {
  const shuffled = [...(items || [])];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function takeRandomQuestionsForMockTest(questions, count, sourceType) {
  return shuffleMockItems(questions || [])
    .slice(0, count)
    .map((question, index) => cloneQuestionForMockTest(question, index + 1, sourceType));
}

function getFirstReadingMockGroup() {
  const readingQuestions = rawReadingQuestionGroups.reading || [];
  const firstPassageTitle = readingQuestions.find((question) => question.passageTitle)?.passageTitle;
  const group = firstPassageTitle
    ? readingQuestions.filter((question) => question.passageTitle === firstPassageTitle).slice(0, 6)
    : readingQuestions.slice(0, 6);
  return group.map((question, index) => cloneQuestionForMockTest(question, index + 1, "reading"));
}

function getRandomReadingMockGroup() {
  const readingQuestions = rawReadingQuestionGroups.reading || [];
  const groupsByPassage = readingQuestions.reduce((result, question) => {
    const key = question.passageTitle || question.passageText || "default";
    result[key] = result[key] || [];
    result[key].push(question);
    return result;
  }, {});
  const groups = Object.values(groupsByPassage).filter((group) => group.length);
  const selectedGroup = groups.length ? shuffleMockItems(groups)[0] : readingQuestions;
  return (selectedGroup || []).slice(0, 6).map((question, index) => cloneQuestionForMockTest(question, index + 1, "reading"));
}

function getMathMockQuestions() {
  return Object.values(mathQuestionGroups)
    .flat()
    .slice(0, 4)
    .map((question, index) => cloneQuestionForMockTest(question, index + 1, "math-reasoning"));
}

function getRandomMathMockQuestions() {
  return takeRandomQuestionsForMockTest(Object.values(mathQuestionGroups).flat(), 4, "math-reasoning");
}

function getRandomMonologueMockQuestion() {
  const monologues = (rawSpeakingQuestionGroups.speaking || []).filter((question) => question.speakingMode === "monologue");
  const fallback = monologues[0];
  const selected = monologues.length ? monologues[Math.floor(Math.random() * monologues.length)] : fallback;
  return selected ? [cloneQuestionForMockTest(selected, 1, "speaking")] : [];
}

function createFullMockTestSubject() {
  return {
    id: PRE_CLASS_MOCK_TEST_ID,
    title: "Pre-Class Assessment",
    subtitle: "课前评估",
    description: "固定题目，用来做课前能力诊断，最后统一查看评分结果。",
    isFullMockTest: true,
    internalTargetMinutes: FULL_MOCK_TEST_INTERNAL_MINUTES,
    examStartedAt: null,
    types: [
      {
        id: "mock-vocabulary",
        title: "Vocabulary",
        subtitle: "词汇",
        internalMinutes: 6,
        questions: takeQuestionsForMockTest(rawVocabularyQuestionGroups.vocabulary || [], 10, "vocabulary"),
      },
      {
        id: "mock-gap-filling",
        title: "Gap Filling",
        subtitle: "词汇填空",
        internalMinutes: 6,
        questions: takeQuestionsForMockTest(rawGapFillingQuestionGroups["gap-filling"] || [], 10, "gap-filling"),
      },
      {
        id: "mock-reading",
        title: "Reading",
        subtitle: "阅读",
        internalMinutes: 10,
        questions: getFirstReadingMockGroup(),
      },
      {
        id: "mock-math",
        title: "Mathematical Reasoning",
        subtitle: "数学推理",
        internalMinutes: 5,
        questions: getMathMockQuestions(),
      },
      {
        id: "speaking",
        title: "Speaking Interview",
        subtitle: "口语面试",
        internalMinutes: 3,
        questions: getRandomMonologueMockQuestion(),
      },
    ],
  };
}

function createRandomMockTestSubject() {
  return {
    id: RANDOM_MOCK_TEST_ID,
    title: "Random Mock Test",
    subtitle: "随机模拟考",
    description: "每次进入都会重新抽题。开始后请一次做完，离开等同放弃本次考试。",
    isFullMockTest: true,
    isStreamingMockTest: true,
    internalTargetMinutes: FULL_MOCK_TEST_INTERNAL_MINUTES,
    sessionId: `random-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    examStartedAt: null,
    types: [
      {
        id: "mock-vocabulary",
        title: "Vocabulary",
        subtitle: "词汇",
        internalMinutes: 6,
        questions: takeRandomQuestionsForMockTest(rawVocabularyQuestionGroups.vocabulary || [], 10, "vocabulary"),
      },
      {
        id: "mock-gap-filling",
        title: "Gap Filling",
        subtitle: "词汇填空",
        internalMinutes: 6,
        questions: takeRandomQuestionsForMockTest(rawGapFillingQuestionGroups["gap-filling"] || [], 10, "gap-filling"),
      },
      {
        id: "mock-reading",
        title: "Reading",
        subtitle: "阅读",
        internalMinutes: 10,
        questions: getRandomReadingMockGroup(),
      },
      {
        id: "mock-math",
        title: "Mathematical Reasoning",
        subtitle: "数学推理",
        internalMinutes: 5,
        questions: getRandomMathMockQuestions(),
      },
      {
        id: "speaking",
        title: "Speaking Interview",
        subtitle: "口语面试",
        internalMinutes: 3,
        questions: getRandomMonologueMockQuestion(),
      },
    ],
  };
}

const mockSubjects = [
  createFullMockTestSubject(),
  createRandomMockTestSubject(),
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
let authSession = loadAuthSession();
if (authSession?.user?.id && mockProgress?.ownerUserId !== authSession.user.id) {
  mockProgress = createEmptyProgress(authSession.user.id);
}
let progressSyncTimer = 0;
let progressSyncInFlight = false;
let progressSyncPending = false;
let writingTimerInterval = null;
let activeSpeakingRecorder = null;
let activeSpeakingStream = null;
let activeSpeakingChunks = [];
let activeSpeakingKey = "";
let activeSpeakingStartedAt = 0;
let activeSpeakingMaxSeconds = 0;
let activeSpeakingTimerInterval = null;
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

function loadAuthSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(MOCK_AUTH_STORAGE_KEY) || "null");
    if (saved?.token) return { token: saved.token, user: null, status: "loading" };
  } catch (error) {
    // Ignore corrupted auth state and let the user sign in again.
  }

  return null;
}

function saveAuthSession(session) {
  authSession = session?.token
    ? { ...session, status: session.status || (session.user?.id ? "ready" : "loading") }
    : null;
  if (authSession?.token) {
    localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify({ token: authSession.token }));
  } else {
    localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
  }
  renderProgressPanel();
}

function setAuthMemberStatus(status, user = authSession?.user || null) {
  if (!authSession?.token) return;
  authSession = { ...authSession, user, status };
  renderProgressPanel();
}

function getAuthToken() {
  return authSession?.token || "";
}

function isAuthenticated() {
  return Boolean(getAuthToken() && authSession?.status === "ready" && authSession?.user?.id);
}

function getPracticeScopeId() {
  return authSession?.user?.id || mockProgress.sessionId;
}

function createEmptyProgress(ownerUserId = authSession?.user?.id || null) {
  return {
    sessionId: createSessionId(),
    startedAt: new Date().toISOString(),
    ownerUserId,
    answers: {},
    timers: {},
    examReports: [],
  };
}

function compactMockProgressForStorage(progress) {
  const compact = JSON.parse(JSON.stringify(progress));
  if (authSession?.user?.id) {
    compact.ownerUserId = authSession.user.id;
  } else {
    delete compact.ownerUserId;
  }
  Object.values(compact.answers || {}).forEach((answer) => {
    if (!answer?.speakingRecordings) return;
    Object.values(answer.speakingRecordings).forEach((recording) => {
      delete recording.dataUrl;
    });
  });
  return compact;
}

function saveProgress() {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
    queueProgressSync();
    return;
  } catch (error) {
    console.warn("Could not save full mock progress:", error);
  }

  try {
    const fallback = compactMockProgressForStorage(mockProgress);
    Object.values(fallback.answers || {}).forEach((answer) => {
      delete answer.speakingRecordings;
    });
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(fallback));
    queueProgressSync();
  } catch (error) {
    console.warn("Could not save mock progress even without recordings:", error);
  }
}

function queueProgressSync(delayMs = 1200) {
  if (!getAuthToken() || !window.rewardSchoolApi?.savePracticeProgress) return;
  window.clearTimeout(progressSyncTimer);
  progressSyncTimer = window.setTimeout(() => {
    void syncProgressNow();
  }, delayMs);
}

async function syncProgressNow() {
  if (!getAuthToken() || !window.rewardSchoolApi?.savePracticeProgress) return;
  if (progressSyncInFlight) {
    progressSyncPending = true;
    return;
  }

  progressSyncInFlight = true;
  try {
    await window.rewardSchoolApi.savePracticeProgress({
      token: getAuthToken(),
      kind: PRACTICE_KIND,
      sessionId: getPracticeScopeId(),
      progress: compactMockProgressForStorage(mockProgress),
    });
    progressSyncPending = false;
  } catch (error) {
    console.warn("Could not sync practice progress:", error);
  } finally {
    progressSyncInFlight = false;
    if (progressSyncPending) {
      progressSyncPending = false;
      queueProgressSync(600);
    }
  }
}

function countProgressAnswers(progress) {
  return Object.keys(progress?.answers || {}).length;
}

async function hydrateProgressAfterLogin() {
  if (!getAuthToken() || !window.rewardSchoolApi?.getPracticeProgress) return;
  if (!isAuthenticated()) return;
  const userId = authSession.user.id;

  try {
    const remote = await window.rewardSchoolApi.getPracticeProgress({
      token: getAuthToken(),
      kind: PRACTICE_KIND,
    });
    const remoteProgress = remote?.progress;
    mockProgress = remoteProgress?.sessionId
      ? { ...remoteProgress, ownerUserId: userId }
      : createEmptyProgress(userId);
    purgeSubjectProgress(RANDOM_MOCK_TEST_ID);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
    renderMockApp();
    if (!remoteProgress?.sessionId) queueProgressSync(100);
  } catch (error) {
    console.warn("Could not load cloud practice progress:", error);
  }
}

function recordPracticeAttempt(subject, type, questionIndex, answerKind, answer, result = {}) {
  if (subject?.isFullMockTest) return;
  if (!getAuthToken() || !window.rewardSchoolApi?.savePracticeAttempt) return;
  if (!subject || !type || !Number.isFinite(Number(questionIndex))) return;

  const attempt = {
    kind: PRACTICE_KIND,
    sessionId: getPracticeScopeId(),
    questionKey: getQuestionKey(subject.id, type.id, questionIndex),
    subjectId: subject.id,
    typeId: type.id,
    questionIndex: Number(questionIndex),
    answerKind,
    answer,
    result,
  };

  window.rewardSchoolApi.savePracticeAttempt({
    token: getAuthToken(),
    attempt,
  }).catch((error) => {
    console.warn("Could not save practice attempt:", error);
  });
}

function resetProgress() {
  speakingRecordings.forEach((recording) => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
  });
  speakingRecordings.clear();
  const fullMockIndex = mockSubjects.findIndex((subject) => subject.id === PRE_CLASS_MOCK_TEST_ID);
  if (fullMockIndex >= 0) {
    mockSubjects[fullMockIndex] = createFullMockTestSubject();
  }
  const randomMockIndex = mockSubjects.findIndex((subject) => subject.id === RANDOM_MOCK_TEST_ID);
  if (randomMockIndex >= 0) {
    mockSubjects[randomMockIndex] = createRandomMockTestSubject();
  }
  randomMockSession = { active: false, completed: false };
  mockProgress = createEmptyProgress(authSession?.user?.id || null);
  saveProgress();
  setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
}

function purgeSubjectProgress(subjectId) {
  Object.keys(mockProgress.answers || {}).forEach((key) => {
    if (key.startsWith(`${subjectId}.`)) delete mockProgress.answers[key];
  });
  mockProgress.attempts = (mockProgress.attempts || []).filter((attempt) => attempt.subjectId !== subjectId);
  Object.keys(mockProgress.timers || {}).forEach((key) => {
    if (key.startsWith(`${subjectId}.`)) delete mockProgress.timers[key];
  });
}

function replaceRandomMockSubject() {
  const randomMockIndex = mockSubjects.findIndex((subject) => subject.id === RANDOM_MOCK_TEST_ID);
  if (randomMockIndex >= 0) {
    mockSubjects[randomMockIndex] = createRandomMockTestSubject();
  }
  return mockSubjects[randomMockIndex] || null;
}

function startRandomMockTest() {
  cleanupSpeakingStream();
  purgeSubjectProgress(RANDOM_MOCK_TEST_ID);
  const randomSubject = replaceRandomMockSubject();
  if (randomSubject) randomSubject.examStartedAt = new Date().toISOString();
  randomMockSession = { active: true, completed: false };
  saveProgress();
  const subject = findSubject(RANDOM_MOCK_TEST_ID);
  const firstType = subject?.types.find((type) => getQuestions(type).length);
  const firstQuestion = firstType ? getQuestions(firstType)[0] : null;
  if (!subject || !firstType || !firstQuestion) {
    showSystemToast("暂时无法开始", "随机模拟考题库还没有准备好。");
    return;
  }
  setMockState({ subjectId: subject.id, typeId: firstType.id, questionIndex: firstQuestion.number });
}

function showRandomMockIntro() {
  randomMockSession = { active: false, completed: false, awaitingStart: true };
  setMockState({ subjectId: RANDOM_MOCK_TEST_ID, typeId: null, questionIndex: null });
}

function ensureExamStartedAt(subject) {
  if (!subject?.isFullMockTest || subject.examStartedAt) return;
  subject.examStartedAt = new Date().toISOString();
}

function abandonRandomMockTest(options = {}) {
  cleanupSpeakingStream();
  purgeSubjectProgress(RANDOM_MOCK_TEST_ID);
  replaceRandomMockSubject();
  randomMockSession = { active: false, completed: false };
  saveProgress();
  if (options.goHome !== false) {
    setMockState({ subjectId: null, typeId: null, questionIndex: null });
  }
}

function resetLocalPracticeForSignedOutUser() {
  window.clearTimeout(progressSyncTimer);
  progressSyncPending = false;
  speakingRecordings.forEach((recording) => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
  });
  speakingRecordings.clear();
  mockProgress = createEmptyProgress(null);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
}

function findSubject(subjectId) {
  return mockSubjects.find((subject) => subject.id === subjectId);
}

function findType(subject, typeId) {
  return subject?.types.find((type) => type.id === typeId);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toAbsoluteUrl(path, baseUrl) {
  try {
    return new URL(path, baseUrl).href;
  } catch (error) {
    return "";
  }
}

function getMockAssetCandidates(path) {
  const normalized = String(path || "").replaceAll("\\", "/").trim();
  if (!normalized) return [];
  if (/^(https?:|data:|blob:|file:|\/)/i.test(normalized)) return [normalized];

  const siteRelative = normalized.replace(/^\.?\/*github-pages-site\//, "");
  const candidates = [
    toAbsoluteUrl(siteRelative, MOCK_SCRIPT_BASE_URL || window.location.href),
    toAbsoluteUrl(siteRelative, window.location.href),
    toAbsoluteUrl(`github-pages-site/${siteRelative}`, window.location.origin ? `${window.location.origin}/` : window.location.href),
    siteRelative,
    `github-pages-site/${siteRelative}`,
  ];

  return [...new Set(candidates.filter(Boolean))];
}

function resolveMockAssetPath(path) {
  return getMockAssetCandidates(path)[0] || "";
}

function getMockImageAttributes(path, altText) {
  const candidates = getMockAssetCandidates(path);
  const src = candidates[0] || "";
  return `src="${escapeHTML(src)}" alt="${escapeHTML(altText)}" loading="lazy" decoding="async" data-mock-asset="${escapeHTML(path)}" data-mock-asset-attempt="0" onerror="retryMockAssetImage(this)"`;
}

function retryMockAssetImage(image) {
  const candidates = getMockAssetCandidates(image?.dataset?.mockAsset || "");
  const currentAttempt = Number(image?.dataset?.mockAssetAttempt || 0);
  const nextAttempt = currentAttempt + 1;
  const nextSrc = candidates[nextAttempt];
  if (!image || !nextSrc) {
    if (image) image.onerror = null;
    return;
  }

  image.dataset.mockAssetAttempt = String(nextAttempt);
  image.src = nextSrc;
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

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function parseSpeakingDurationSeconds(value) {
  const text = String(value || "").toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 30;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 30;
  if (text.includes("minute") || text.includes("分钟") || text.includes("分鐘") || text.includes("min")) {
    return Math.round(amount * 60);
  }
  return Math.round(amount);
}

function getSpeakingRecordingMaxSeconds(segment) {
  const suggestedSeconds = parseSpeakingDurationSeconds(segment?.timeLimit);
  const bufferSeconds = suggestedSeconds >= 120 ? 20 : 10;
  return suggestedSeconds + bufferSeconds;
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
  return question?.reviewMode === "ai" || question?.speakingMode === "monologue";
}

function isSpeakingScoredQuestion(question) {
  return question?.speakingMode === "monologue";
}

function parseReviewDetailTarget(detailButton) {
  const subjectId = detailButton?.dataset?.detailSubject;
  const typeId = detailButton?.dataset?.detailType;
  const questionIndex = Number(detailButton?.dataset?.detailQuestion);
  if (!subjectId || !typeId || !Number.isFinite(questionIndex) || questionIndex <= 0) return null;

  const subject = findSubject(subjectId);
  const type = findType(subject, typeId);
  if (!subject || !type) return null;
  return { subject, type, questionIndex };
}

function openAiReviewFromDetail(detailButton) {
  const target = parseReviewDetailTarget(detailButton);
  if (!target) return false;

  const { subject, type, questionIndex } = target;
  const question = getQuestion(type, questionIndex);
  const record = getQuestionRecord(subject.id, type.id, questionIndex);

  if (isSpeakingScoredQuestion(question)) {
    const status = record?.speakingReviewStatus === "loading"
      ? "loading"
      : record?.speakingReview?.error || record?.speakingReviewStatus === "error"
        ? "error"
        : "ready";
    openAiSpeakingReview(subject, type, questionIndex, status, record?.speakingReview?.error || "");
    return true;
  }

  if (question?.reviewMode === "ai") {
    const status = record?.aiReviewStatus === "loading"
      ? "loading"
      : record?.aiReviews?.some?.((review) => review.error) || record?.aiReviewStatus === "error"
        ? "error"
        : "ready";
    const errorMessage = record?.aiReviews?.find?.((review) => review.error)?.error || "";
    openAiWritingReview(subject, type, questionIndex, status, errorMessage);
    return true;
  }

  return false;
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
  return mockSubjects.filter((subject) => !subject.isFullMockTest).flatMap((subject) =>
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
  const accountName = authSession?.user
    ? escapeHTML(authSession.user.displayName || authSession.user.email)
    : authSession?.token && authSession.status === "loading"
      ? "正在取得会员状态"
      : authSession?.token && authSession.status === "failed"
        ? "会员状态取得失败"
        : "未登录";
  const accountNote = authSession?.user
    ? "当前练习记录绑定到此账号"
    : authSession?.token && authSession.status === "loading"
      ? "正在从服务器读取会员状态"
      : authSession?.token && authSession.status === "failed"
        ? "无法确认账号状态，请重新检查"
        : "登录后才能进入题库";

  mockProgressPanel.innerHTML = `
    <div class="mock-progress-card">
      <span>练习账号</span>
      <strong>${accountName}</strong>
      <small>${accountNote}</small>
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
    ${renderAuthPanel()}
    <button class="mock-reset-button" type="button" data-reset-practice>开始新一轮练习</button>
  `;
}

function renderAuthPanel() {
  if (authSession?.token && authSession.status === "loading") {
    return `
      <div class="mock-auth-card">
        <span>Cloud Account</span>
        <strong>正在取得会员状态</strong>
        <small>正在从服务器确认账号、邮箱验证和权限。</small>
        <button type="button" data-auth-refresh>重新检查</button>
      </div>
    `;
  }

  if (authSession?.token && authSession.status === "failed") {
    return `
      <div class="mock-auth-card">
        <span>Cloud Account</span>
        <strong>会员状态取得失败</strong>
        <small>无法从服务器确认账号状态。请检查 API 连接，或重新登录。</small>
        <button type="button" data-auth-refresh>重新检查</button>
        <button type="button" data-auth-logout>退出登录</button>
      </div>
    `;
  }

  if (authSession?.user) {
    const verificationText = authSession.user.superUser
      ? "超级账号 · AI 批改不限速"
      : authSession.user.emailVerified
        ? "邮箱已验证 · 可以使用 AI 批改"
        : "邮箱未验证 · 验证后才能使用 AI 批改";
    return `
      <div class="mock-auth-card">
        <span>Cloud Account</span>
        <strong>${escapeHTML(authSession.user.displayName || authSession.user.email)}</strong>
        <small>${escapeHTML(authSession.user.email)} · ${verificationText}</small>
        <button type="button" data-auth-logout>退出登录</button>
      </div>
    `;
  }

  return `
    <div class="mock-auth-card">
      <span>Cloud Account</span>
      <strong>登录后开始练习</strong>
      <small>所有练习、作文和录音都会绑定到账号。</small>
      <div class="mock-auth-actions">
        <button type="button" data-open-auth="login">登录</button>
        <button type="button" data-open-auth="register">注册</button>
      </div>
    </div>
  `;
}

function renderAuthModal(mode = "login") {
  const isRegister = mode === "register";
  return `
    <div class="mock-review-overlay" data-auth-overlay>
      <form class="mock-auth-dialog" data-auth-form data-auth-mode="${isRegister ? "register" : "login"}">
        <div class="mock-review-header">
          <div>
            <p class="eyebrow">Cloud Account</p>
            <h3>${isRegister ? "注册账号" : "登录账号"}</h3>
            <p>${isRegister ? "创建账号后即可开始保存练习记录。" : "登录后继续你的练习记录。"}</p>
          </div>
          <button class="mock-review-close" type="button" data-close-auth>关闭</button>
        </div>
        <div class="mock-auth-dialog-body">
          <input type="email" name="email" autocomplete="email" placeholder="Email" required />
          <input type="password" name="password" autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="Password" required minlength="8" />
          ${isRegister ? `<input type="text" name="displayName" autocomplete="name" placeholder="Name" required />` : ""}
          <button type="submit">${isRegister ? "注册" : "登录"}</button>
          <button type="button" class="mock-auth-switch" data-open-auth="${isRegister ? "login" : "register"}">
            ${isRegister ? "已有账号，去登录" : "没有账号，去注册"}
          </button>
          ${isRegister ? "" : `<button type="button" class="mock-auth-switch" data-request-password-reset>忘记密码？发送重设邮件</button>`}
          <small>${isRegister ? "注册后请到邮箱点击验证链接；验证后才能使用 AI 批改。" : "AI 批改需要先完成邮箱验证。"}</small>
          <small data-auth-message></small>
        </div>
      </form>
    </div>
  `;
}

function openAuthModal(mode = "login") {
  document.querySelector("[data-auth-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", renderAuthModal(mode));
}

function closeAuthModal() {
  document.querySelector("[data-auth-overlay]")?.remove();
}

function isQuestionAttemptedForFullMock(subject, type, question) {
  const record = getQuestionRecord(subject.id, type.id, question.number);
  if (!record) return false;
  if (question.speakingMode === "monologue") {
    return getSpeakingCompletedSegments(subject, type, question.number, question).length >= getSpeakingExpectedSegmentCount(question);
  }
  if (question.reviewMode === "ai") {
    return Boolean(parseStoredInputAnswer(record.answer).essay?.trim());
  }
  return Boolean(record.answer);
}

function getFullMockCompletion(subject) {
  const questions = subject.types.flatMap((type) => getQuestions(type).map((question) => ({ type, question })));
  const attempted = questions.filter(({ type, question }) => isQuestionAttemptedForFullMock(subject, type, question)).length;
  return { attempted, total: questions.length, complete: questions.length > 0 && attempted === questions.length };
}

function getStreamingMockSteps(subject) {
  return (subject?.types || []).flatMap((type) =>
    getQuestions(type).map((question) => ({
      type,
      question,
    }))
  );
}

function getExamReportKind(subject) {
  return subject?.id === RANDOM_MOCK_TEST_ID ? "random" : "pre-class";
}

function getExamReportTitle(subject) {
  return subject?.id === RANDOM_MOCK_TEST_ID ? "随机模拟考" : "课前评估";
}

function buildExamReport(subject) {
  const stats = getSubjectStats(subject);
  const submittedAt = new Date().toISOString();
  return {
    id: `${subject.id}-${Date.now()}`,
    subjectId: subject.id,
    kind: getExamReportKind(subject),
    title: getExamReportTitle(subject),
    startedAt: subject.examStartedAt || submittedAt,
    submittedAt,
    stats,
    typeStats: subject.types.map((type) => ({
      typeId: type.id,
      title: type.title,
      subtitle: type.subtitle,
      ...getTypeStats(subject, type),
    })),
  };
}

function saveExamReport(subject) {
  if (!subject?.isFullMockTest) return null;
  const report = buildExamReport(subject);
  const reports = Array.isArray(mockProgress.examReports) ? mockProgress.examReports : [];
  mockProgress.examReports = [report, ...reports].slice(0, 20);
  saveProgress();
  return report;
}

function getExamReports(kind = "") {
  const reports = Array.isArray(mockProgress.examReports) ? mockProgress.examReports : [];
  return kind ? reports.filter((report) => report.kind === kind) : reports;
}

function formatReportDate(value) {
  if (!value) return "时间未记录";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function getStreamingMockPosition(subject, typeId, questionIndex) {
  return getStreamingMockSteps(subject).findIndex(
    (step) => step.type.id === typeId && Number(step.question.number) === Number(questionIndex)
  );
}

function getNextStreamingMockStep(subject, typeId, questionIndex) {
  const steps = getStreamingMockSteps(subject);
  const currentIndex = getStreamingMockPosition(subject, typeId, questionIndex);
  return currentIndex >= 0 ? steps[currentIndex + 1] || null : steps[0] || null;
}

function isRandomMockInProgress() {
  return Boolean(
    randomMockSession.active &&
      !randomMockSession.completed &&
      mockState.gradeBand &&
      mockState.subjectId === RANDOM_MOCK_TEST_ID
  );
}

function getRandomMockLeaveMessage() {
  return "随机模拟考还没做完。现在离开会放弃本次考试，已作答内容不会保留。";
}

function confirmAbandonRandomMockTest() {
  if (!isRandomMockInProgress()) return true;
  return window.confirm(getRandomMockLeaveMessage());
}

function goToNextStreamingMockStep() {
  const subject = findSubject(mockState.subjectId);
  const type = findType(subject, mockState.typeId);
  if (!subject?.isStreamingMockTest || !type || !mockState.questionIndex) return;

  saveCurrentAnswerFromForm();
  const currentQuestion = getQuestion(type, mockState.questionIndex);
  if (currentQuestion && !isQuestionAttemptedForFullMock(subject, type, currentQuestion)) {
    showSystemToast("先完成这一题", "随机模拟考需要按顺序作答，完成当前题后才能继续。");
    return;
  }
  const nextStep = getNextStreamingMockStep(subject, type.id, mockState.questionIndex);
  if (nextStep) {
    setMockState({ typeId: nextStep.type.id, questionIndex: nextStep.question.number });
    return;
  }

  const completion = getFullMockCompletion(subject);
  if (!completion.complete) {
    showSystemToast("还有题目没完成", `目前已完成 ${completion.attempted}/${completion.total} 题，请先补齐再提交。`);
    return;
  }
  randomMockSession.completed = true;
  setMockState({ typeId: null, questionIndex: null });
}

async function refreshAuthStateFromServer(options = {}) {
  const token = getAuthToken();
  if (!token || !window.rewardSchoolApi?.getCurrentUser) return null;
  const hydrateProgress = Boolean(options.hydrateProgress);

  setAuthMemberStatus("loading", null);
  try {
    const user = await window.rewardSchoolApi.getCurrentUser({ token });
    authSession = { token, user, status: "ready" };
    renderProgressPanel();

    if (mockProgress?.ownerUserId !== user.id) {
      if (!hydrateProgress && countProgressAnswers(mockProgress) > 0) {
        mockProgress = { ...mockProgress, ownerUserId: user.id };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
      } else {
      mockProgress = createEmptyProgress(user.id);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
      }
    }

    renderMockApp();
    if (hydrateProgress) void hydrateProgressAfterLogin();
    return user;
  } catch (error) {
    if (error?.status === 401) {
      saveAuthSession(null);
      setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
      return null;
    }

    authSession = { token, user: null, status: "failed" };
    renderProgressPanel();
    setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
    return null;
  }
}

function renderEmailVerificationModal(message = "") {
  const email = authSession?.user?.email || "";
  const displayName = authSession?.user?.displayName || authSession?.user?.email || "未登录";
  return `
    <div class="mock-review-overlay" data-email-verification-overlay>
      <div class="mock-auth-dialog mock-email-dialog" role="dialog" aria-modal="true" aria-labelledby="email-verification-title">
        <div class="mock-email-dialog-header">
          <div>
            <p class="eyebrow">Email Verification</p>
            <h3 id="email-verification-title">需要先验证邮箱</h3>
            <p>AI 批改只开放给已验证邮箱的账号使用。</p>
          </div>
          <button class="mock-review-close" type="button" data-close-email-verification>关闭</button>
        </div>
        <div class="mock-auth-dialog-body mock-email-dialog-body">
          <div class="mock-email-account">
            <span>当前账号</span>
            <strong>${escapeHTML(displayName)}</strong>
            ${email ? `<small>${escapeHTML(email)}</small>` : ""}
          </div>
          <button class="mock-email-primary" type="button" data-resend-verification>重新寄送验证信</button>
          <p class="mock-email-note" data-email-verification-message>${escapeHTML(message)}</p>
        </div>
      </div>
    </div>
  `;
}

function openEmailVerificationModal(message = "请先到邮箱点击验证链接；验证后才能使用 AI 批改。") {
  document.querySelector("[data-email-verification-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", renderEmailVerificationModal(message));
}

function closeEmailVerificationModal() {
  document.querySelector("[data-email-verification-overlay]")?.remove();
}

function setEmailVerificationMessage(message, isError = false) {
  const node = document.querySelector("[data-email-verification-message]");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-error", Boolean(isError));
}

async function handleResendVerification() {
  const button = document.querySelector("[data-resend-verification]");
  const token = getAuthToken();
  if (!token || !window.rewardSchoolApi?.resendVerification) {
    setEmailVerificationMessage("账号服务还没有加载完成，请稍后再试。", true);
    return;
  }

  if (button) button.disabled = true;
  setEmailVerificationMessage("正在重新寄送验证信...");

  try {
    const result = await window.rewardSchoolApi.resendVerification({ token });
    setEmailVerificationMessage(result?.message || "验证信已寄出，请检查邮箱。");
  } catch (error) {
    setEmailVerificationMessage(error.message || "重新寄送验证信失败。", true);
  } finally {
    if (button) button.disabled = false;
  }
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
  const preClassMockSubject = mockSubjects.find((subject) => subject.id === PRE_CLASS_MOCK_TEST_ID);
  const randomMockSubject = mockSubjects.find((subject) => subject.id === RANDOM_MOCK_TEST_ID);
  const practiceSubjects = mockSubjects.filter((subject) => !subject.isFullMockTest);
  const examReports = getExamReports();
  const fullMockMarkup = preClassMockSubject
    ? (() => {
        const completion = getFullMockCompletion(preClassMockSubject);
        return `
          <section class="mock-full-test-section">
            <div class="mock-full-test-head">
              <div>
                <p class="eyebrow">Pre-Class Assessment</p>
                <h4>课前评估</h4>
                <p>固定题目，用来做课前能力诊断，最后统一提交评分。</p>
              </div>
              <span>${completion.attempted}/${completion.total} 已完成</span>
            </div>
            <button class="mock-full-test-card" type="button" data-subject="${preClassMockSubject.id}">
              <span>${preClassMockSubject.subtitle}</span>
              <strong>${preClassMockSubject.title}</strong>
              <small>${preClassMockSubject.description}</small>
              <em>进入课前评估</em>
            </button>
          </section>
        `;
      })()
    : "";
  const randomMockMarkup = randomMockSubject
    ? `
      <section class="mock-full-test-section mock-random-test-section">
        <div class="mock-full-test-head">
          <div>
            <p class="eyebrow">Random Mock Test</p>
            <h4>随机模拟考</h4>
            <p>每次开始都会重新抽题。考试中离开会视为放弃，本次作答不会保留。</p>
          </div>
          <span>一次做完</span>
        </div>
        <button class="mock-full-test-card mock-random-test-card" type="button" data-start-random-mock-test>
          <span>${randomMockSubject.subtitle}</span>
          <strong>${randomMockSubject.title}</strong>
          <small>${randomMockSubject.description}</small>
          <em>开始随机模拟考</em>
        </button>
      </section>
    `
    : "";
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="grades">返回年级选择</button>
      <p class="eyebrow">Step 02</p>
      <h3>选择测试科目</h3>
      <p>选择科目与题型后进入题号列表。做题情况会记录在当前浏览器，完成后可查看批改结果与逐题详解。</p>
    </div>
    ${randomMockMarkup}
    <div class="mock-section-label">
      <span>题型测试</span>
    </div>
    <div class="mock-card-grid">
      ${practiceSubjects
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
    <section class="mock-report-history">
      <div class="mock-full-test-head">
        <div>
          <p class="eyebrow">Exam Reports</p>
          <h4>考试成绩</h4>
          <p>所有模拟考和课前测验的成绩单都在这里看，不会混入题型测试记录。</p>
        </div>
        <span>${examReports.length} 份记录</span>
      </div>
      <button class="mock-report-entry" type="button" data-open-exam-reports>
        <strong>查看考试成绩单</strong>
        <small>${examReports.length ? "点进去查看每次考试的开启时间、考试类型与成绩。" : "还没有成绩也可以点进去查看记录状态。"}</small>
        <em>进入成绩单</em>
      </button>
    </section>
    ${fullMockMarkup}
  `;
}

function renderTypeList(subject) {
  if (!mockStage) return;
  const subjectStats = getSubjectStats(subject);
  const fullMockCompletion = subject.isFullMockTest ? getFullMockCompletion(subject) : null;
  if (subject.isStreamingMockTest) {
    const steps = getStreamingMockSteps(subject);
    if (randomMockSession.awaitingStart) {
      mockStage.innerHTML = `
        <div class="mock-stage-heading">
          <button class="mock-back" type="button" data-reset="subjects">返回科目</button>
          <div class="mock-stage-title-row">
            <div>
              <p class="eyebrow">Random Mock Test</p>
              <h3>随机模拟考说明</h3>
              <p>这是一套考试流程，不是分题练习。点下方按钮后才会正式开始并重新抽题。</p>
            </div>
          </div>
        </div>
        <div class="mock-exam-brief">
          <strong>开始前请确认</strong>
          <ul>
            <li>题型与课前评估相同：Vocabulary、Gap Filling、Reading、Mathematical Reasoning、Speaking Interview。</li>
            <li>正式开始后会按顺序作答，不能跳题，也不能回到题号列表。</li>
            <li>中途离开、返回题库或关闭页面，会视为放弃；下次进入会重新抽题。</li>
            <li>全部完成后才统一提交评分，成绩会放在「考试成绩」区，不会进入分题练习记录。</li>
          </ul>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" data-reset="subjects">先不开始</button>
            <button class="button primary" type="button" data-confirm-start-random-mock-test>正式开始</button>
          </div>
        </div>
      `;
      return;
    }
    mockStage.innerHTML = `
      <div class="mock-stage-heading">
        <button class="mock-back" type="button" data-abandon-random-mock-test>放弃并返回</button>
        <div class="mock-stage-title-row">
          <div>
            <p class="eyebrow">Random Mock Test</p>
            <h3>${subject.title}</h3>
            <p>${randomMockSession.completed ? "本次随机模拟考已完成，可以统一提交评分。" : "请按顺序完成题目。考试中离开会视为放弃本次考试。"}</p>
          </div>
          <button class="mock-review-button" type="button" data-submit-full-mock-test ${fullMockCompletion?.complete ? "" : "disabled"}>
            提交整套评分
            <span>${fullMockCompletion?.attempted || 0}/${fullMockCompletion?.total || 0} 已完成</span>
          </button>
        </div>
      </div>
      <div class="mock-streaming-summary">
        <strong>${randomMockSession.completed ? "随机模拟考已结束" : "考试进行中"}</strong>
        <span>${steps.length} 题 · Vocabulary / Gap Filling / Reading / Mathematical Reasoning / Speaking Interview</span>
        ${
          randomMockSession.completed
            ? "<p>请点击上方按钮提交评分。评分完成后会显示本次成绩单；以后可回到入口页的「考试成绩」区查看历史记录。</p>"
            : "<p>如果你离开页面、返回题库或关闭浏览器，本次随机卷会作废，下次会重新抽题。</p>"
        }
      </div>
    `;
    return;
  }
  mockStage.innerHTML = `
    <div class="mock-stage-heading">
      <button class="mock-back" type="button" data-reset="subjects">返回科目</button>
      <div class="mock-stage-title-row">
        <div>
          <p class="eyebrow">Step 03</p>
          <h3>${subject.title}</h3>
          <p>${subject.description}</p>
        </div>
        ${subject.isFullMockTest
          ? `<button class="mock-review-button" type="button" data-submit-full-mock-test ${fullMockCompletion?.complete ? "" : "disabled"}>
              提交整套评分
              <span>${fullMockCompletion?.attempted || 0}/${fullMockCompletion?.total || 0} 已完成</span>
            </button>`
          : `<button class="mock-review-button" type="button" data-review-subject="${subject.id}">
              批改 / 查看结果
              <span>${subjectStats.correct}/${subjectStats.total} 正确 · 已做 ${subjectStats.attempted}</span>
            </button>`}
      </div>
    </div>
    <div class="mock-card-grid">
      ${subject.types
        .map((type) => {
          const stats = getTypeStats(subject, type);
          const hasQuestions = stats.total > 0;
          const label = subject.isFullMockTest
            ? `${stats.total} 题 · ${stats.attempted}/${stats.total} 已完成`
            : `${stats.total} 道练习题`;
          return `
            <button class="mock-select-card ${hasQuestions ? "" : "is-disabled"}" type="button" ${
              hasQuestions ? `data-type="${type.id}"` : "disabled"
            }>
              <span>${type.subtitle}</span>
              <strong>${type.title}</strong>
              <small>${hasQuestions ? label : "题库整理中，暂未开放作答"}</small>
              <em>${hasQuestions ? (subject.isFullMockTest ? "完成后统一评分" : `${stats.attempted}/${stats.total} 已做 · 正确 ${stats.correct}`) : "施工中"}</em>
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
            : record.speakingReviewStatus === "loading" || record.aiReviewStatus === "loading"
              ? "批改中"
              : hasSuccessfulAiReview(record)
                ? "已批改"
                : record.speakingReview?.error || record.aiReviews?.some?.((review) => review.error)
                  ? "批改失败"
                  : "未批改"
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
            ? "已有反馈"
            : record?.speakingReviewStatus === "loading" || record?.aiReviewStatus === "loading"
              ? "批改中"
              : "待补充"
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
            <td><button class="mock-detail-button" type="button" data-toggle-detail="${detailId}" data-detail-subject="${subject.id}" data-detail-type="${type.id}" data-detail-question="${number}">详解</button></td>
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

function renderExamReport(report) {
  const typeRows = (report.typeStats || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHTML(item.title)}</td>
          <td>${item.attempted}/${item.total}</td>
          <td>${item.graded}/${item.total}</td>
          <td>${item.correct}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="mock-review-overlay" data-exam-report-overlay>
      <div class="mock-review-dialog" role="dialog" aria-modal="true" aria-label="${escapeHTML(report.title)} 成绩单">
        <div class="mock-review-header">
          <div>
            <p class="eyebrow">Exam Report</p>
            <h3>${escapeHTML(report.title)}</h3>
            <p>开启：${escapeHTML(formatReportDate(report.startedAt || report.submittedAt))} · 提交：${escapeHTML(formatReportDate(report.submittedAt))} · 完成 ${report.stats.attempted}/${report.stats.total} 题，已批改 ${report.stats.graded} 题，正确 ${report.stats.correct} 题。</p>
          </div>
          <button class="mock-review-close" type="button" data-close-exam-report>关闭</button>
        </div>
        <div class="mock-review-summary">
          <span>完成率 <strong>${report.stats.attempted}/${report.stats.total}</strong></span>
          <span>批改率 <strong>${report.stats.graded}/${report.stats.total}</strong></span>
          <span>正确题数 <strong>${report.stats.correct}</strong></span>
        </div>
        <div class="mock-review-table-wrap">
          <table class="mock-review-table">
            <thead>
              <tr>
                <th>小节</th>
                <th>完成</th>
                <th>批改</th>
                <th>正确</th>
              </tr>
            </thead>
            <tbody>${typeRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderExamReportsList() {
  const reports = getExamReports();
  const rows = reports.length
    ? reports
        .map(
          (report) => `
            <button class="mock-report-row" type="button" data-open-exam-report="${escapeHTML(report.id)}">
              <span>开启时间：${escapeHTML(formatReportDate(report.startedAt || report.submittedAt))}</span>
              <strong>${escapeHTML(report.title)}</strong>
              <small>考试类型：${report.kind === "random" ? "模拟考" : "课前测试"} · 提交时间：${escapeHTML(formatReportDate(report.submittedAt))} · ${report.stats.attempted}/${report.stats.total} 完成</small>
            </button>
          `
        )
        .join("")
    : `<div class="mock-report-empty">还没有纪录</div>`;

  return `
    <div class="mock-review-overlay" data-exam-reports-overlay>
      <div class="mock-review-dialog" role="dialog" aria-modal="true" aria-label="考试成绩单">
        <div class="mock-review-header">
          <div>
            <p class="eyebrow">Exam Reports</p>
            <h3>考试成绩单</h3>
            <p>这里会列出每次开启的考试、考试类型与提交后的成绩。</p>
          </div>
          <button class="mock-review-close" type="button" data-close-exam-reports>关闭</button>
        </div>
        <div class="mock-report-list">${rows}</div>
      </div>
    </div>
  `;
}

function openExamReportsList() {
  document.querySelector("[data-exam-reports-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", renderExamReportsList());
}

function openExamReport(reportId) {
  const report = getExamReports().find((item) => item.id === reportId);
  if (!report) {
    showSystemToast("找不到成绩单", "这份历史成绩可能已经被新的本地数据覆盖。");
    return;
  }
  document.querySelector("[data-exam-report-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", renderExamReport(report));
}

function openSubjectReview(subjectId, filterTypeId = "") {
  const subject = findSubject(subjectId);
  if (!subject) return;
  gradeSubjectAnswers(subject);
  renderMockApp();
  renderProgressPanel();
  document.body.insertAdjacentHTML("beforeend", renderSubjectReview(subject));
  const overlay = document.querySelector("[data-review-overlay]");
  if (overlay && filterTypeId) {
    overlay.querySelectorAll("[data-review-filter]").forEach((input) => {
      input.checked = input.value === filterTypeId;
    });
    updateReviewFilters(overlay);
  }
}

function closeSubjectReview() {
  document.querySelector("[data-review-overlay]")?.remove();
  renderMockApp();
}

function renderAiFeedbackDetail(record) {
  if (record?.speakingReviewStatus === "loading") {
    return formatBilingualFeedback("口语评分仍在进行中。你可以留在当前页面，也可以稍后回来点击详解查看结果。");
  }
  if (record?.speakingReview?.error) {
    return formatBilingualFeedback(`口语评分失败：${sanitizeReviewMessage(record.speakingReview.error)}`);
  }
  if (record?.speakingReview && !record.speakingReview.error) {
    const review = record.speakingReview;
    const calibration = buildCalibrationMeta(review);
    return `
        <div class="mock-ai-detail">
        <h4>口语评分 · ${escapeHTML(formatFivePointScore(calibration.score5))}/5 · ${escapeHTML(review.level || "")}</h4>
        <p>${formatBilingualFeedback(review.overall_feedback || "")}</p>
        <strong>主要问题</strong>
        ${renderListItems(review.main_issues, "暂无主要问题反馈。")}
        <strong>改进建议</strong>
        ${renderListItems(review.improvements, "暂无改进建议。")}
      </div>
    `;
  }

  if (record?.aiReviewStatus === "loading") {
    return formatBilingualFeedback("写作批改仍在进行中。你可以稍后回来点击详解查看结果。");
  }

  const reviews = Array.isArray(record?.aiReviews) ? record.aiReviews.filter((review) => !review.error) : [];
  if (!reviews.length) {
    return formatBilingualFeedback("这道题暂无评分反馈。提交并批改后，反馈会显示在这里。");
  }

  return reviews
    .map(
      (review) => {
        const calibration = buildCalibrationMeta(review);
        return `
        <div class="mock-ai-detail">
          <h4>写作评分 · ${escapeHTML(formatFivePointScore(calibration.score5))}/5 · ${escapeHTML(review.level || "")}</h4>
          <p>${formatBilingualFeedback(review.overall_feedback_zh || review.overall_feedback || "")}</p>
          <strong>重点改进</strong>
          ${renderListItems(review.top_3_improvements_zh || review.top_3_improvements, "暂无修改建议。")}
        </div>
      `;
      }
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
  if (record?.speakingReview && !record.speakingReview.error && Number.isFinite(Number(record.speakingReview.total))) {
    return true;
  }

  return Array.isArray(record?.aiReviews) && record.aiReviews.some((review) => (
    !review.error &&
    Number.isFinite(Number(review.total)) &&
    hasChineseAiFeedback(review)
  ));
}

function hasChineseAiFeedback(review) {
  const text = [
    review?.language_accuracy_reason,
    review?.vocabulary_reason,
    review?.content_organisation_reason,
    review?.overall_feedback,
    ...(Array.isArray(review?.strengths) ? review.strengths : []),
    ...(Array.isArray(review?.weaknesses) ? review.weaknesses : []),
    ...(Array.isArray(review?.top_3_improvements) ? review.top_3_improvements : []),
  ].join("\n");
  return /[\u3400-\u9fff]/.test(text);
}

function isCurrentQuestion(subjectId, typeId, questionIndex) {
  return mockState.subjectId === subjectId &&
    mockState.typeId === typeId &&
    Number(mockState.questionIndex) === Number(questionIndex);
}

function setPendingReviewMeta(pendingKey, meta) {
  pendingAiReviewMeta.set(pendingKey, {
    ...meta,
    startedAt: new Date().toISOString(),
  });
}

function clearPendingReviewMeta(pendingKey) {
  pendingAiReviewMeta.delete(pendingKey);
}

function showReviewToast(message, meta) {
  document.querySelector("[data-review-toast]")?.remove();
  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = "mock-review-toast";
  toast.dataset.reviewToast = "1";
  toast.innerHTML = `
    <strong>${escapeHTML(message)}</strong>
    <span>点击查看结果</span>
  `;
  toast.addEventListener("click", () => {
    toast.remove();
    if (meta?.kind === "speaking") {
      openAiSpeakingReview(meta.subject, meta.type, meta.questionIndex, meta.status || "ready", meta.errorMessage || "");
      return;
    }
    if (meta?.kind === "writing") {
      openAiWritingReview(meta.subject, meta.type, meta.questionIndex, meta.status || "ready", meta.errorMessage || "");
    }
  });
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 5000);
}

function showSystemToast(message, detail = "") {
  document.querySelector("[data-review-toast]")?.remove();
  const toast = document.createElement("div");
  toast.className = "mock-review-toast mock-system-toast";
  toast.dataset.reviewToast = "1";
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <strong>${escapeHTML(message)}</strong>
    ${detail ? `<span>${escapeHTML(detail)}</span>` : ""}
  `;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 5000);
}

function maybeNotifyReviewComplete(meta, isError = false) {
  if (!meta || isCurrentQuestion(meta.subject.id, meta.type.id, meta.questionIndex) && document.querySelector("[data-ai-review-overlay]")) {
    return;
  }
  showReviewToast(isError ? "批改遇到问题" : "批改结果已完成", meta);
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
  if (question?.speakingMode === "monologue") return hasSuccessfulAiReview(record) ? "已评分" : record.answer === "completed" ? "已完成" : "进行中";
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
  return ["reading", "mock-reading", "listening"].includes(type.id) && getQuestions(type).some((question) => question.passageTitle || question.listeningGroupId);
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
        <div class="mock-stage-title-row">
          <div>
            <p class="eyebrow">Step 04</p>
            <h3>${type.subtitle} / ${type.title}</h3>
            <p>请先进入题组浏览所有题目，再播放音频作答。本题型已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题。</p>
          </div>
          ${subject.isFullMockTest ? "" : `<button class="mock-review-button" type="button" data-review-subject="${subject.id}" data-review-type="${type.id}">
            批改 / 查看结果
            <span>只看本题型</span>
          </button>`}
        </div>
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
    if (subject.isFullMockTest) {
      const questionListMarkup = `
        <div class="mock-question-grid">
          ${getQuestions(type)
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
      `;

      mockStage.innerHTML = `
        <div class="mock-stage-heading">
          <button class="mock-back" type="button" data-reset="types">返回模拟测试</button>
          <div class="mock-stage-title-row">
            <div>
              <p class="eyebrow">Speaking Interview</p>
              <h3>Monologue</h3>
              <p>请完成这道口语题，回到模拟测试页面后统一提交评分。</p>
            </div>
          </div>
        </div>
        ${questionListMarkup}
      `;
      return;
    }

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
        <div class="mock-stage-title-row">
          <div>
            <p class="eyebrow">Step 04</p>
            <h3>Speaking Interview</h3>
          <p>${subject.isFullMockTest ? "请完成这道 Monologue 题，回到模拟测试页面后统一提交评分。" : "口语练习分成三个类型：Warm-up 不评分，Monologue 完成主答与随机追问后再整体评分，Picture-based Questions 根据图片逐题作答。"}</p>
          </div>
          ${subject.isFullMockTest ? "" : `<button class="mock-review-button" type="button" data-review-subject="${subject.id}" data-review-type="${type.id}">
            批改 / 查看结果
            <span>只看本题型</span>
          </button>`}
        </div>
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
      <div class="mock-stage-title-row">
        <div>
          <p class="eyebrow">Step 04</p>
          <h3>${type.subtitle} / ${type.title}</h3>
          <p>${subject.isFullMockTest ? "请完成本小节题目，回到模拟测试页面后统一提交评分。" : `请选择题号进入练习。本题型已做 ${stats.attempted}/${stats.total} 题，已批改 ${stats.graded} 题。`}</p>
        </div>
        ${subject.isFullMockTest ? "" : `<button class="mock-review-button" type="button" data-review-subject="${subject.id}" data-review-type="${type.id}">
          批改 / 查看结果
          <span>只看本题型</span>
        </button>`}
      </div>
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

function isGroupedInputQuestion(question) {
  return Boolean(question?.sourceRange && Array.isArray(question.inputFields) && question.inputFields.length > 1);
}

function getQuestionDisplayText(question, fallbackText) {
  if (isGroupedInputQuestion(question) && /^Questions?\s+\d+/i.test(question?.text || "")) {
    return "Definitions";
  }

  return question?.text || fallbackText;
}

function getInputFieldDisplayLabel(question, field) {
  const label = field?.label || "";
  if (!isGroupedInputQuestion(question)) return label;
  return label.replace(/^\s*\d+\.\s*/, "");
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
            const label = getInputFieldDisplayLabel(question, field);
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
                <span>${escapeHTML(label)}</span>
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
            ? `<span class="mock-option-image"><img ${getMockImageAttributes(image, `选项 ${value}`)} /></span>`
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
      recordPracticeAttempt(subject, type, questionNumber, "answer", { answer: values });
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
    recordPracticeAttempt(subject, type, questionNumber, "answer", { answer: selected.value });
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

function getSpeakingRecordingStorageKey(subjectId, typeId, questionIndex, segmentId) {
  return `${MOCK_STORAGE_KEY}:${subjectId}.${typeId}.${questionIndex}:${segmentId}`;
}

function openSpeakingRecordingsDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = window.indexedDB.open(SPEAKING_RECORDINGS_DB_NAME, SPEAKING_RECORDINGS_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SPEAKING_RECORDINGS_STORE)) {
        db.createObjectStore(SPEAKING_RECORDINGS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open speaking recordings database."));
  });
}

async function saveSpeakingRecordingBlob(storageKey, blob, metadata = {}) {
  const db = await openSpeakingRecordingsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SPEAKING_RECORDINGS_STORE, "readwrite");
    tx.objectStore(SPEAKING_RECORDINGS_STORE).put({ blob, ...metadata }, storageKey);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Could not save speaking recording."));
    };
  });
}

async function loadSpeakingRecordingBlob(storageKey) {
  const db = await openSpeakingRecordingsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SPEAKING_RECORDINGS_STORE, "readonly");
    const request = tx.objectStore(SPEAKING_RECORDINGS_STORE).get(storageKey);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("Could not load speaking recording."));
    };
  });
}

async function deleteSpeakingRecordingBlobs(storageKeys) {
  if (!storageKeys.length || !window.indexedDB) return;

  const db = await openSpeakingRecordingsDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SPEAKING_RECORDINGS_STORE, "readwrite");
    const store = tx.objectStore(SPEAKING_RECORDINGS_STORE);
    storageKeys.forEach((storageKey) => store.delete(storageKey));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Could not delete speaking recordings."));
    };
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not save recording.")));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl, fallbackType = "audio/webm") {
  const [header, base64Data = ""] = String(dataUrl || "").split(",");
  const typeMatch = header.match(/^data:([^;]+);base64$/i);
  const contentType = typeMatch?.[1] || fallbackType;
  const binary = window.atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

async function persistSpeakingRecording(subject, type, questionIndex, segmentId, recording) {
  if (!recording?.blob) return;
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const existing = mockProgress.answers[progressKey] || {};
  const storedRecordings = { ...(existing.speakingRecordings || {}) };
  const storageKey = getSpeakingRecordingStorageKey(subject.id, type.id, questionIndex, segmentId);

  try {
    await saveSpeakingRecordingBlob(storageKey, recording.blob, {
      type: recording.blob.type || "audio/webm",
      recordedAt: recording.recordedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Could not persist speaking recording to IndexedDB:", error);
    return;
  }

  storedRecordings[segmentId] = {
    storageKey,
    type: recording.blob.type || "audio/webm",
    size: recording.blob.size || 0,
    recordedAt: recording.recordedAt || new Date().toISOString(),
  };
  mockProgress.answers[progressKey] = {
    ...existing,
    speakingRecordings: storedRecordings,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();

  if (getAuthToken() && window.rewardSchoolApi?.uploadPracticeAudio) {
    try {
      const upload = await window.rewardSchoolApi.uploadPracticeAudio({
        token: getAuthToken(),
        kind: PRACTICE_KIND,
        sessionId: mockProgress.sessionId,
        questionKey: progressKey,
        segmentId,
        blob: recording.blob,
      });
      const latest = mockProgress.answers[progressKey] || {};
      const latestRecordings = { ...(latest.speakingRecordings || {}) };
      latestRecordings[segmentId] = {
        ...(latestRecordings[segmentId] || storedRecordings[segmentId]),
        serverUpload: upload,
      };
      mockProgress.answers[progressKey] = {
        ...latest,
        speakingRecordings: latestRecordings,
        updatedAt: new Date().toISOString(),
      };
      saveProgress();
      recordPracticeAttempt(subject, type, questionIndex, "speaking-recording", {
        segmentId,
        upload,
      });
    } catch (error) {
      console.warn("Could not upload speaking recording:", error);
    }
  }
}

async function restoreSpeakingRecordings(subject, type, questionIndex, question) {
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const storedRecordings = { ...(mockProgress.answers[progressKey]?.speakingRecordings || {}) };
  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  let didStripLegacyData = false;

  for (const segment of segments) {
    const stored = storedRecordings[segment.id];
    const recordingKey = getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id);
    if (!stored || speakingRecordings.has(recordingKey)) continue;

    try {
      let blob = null;
      if (stored.storageKey) {
        const entry = await loadSpeakingRecordingBlob(stored.storageKey);
        blob = entry?.blob || null;
      } else if (stored.dataUrl) {
        blob = dataUrlToBlob(stored.dataUrl, stored.type || "audio/webm");
        const storageKey = getSpeakingRecordingStorageKey(subject.id, type.id, questionIndex, segment.id);
        await saveSpeakingRecordingBlob(storageKey, blob, {
          type: stored.type || blob.type || "audio/webm",
          recordedAt: stored.recordedAt || new Date().toISOString(),
        });
        storedRecordings[segment.id] = {
          storageKey,
          type: stored.type || blob.type || "audio/webm",
          size: stored.size || blob.size || 0,
          recordedAt: stored.recordedAt || new Date().toISOString(),
        };
        didStripLegacyData = true;
      }

      if (!blob) {
        delete storedRecordings[segment.id];
        didStripLegacyData = true;
        continue;
      }

      speakingRecordings.set(recordingKey, {
        blob,
        url: URL.createObjectURL(blob),
        recordedAt: stored.recordedAt || new Date().toISOString(),
      });
    } catch (error) {
      delete storedRecordings[segment.id];
      didStripLegacyData = true;
    }
  }

  if (didStripLegacyData) {
    mockProgress.answers[progressKey] = {
      ...(mockProgress.answers[progressKey] || {}),
      speakingRecordings: storedRecordings,
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
  }
}

async function migrateAllLegacySpeakingRecordings() {
  if (!window.indexedDB) return;

  let didMigrate = false;
  for (const [progressKey, answer] of Object.entries(mockProgress.answers || {})) {
    const parts = progressKey.split(".");
    if (parts.length !== 3) continue;

    const [subjectId, typeId, questionIndex] = parts;
    const storedRecordings = { ...(answer?.speakingRecordings || {}) };
    let questionRecordingsChanged = false;

    for (const [segmentId, stored] of Object.entries(storedRecordings)) {
      if (!stored?.dataUrl || stored.storageKey) continue;

      try {
        const blob = dataUrlToBlob(stored.dataUrl, stored.type || "audio/webm");
        const storageKey = getSpeakingRecordingStorageKey(subjectId, typeId, Number(questionIndex), segmentId);
        await saveSpeakingRecordingBlob(storageKey, blob, {
          type: stored.type || blob.type || "audio/webm",
          recordedAt: stored.recordedAt || new Date().toISOString(),
        });
        storedRecordings[segmentId] = {
          storageKey,
          type: stored.type || blob.type || "audio/webm",
          size: stored.size || blob.size || 0,
          recordedAt: stored.recordedAt || new Date().toISOString(),
        };
        questionRecordingsChanged = true;
        didMigrate = true;
      } catch (error) {
        console.warn("Could not migrate legacy speaking recording:", error);
      }
    }

    if (questionRecordingsChanged) {
      mockProgress.answers[progressKey] = {
        ...answer,
        speakingRecordings: storedRecordings,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (didMigrate) saveProgress();
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
    const level = Math.min(1, rms / 18);
    meter.style.setProperty("--speaking-level", `${Math.max(0.04, level) * 100}%`);
    meter.classList.toggle("is-live", level > 0.08);
    speakingMeterFrame = window.requestAnimationFrame(update);
  };

  update();
}

function isSpeakingRecording(questionKey) {
  return activeSpeakingRecorder?.state === "recording" && activeSpeakingKey === questionKey;
}

function getActiveSpeakingElapsedSeconds() {
  return activeSpeakingStartedAt ? Math.floor((Date.now() - activeSpeakingStartedAt) / 1000) : 0;
}

function updateSpeakingRecordingTimerDisplay() {
  if (!activeSpeakingKey || !activeSpeakingMaxSeconds) return;
  const elapsedSeconds = getActiveSpeakingElapsedSeconds();
  const remainingSeconds = Math.max(0, activeSpeakingMaxSeconds - elapsedSeconds);
  const escapedKey = cssEscape(activeSpeakingKey);
  const timerNodes = document.querySelectorAll(`[data-speaking-recording-timer="${escapedKey}"]`);
  timerNodes.forEach((node) => {
    node.textContent = `${formatTimerSeconds(elapsedSeconds)} / ${formatTimerSeconds(activeSpeakingMaxSeconds)}`;
    node.classList.toggle("is-warning", remainingSeconds <= 10 && remainingSeconds > 0);
    node.classList.toggle("is-expired", remainingSeconds <= 0);
  });
  const progressNodes = document.querySelectorAll(`[data-speaking-recording-progress="${escapedKey}"]`);
  progressNodes.forEach((node) => {
    node.style.setProperty("--speaking-recording-progress", `${Math.min(100, (elapsedSeconds / activeSpeakingMaxSeconds) * 100)}%`);
  });
  if (elapsedSeconds >= activeSpeakingMaxSeconds) {
    stopSpeakingRecording();
  }
}

function stopSpeakingRecordingTimer() {
  if (activeSpeakingTimerInterval) {
    window.clearInterval(activeSpeakingTimerInterval);
    activeSpeakingTimerInterval = null;
  }
}

function startSpeakingRecordingTimer(maxSeconds) {
  stopSpeakingRecordingTimer();
  activeSpeakingStartedAt = Date.now();
  activeSpeakingMaxSeconds = maxSeconds;
  updateSpeakingRecordingTimerDisplay();
  activeSpeakingTimerInterval = window.setInterval(updateSpeakingRecordingTimerDisplay, 250);
}

function saveSpeakingAttempt(subject, type, questionIndex, question) {
  const key = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  const completed = getSpeakingCompletedSegments(subject, type, questionIndex, question);
  const expectedSegmentCount = getSpeakingExpectedSegmentCount(question);
  const existing = mockProgress.answers[key] || {};
  const { speakingReview, ...rest } = existing;
  mockProgress.answers[key] = {
    ...rest,
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
  const segment = getSpeakingSegments(subject, type, questionIndex, question, { drawNext: false }).find((item) => item.id === segmentId)
    || { timeLimit: question?.timeLimit || "30 seconds" };
  const maxRecordingSeconds = getSpeakingRecordingMaxSeconds(segment);
  try {
    const stream = await getReusableSpeakingStream();
    activeSpeakingChunks = [];
    activeSpeakingKey = key;
    activeSpeakingStartedAt = Date.now();
    activeSpeakingMaxSeconds = maxRecordingSeconds;
    activeSpeakingRecorder = new MediaRecorder(stream);
    activeSpeakingRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) activeSpeakingChunks.push(event.data);
    });
    activeSpeakingRecorder.addEventListener("stop", async () => {
      stopSpeakingRecordingTimer();
      stopSpeakingMeter();
      const blob = new Blob(activeSpeakingChunks, { type: activeSpeakingRecorder.mimeType || "audio/webm" });
      const previous = speakingRecordings.get(key);
      if (previous?.url) URL.revokeObjectURL(previous.url);
      const recording = {
        blob,
        url: URL.createObjectURL(blob),
        recordedAt: new Date().toISOString(),
      };
      speakingRecordings.set(key, recording);
      activeSpeakingRecorder = null;
      activeSpeakingChunks = [];
      activeSpeakingKey = "";
      activeSpeakingStartedAt = 0;
      activeSpeakingMaxSeconds = 0;
      saveSpeakingAttempt(subject, type, questionIndex, question);
      renderSpeakingQuestion(subject, type, questionIndex);
      persistSpeakingRecording(subject, type, questionIndex, segmentId, recording)
        .then(() => {
          saveSpeakingAttempt(subject, type, questionIndex, question);
          if (isCurrentQuestion(subject.id, type.id, questionIndex)) {
            renderSpeakingQuestion(subject, type, questionIndex);
          }
        })
        .catch((error) => {
          console.warn("Could not persist speaking recording:", error);
        });
    });
    activeSpeakingRecorder.start();
    await renderSpeakingQuestion(subject, type, questionIndex);
    startSpeakingRecordingTimer(maxRecordingSeconds);
    startSpeakingMeter(stream, key);
  } catch (error) {
    stopSpeakingRecordingTimer();
    cleanupSpeakingStream();
    activeSpeakingRecorder = null;
    activeSpeakingChunks = [];
    activeSpeakingKey = "";
    activeSpeakingStartedAt = 0;
    activeSpeakingMaxSeconds = 0;
    window.alert("无法开启麦克风。请检查浏览器麦克风权限后再试。");
  }
}

function stopSpeakingRecording() {
  if (activeSpeakingRecorder?.state === "recording") {
    const subject = findSubject(mockState.subjectId);
    const type = findType(subject, mockState.typeId);
    const questionIndex = mockState.questionIndex;
    activeSpeakingRecorder.stop();
    stopSpeakingRecordingTimer();
    stopSpeakingMeter();
    if (subject && type && questionIndex) {
      renderSpeakingQuestion(subject, type, questionIndex);
    }
  }
}

function renderSpeakingRecordingTimer(recordingKey, segment, recordingNow) {
  const maxSeconds = recordingNow && activeSpeakingKey === recordingKey && activeSpeakingMaxSeconds
    ? activeSpeakingMaxSeconds
    : getSpeakingRecordingMaxSeconds(segment);
  const elapsedSeconds = recordingNow && activeSpeakingKey === recordingKey
    ? getActiveSpeakingElapsedSeconds()
    : 0;
  const progress = maxSeconds ? Math.min(100, (elapsedSeconds / maxSeconds) * 100) : 0;
  return `
    <div class="mock-speaking-recording-timer" data-speaking-recording-progress="${escapeHTML(recordingKey)}" style="--speaking-recording-progress: ${progress}%">
      <span data-speaking-recording-timer="${escapeHTML(recordingKey)}">${formatTimerSeconds(elapsedSeconds)} / ${formatTimerSeconds(maxSeconds)}</span>
    </div>
  `;
}

function clearSpeakingRecording(subject, type, questionIndex) {
  const question = getQuestion(type, questionIndex);
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const storageKeys = getSpeakingSegments(subject, type, questionIndex, question).map((segment) =>
    getSpeakingRecordingStorageKey(subject.id, type.id, questionIndex, segment.id)
  );
  getSpeakingSegments(subject, type, questionIndex, question).forEach((segment) => {
    const recordingKey = getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id);
    const recording = speakingRecordings.get(recordingKey);
    if (recording?.url) URL.revokeObjectURL(recording.url);
    speakingRecordings.delete(recordingKey);
  });
  void deleteSpeakingRecordingBlobs(storageKeys);
  delete mockProgress.answers[progressKey];
  saveProgress();
  renderSpeakingQuestion(subject, type, questionIndex);
}

function resetSpeakingReview(subject, type, questionIndex) {
  const key = getQuestionKey(subject.id, type.id, questionIndex);
  const existing = mockProgress.answers[key] || {};
  const { speakingReview, speakingReviewStatus, ...rest } = existing;
  mockProgress.answers[key] = {
    ...rest,
    graded: false,
    correct: null,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  renderSpeakingQuestion(subject, type, questionIndex);
}

function renderSpeakingMonologue(subject, type, questionIndex, question) {
  const questionNumbers = getQuestionNumbers(type);
  const currentPosition = questionNumbers.indexOf(questionIndex);
  const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
  const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
  const isStreamingMock = Boolean(subject.isStreamingMockTest);
  const streamingPosition = isStreamingMock ? getStreamingMockPosition(subject, type.id, questionIndex) : -1;
  const streamingTotal = isStreamingMock ? getStreamingMockSteps(subject).length : 0;
  const progressKey = getSpeakingProgressKey(subject.id, type.id, questionIndex);
  const record = mockProgress.answers[progressKey] || {};
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
              <strong>${recording ? "已录音" : "待录音"}</strong>
            </div>
            <em>${escapeHTML(segment.timeLimit)}</em>
          </div>
          <p>${escapeHTML(segment.prompt)}</p>
          <div class="mock-speaking-meter ${recordingNow ? "is-active" : ""}" aria-label="Microphone input level" data-speaking-meter="${escapeHTML(recordingKey)}">
            <span></span>
          </div>
          ${renderSpeakingRecordingTimer(recordingKey, segment, recordingNow)}
          <div class="mock-speaking-actions">
            <button class="button primary" type="button" ${recordingNow ? "data-stop-speaking-recording" : "data-start-speaking-recording"} data-speaking-segment="${segment.id}" ${!recordingNow && anyRecordingNow ? "disabled" : ""}>
              ${recordingNow ? "停止录音" : recording ? "重新录音" : "开始录音"}
            </button>
          </div>
          ${
            recording
              ? `<audio class="mock-speaking-audio" controls preload="metadata" src="${escapeHTML(recording.url)}"></audio>`
              : `<div class="mock-speaking-empty">还没有录音。</div>`
          }
        </article>
      `;
    })
    .join("");

  mockStage.innerHTML = `
    <div class="mock-question-view">
      <div class="mock-question-topbar">
        <button class="mock-back" type="button" ${isStreamingMock ? "data-abandon-random-mock-test" : "data-reset=\"questions\""} ${anyRecordingNow ? "disabled" : ""}>${isStreamingMock ? "放弃考试" : "返回题号"}</button>
        <span>${subject.title} · ${type.title} · Monologue${isStreamingMock ? ` · ${streamingPosition + 1}/${streamingTotal}` : ""}</span>
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
            ${anyRecordingNow ? "正在录音..." : allComplete ? "录音已完成，可以提交评分。" : "请先完成当前录音，再继续下一段。"}
          </p>
          <div class="mock-speaking-segment-list">
            ${segmentCards}
          </div>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" data-clear-speaking-recording ${completed.length && !anyRecordingNow ? "" : "disabled"}>全部重录</button>
            ${record.speakingReview && !record.speakingReview.error
              ? `<button class="button primary" type="button" data-reset-speaking-review>重新练习</button>`
              : subject.isFullMockTest
                ? isStreamingMock
                  ? `<button class="button primary" type="button" data-stream-next-question ${allComplete && !anyRecordingNow ? "" : "disabled"}>完成并提交</button>`
                  : `<button class="button primary" type="button" data-reset="types" ${allComplete && !anyRecordingNow ? "" : "disabled"}>返回模拟测试</button>`
                : `<button class="button primary" type="button" data-submit-speaking-review ${allComplete && !anyRecordingNow ? "" : "disabled"}>${record.speakingReviewStatus === "loading" ? "评分中" : "提交评分"}</button>`}
            ${isStreamingMock
              ? `<button class="button ghost dark" type="button" data-abandon-random-mock-test ${anyRecordingNow ? "disabled" : ""}>放弃考试</button>`
              : `<button class="button ghost dark" type="button" ${previous && !anyRecordingNow ? `data-question="${previous}"` : "disabled"}>上一题</button>
                 <button class="button primary" type="button" ${next && !anyRecordingNow ? `data-question="${next}"` : "disabled"}>下一题</button>`}
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
  const record = mockProgress.answers[progressKey] || {};
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
              <strong>${recording ? "已录音" : "待录音"}</strong>
            </div>
            <em>${escapeHTML(segment.timeLimit)}</em>
          </div>
          <p>${escapeHTML(segment.prompt)}</p>
          <div class="mock-speaking-meter ${recordingNow ? "is-active" : ""}" aria-label="Microphone input level" data-speaking-meter="${escapeHTML(recordingKey)}">
            <span></span>
          </div>
          ${renderSpeakingRecordingTimer(recordingKey, segment, recordingNow)}
          <div class="mock-speaking-actions">
            <button class="button primary" type="button" ${recordingNow ? "data-stop-speaking-recording" : "data-start-speaking-recording"} data-speaking-segment="${segment.id}" ${!recordingNow && anyRecordingNow ? "disabled" : ""}>
              ${recordingNow ? "停止录音" : recording ? "重新录音" : "开始录音"}
            </button>
          </div>
          ${
            recording
              ? `<audio class="mock-speaking-audio" controls preload="metadata" src="${escapeHTML(recording.url)}"></audio>`
              : `<div class="mock-speaking-empty">还没有录音。</div>`
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
            <img ${getMockImageAttributes(question.image, question.imageTitle || "Speaking picture")} />
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
            ${anyRecordingNow ? "正在录音..." : allComplete ? "录音已完成，可以提交评分。" : "请为每个问题录一段回答。"}
          </p>
          <div class="mock-speaking-segment-list">
            ${segmentCards}
          </div>
          <div class="mock-question-actions">
            <button class="button ghost dark" type="button" data-clear-speaking-recording ${completed.length && !anyRecordingNow ? "" : "disabled"}>全部重录</button>
            ${record.speakingReview && !record.speakingReview.error
              ? `<button class="button primary" type="button" data-reset-speaking-review>重新练习</button>`
              : subject.isFullMockTest
                ? `<button class="button primary" type="button" data-reset="types" ${allComplete && !anyRecordingNow ? "" : "disabled"}>返回模拟测试</button>`
                : `<button class="button primary" type="button" data-submit-speaking-review ${allComplete && !anyRecordingNow ? "" : "disabled"}>${record.speakingReviewStatus === "loading" ? "评分中" : "提交评分"}</button>`}
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

async function renderSpeakingQuestion(subject, type, questionIndex, skipRecordingRestore = false) {
  if (!mockStage) return;

  const question = getQuestion(type, questionIndex);
  if (!question) {
    renderQuestionList(subject, type);
    return;
  }

  if (!skipRecordingRestore) {
    void restoreSpeakingRecordings(subject, type, questionIndex, question)
      .then(() => {
        const isStillCurrentQuestion =
          mockState.subjectId === subject.id && mockState.typeId === type.id && mockState.questionIndex === questionIndex;
        if (isStillCurrentQuestion) {
          renderSpeakingQuestion(subject, type, questionIndex, true);
        }
      })
      .catch((error) => {
        console.warn("Could not restore speaking recordings:", error);
      });
  }

  if (question?.speakingMode === "monologue") {
    renderSpeakingMonologue(subject, type, questionIndex, question);
    return;
  }
  if (question?.speakingMode === "picture-response") {
    renderSpeakingPictureResponse(subject, type, questionIndex, question);
    return;
  }

    const questionNumbers = getQuestionNumbers(type);
    const currentPosition = questionNumbers.indexOf(questionIndex);
    const previous = currentPosition > 0 ? questionNumbers[currentPosition - 1] : null;
    const next = currentPosition >= 0 && currentPosition < questionNumbers.length - 1 ? questionNumbers[currentPosition + 1] : null;
    const key = getSpeakingRecordingKey(subject.id, type.id, questionIndex);
    const recording = speakingRecordings.get(key);
    const recordingNow = isSpeakingRecording(key);
    const segment = { id: "answer", label: "Answer", prompt: question?.text || "", timeLimit: question?.timeLimit || "30 seconds" };
    const statusText = recordingNow
      ? "正在录音..."
      : recording
        ? "录音已保存，可以回听或重新录一遍。"
        : "这题不计分。录完后可以回听，检查自己是否说清楚。";

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
          ${renderSpeakingRecordingTimer(key, segment, recordingNow)}
          <div class="mock-speaking-actions">
            <button class="button primary" type="button" ${recordingNow ? "data-stop-speaking-recording" : "data-start-speaking-recording"}>
              ${recordingNow ? "停止录音" : recording ? "重新录音" : "开始录音"}
            </button>
            <button class="button ghost dark" type="button" data-clear-speaking-recording ${recording && !recordingNow ? "" : "disabled"}>清除录音</button>
          </div>
          ${
            recording
              ? `<audio class="mock-speaking-audio" controls preload="metadata" src="${escapeHTML(recording.url)}"></audio>`
              : `<div class="mock-speaking-empty">还没有录音。</div>`
          }
          <p class="mock-answer-note">录音会保存在当前浏览器中；关闭网页后回来仍可继续使用本题录音。</p>
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
  const isStreamingMock = Boolean(subject.isStreamingMockTest);
  const streamingPosition = isStreamingMock ? getStreamingMockPosition(subject, type.id, questionIndex) : -1;
  const streamingTotal = isStreamingMock ? getStreamingMockSteps(subject).length : 0;
  const streamingNext = isStreamingMock ? getNextStreamingMockStep(subject, type.id, questionIndex) : null;
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
  const sourceLabel = question?.sourceNumber && !question?.sourceRange ? `原题 ${question.sourceNumber}` : "";
  const questionText = formatQuestionText(
    getQuestionDisplayText(
      question,
      (question?.sharedStemImage
        ? `请根据下图完成${sourceLabel ? ` ${sourceLabel}` : ""} 的填空。`
        : "请根据题目图示作答。")
    )
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
    ? `<div class="mock-question-visual"><img ${getMockImageAttributes(question.image, `${type.title} question ${questionIndex} visual`)} /></div>`
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
    ? `<p class="mock-answer-note">${subject.isFullMockTest ? "请先保存答案，完成整套模拟测试后统一提交评分。" : "请完成作文后点击“提交并批改”。"}</p>`
    : answerType === "input"
      ? `<p class="mock-answer-note">请直接在输入框填写数字或文字，不用从选项中选择。</p>`
      : answerType === "multiChoice"
        ? `<p class="mock-answer-note">此题型需选择 ${question.maxSelections || 2} 个选项。</p>`
        : "";
  const actionButtons = `
    <div class="mock-question-actions">
      ${
        isStreamingMock
          ? `<button class="button ghost dark" type="button" data-abandon-random-mock-test>放弃考试</button>
             <button class="button primary" type="button" data-stream-next-question>${streamingNext ? "下一题" : "完成并提交"}</button>`
          : `<button class="button ghost dark" type="button" ${previous ? `data-question="${previous}"` : "disabled"}>上一题</button>
             ${subject.isFullMockTest ? `<button class="button ghost dark" type="button" data-reset="types">返回模拟测试</button>` : `<button class="button ghost dark" type="button" data-leave-review>离开并批改</button>`}
             <button class="button primary" type="button" ${next ? `data-question="${next}"` : "disabled"}>下一题</button>`
      }
    </div>
  `;
  const canRetryAiReview = hasSuccessfulAiReview(record);
  const aiActionButtons = `
    <div class="mock-question-actions">
      ${subject.isFullMockTest
        ? isStreamingMock
          ? `<button class="button ghost dark" type="button" data-abandon-random-mock-test>放弃考试</button>
             <button class="button primary" type="button" data-stream-next-question>${streamingNext ? "下一题" : "完成并提交"}</button>`
          : `<button class="button ghost dark" type="button" data-reset="types">返回模拟测试</button>`
        : `<button class="button primary" type="button" ${canRetryAiReview ? "data-view-ai-review" : "data-submit-ai-review"}>
            ${canRetryAiReview ? "看评论" : "提交并批改"}
          </button>
          ${canRetryAiReview ? `<button class="button ghost dark" type="button" data-retry-ai-question>再试一次</button>` : ""}
          <button class="button ghost dark" type="button" data-abandon-ai-question>放弃</button>`}
    </div>
  `;

  if (isAiReviewQuestion(question)) {
    mockStage.innerHTML = `
      <div class="mock-question-view">
        <div class="mock-question-topbar">
          <button class="mock-back" type="button" ${isStreamingMock ? "data-abandon-random-mock-test" : "data-reset=\"questions\""}>${isStreamingMock ? "放弃考试" : "返回题号"}</button>
          <span>${subject.title} · ${type.title} · Question ${questionIndex}${isStreamingMock ? ` · ${streamingPosition + 1}/${streamingTotal}` : ""}</span>
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
        <button class="mock-back" type="button" ${isStreamingMock ? "data-abandon-random-mock-test" : "data-reset=\"questions\""}>${isStreamingMock ? "放弃考试" : "返回题号"}</button>
        <span>${subject.title} · ${type.title} · Question ${questionIndex}${isStreamingMock ? ` · ${streamingPosition + 1}/${streamingTotal}` : ""}</span>
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

  if (!isAuthenticated()) {
    setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
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
  const answerKey = getQuestionKey(subjectId, typeId, questionIndex);

  const updateWordCount = () => {
    if (wordCountNode && textarea) {
      wordCountNode.textContent = String(getWordCount(textarea.value));
    }
  };

  const saveWritingDraft = () => {
    if (!textarea) return;
    const existing = mockProgress.answers[answerKey] || {};
    const values = parseStoredInputAnswer(existing.answer);
    values.essay = textarea.value;
    mockProgress.answers[answerKey] = {
      ...existing,
      answer: JSON.stringify(values),
      graded: false,
      correct: null,
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    renderProgressPanel();
  };

  const updateTimer = () => {
    const remaining = getTimerRemainingSeconds(timer);
    if (timerNode) timerNode.textContent = formatTimerSeconds(remaining);
    if (timerWrap) timerWrap.classList.toggle("is-expired", remaining <= 0);
    if (remaining <= 0) clearWritingTimerInterval();
  };

  textarea?.addEventListener("input", () => {
    updateWordCount();
    saveWritingDraft();
  });
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
        values[field.id] = input instanceof HTMLTextAreaElement ? input.value : input.value.trim();
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
  const question = getQuestion(type, mockState.questionIndex);
  mockProgress.answers[key] = {
    ...existing,
    answer,
    graded: false,
    correct: null,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  if (!isAiReviewQuestion(question)) {
    recordPracticeAttempt(subject, type, mockState.questionIndex, "answer", { answer });
  }
  renderProgressPanel();
}

function getWritingReviewItems(question) {
  return [
    {
      key: "language_accuracy",
      reasonKey: "language_accuracy_reason",
      title: "语言准确度",
      max: 5,
    },
    {
      key: "vocabulary",
      reasonKey: "vocabulary_reason",
      title: "词汇",
      max: 5,
    },
    {
      key: "content_organisation",
      reasonKey: "content_organisation_reason",
      title: "内容与结构",
      max: 5,
    },
  ];
}

function getSpeakingReviewItems() {
  return [
    { key: "fluency", reasonKey: "fluency_reason", title: "流利度", max: 5 },
    { key: "pronunciation", reasonKey: "pronunciation_reason", title: "发音", max: 5 },
    { key: "vocabulary", reasonKey: "vocabulary_reason", title: "词汇", max: 5 },
    { key: "grammar", reasonKey: "grammar_reason", title: "语法", max: 5 },
    { key: "content_task_response", reasonKey: "content_task_response_reason", title: "内容与任务完成度", max: 5 },
  ];
}

function sanitizeReviewMessage(value) {
  return String(value || "")
    .replace(/DeepSeek/gi, "综合评分服务")
    .replace(/Xfyun|讯飞|科大讯飞|ISE/gi, "语音分析服务")
    .replace(/AI\s*/gi, "")
    .trim();
}

function getChineseReviewText(primary, fallback = "") {
  const text = sanitizeReviewMessage(primary || fallback);
  const englishMatch = text.match(/\b(English note|English focus|Student note|Practice note)\s*:\s*/i);
  if (englishMatch && englishMatch.index > 0) {
    return text.slice(0, englishMatch.index).trim();
  }
  return text;
}

function renderListItems(items, fallback) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return `
    <ul class="mock-ai-bilingual-list">
      ${(list.length ? list : [fallback]).map((item) => `<li>${formatBilingualFeedback(item)}</li>`).join("")}
    </ul>
  `;
}

function formatBilingualFeedback(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const englishMatch = text.match(/\b(English note|English focus|Student note|Practice note)\s*:\s*/i);
  if (englishMatch && englishMatch.index > 0) {
    const chinese = text.slice(0, englishMatch.index).trim();
    const english = text.slice(englishMatch.index + englishMatch[0].length).trim();
    return `
      <span class="mock-ai-feedback-cn">${escapeHTML(chinese)}</span>
      <span class="mock-ai-feedback-en">${escapeHTML(english)}</span>
    `;
  }
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines
      .map((line, index) => `<span class="${index === 0 ? "mock-ai-feedback-cn" : "mock-ai-feedback-en"}">${escapeHTML(line)}</span>`)
      .join("");
  }
  return `<span class="mock-ai-feedback-cn">${escapeHTML(text)}</span>`;
}

function renderAiWritingModelResult(review, isLoading) {
  const hasScore = Number.isFinite(Number(review?.total));
  const modelError = sanitizeReviewMessage(review?.error || "");
  const calibration = buildCalibrationMeta(review);
  const rubricRows = getWritingReviewItems()
    .map((item) => {
      const score = hasScore ? formatFivePointScore(review[item.key]) : "--";
      const reason = hasScore
          ? getChineseReviewText(review[`${item.reasonKey}_zh`], review[item.reasonKey])
          : modelError
            ? modelError
          : isLoading
            ? "正在批改，请稍等。"
            : "提交后会显示批改意见。";
      return `
        <div class="mock-ai-score-card">
          <span>${escapeHTML(item.title)}</span>
          <strong>${escapeHTML(score)}/5</strong>
          <small>${formatBilingualFeedback(reason)}</small>
        </div>
      `;
    })
    .join("");

  return `
    <section class="mock-ai-model-result">
      ${modelError ? `<div class="mock-ai-error">${escapeHTML(modelError)}</div>` : ""}
      <div class="mock-ai-review-total">
        <span>五分制评分</span>
        <strong>${hasScore ? escapeHTML(formatFivePointScore(calibration.score5)) : "--"}/5</strong>
        <small>${hasScore ? escapeHTML(review.level) : modelError ? "评分失败" : isLoading ? "评分中..." : "尚未评分"}</small>
      </div>
      <div class="mock-ai-score-grid">
        ${rubricRows}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>整体反馈</h4>
        <p>${formatBilingualFeedback(hasScore ? getChineseReviewText(review.overall_feedback_zh, review.overall_feedback) : isLoading ? "正在生成整体反馈。" : "提交后会显示整体反馈。")}</p>
      </div>
      <div class="mock-ai-feedback-block">
        <h4>亮点</h4>
        ${renderListItems(hasScore ? review.strengths_zh || review.strengths : [], isLoading ? "正在分析亮点。" : "暂无亮点反馈。")}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>薄弱点</h4>
        ${renderListItems(hasScore ? review.weaknesses_zh || review.weaknesses : [], isLoading ? "正在分析薄弱点。" : "暂无薄弱点反馈。")}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>三项改进建议</h4>
        ${renderListItems(hasScore ? review.top_3_improvements_zh || review.top_3_improvements : [], isLoading ? "正在生成改进建议。" : "暂无改进建议。")}
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
    ? record.aiReviews.filter((review) => activeModelIds.has(review.model) && !review.error && hasChineseAiFeedback(review))
    : record?.aiReview
      ? [{ ...record.aiReview, model: record.aiReview.model || "AI", modelLabel: record.aiReview.modelLabel || "Pro" }].filter(hasChineseAiFeedback)
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
            <p class="eyebrow">写作评分</p>
            <h3>写作批改反馈</h3>
            <p>${isLoading ? "正在批改，请稍等。" : hasReview ? "以下为根据诊断维度生成的中文评分与反馈。" : "提交后会显示中文批改结果。"} 字数：${wordCount}</p>
          </div>
          <button class="mock-review-close" type="button" data-close-ai-review>关闭</button>
        </div>
        ${errorMessage ? `<div class="mock-ai-error">${escapeHTML(sanitizeReviewMessage(errorMessage))}</div>` : ""}
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

function isAiReviewCooldownError(error) {
  return Number(error?.retryAfterSeconds) > 0 || /每\s*3\s*分钟|3 分钟|retry/i.test(String(error?.message || ""));
}

function formatAiReviewCooldownMessage(error) {
  const seconds = Math.max(1, Math.ceil(Number(error?.retryAfterSeconds || 0)));
  if (seconds > 0 && Number.isFinite(seconds)) {
    return `每个账号每 3 分钟只能提交一次 AI 批改，请再等 ${seconds} 秒。`;
  }
  return sanitizeReviewMessage(error?.message || "每个账号每 3 分钟只能提交一次 AI 批改，请稍后再试。");
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

function calibrationFromTotal(total) {
  if (total >= 18) return { score_5: 4.5, aeas_score_range: "80+", ielts_reference: "IELTS 6.5+" };
  if (total >= 16) return { score_5: 4.0, aeas_score_range: "67-79", ielts_reference: "IELTS 6.0" };
  if (total >= 14) return { score_5: 3.5, aeas_score_range: "57-66", ielts_reference: "IELTS 5.5" };
  if (total >= 12) return { score_5: 3.0, aeas_score_range: "46-56", ielts_reference: "IELTS 5.0" };
  if (total >= 8) return { score_5: 2.0, aeas_score_range: "36-45", ielts_reference: "IELTS 4.0" };
  if (total >= 6) return { score_5: 1.5, aeas_score_range: "26-35", ielts_reference: "IELTS 3.5-4.0" };
  return { score_5: 1.0, aeas_score_range: "0-25", ielts_reference: "Below IELTS 4.0" };
}

function calibrationFromScore(score5) {
  if (score5 >= 4.5) return { score_5: score5, aeas_score_range: "80+", ielts_reference: "IELTS 6.5+" };
  if (score5 >= 4.0) return { score_5: score5, aeas_score_range: "67-79", ielts_reference: "IELTS 6.0" };
  if (score5 >= 3.5) return { score_5: score5, aeas_score_range: "57-66", ielts_reference: "IELTS 5.5" };
  if (score5 >= 3.0) return { score_5: score5, aeas_score_range: "46-56", ielts_reference: "IELTS 5.0" };
  if (score5 >= 2.0) return { score_5: score5, aeas_score_range: "36-45", ielts_reference: "IELTS 4.0" };
  if (score5 >= 1.5) return { score_5: score5, aeas_score_range: "26-35", ielts_reference: "IELTS 3.5-4.0" };
  return { score_5: 1.0, aeas_score_range: "0-25", ielts_reference: "Below IELTS 4.0" };
}

function normalizeFivePointScore(value, total) {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) {
    const bands = [1, 1.5, 2, 3, 3.5, 4, 4.5, 5];
    const clamped = Math.max(1, Math.min(5, number));
    return bands
      .slice()
      .sort((a, b) => Math.abs(a - clamped) - Math.abs(b - clamped) || a - b)[0];
  }
  return calibrationFromTotal(total).score_5;
}

function formatFivePointScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toFixed(1);
}

function levelFromFivePointScore(value) {
  const score = Number(value);
  if (score >= 4.5) return "Excellent";
  if (score >= 3.5) return "Good";
  if (score >= 2.0) return "Developing";
  return "Needs Improvement";
}

function buildCalibrationMeta(review) {
  const total = Number(review?.total) || 0;
  const fallback = calibrationFromTotal(total);
  return {
    score5: normalizeFivePointScore(review?.score_5, total),
    aeasRange: String(review?.aeas_score_range || fallback.aeas_score_range).trim(),
    ieltsReference: String(review?.ielts_reference || fallback.ielts_reference).trim(),
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function composeBilingualText(zh, en, fallback = "") {
  const cleanZh = String(zh || "").trim();
  const cleanEn = String(en || "").trim();
  if (cleanZh && cleanEn) return `${cleanZh} English note: ${cleanEn}`;
  if (cleanZh) return cleanZh;
  if (cleanEn) return `English note: ${cleanEn}`;
  return String(fallback || "").trim();
}

function composeBilingualList(zhItems, enItems, fallbackItems = []) {
  const zhList = normalizeStringArray(zhItems);
  const enList = normalizeStringArray(enItems);
  const maxLength = Math.max(zhList.length, enList.length);
  if (!maxLength) return normalizeStringArray(fallbackItems);
  return Array.from({ length: maxLength }, (_, index) => composeBilingualText(zhList[index], enList[index])).filter(Boolean);
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
  const languageAccuracy = normalizeFivePointScore(raw.language_accuracy, 0);
  const vocabulary = normalizeFivePointScore(raw.vocabulary, 0);
  const contentOrganisation = normalizeFivePointScore(raw.content_organisation, 0);
  const score5 = normalizeFivePointScore((languageAccuracy * 0.4) + (vocabulary * 0.2) + (contentOrganisation * 0.4), 0);
  const total = normalizeScore(score5 * 4, 20);
  const calibration = calibrationFromScore(score5);
  return {
    language_accuracy: languageAccuracy,
    language_accuracy_reason: composeBilingualText(raw.language_accuracy_reason_zh, raw.language_accuracy_reason_en, raw.language_accuracy_reason),
    language_accuracy_reason_zh: String(raw.language_accuracy_reason_zh || "").trim(),
    language_accuracy_reason_en: String(raw.language_accuracy_reason_en || "").trim(),
    vocabulary,
    vocabulary_reason: composeBilingualText(raw.vocabulary_reason_zh, raw.vocabulary_reason_en, raw.vocabulary_reason),
    vocabulary_reason_zh: String(raw.vocabulary_reason_zh || "").trim(),
    vocabulary_reason_en: String(raw.vocabulary_reason_en || "").trim(),
    content_organisation: contentOrganisation,
    content_organisation_reason: composeBilingualText(raw.content_organisation_reason_zh, raw.content_organisation_reason_en, raw.content_organisation_reason),
    content_organisation_reason_zh: String(raw.content_organisation_reason_zh || "").trim(),
    content_organisation_reason_en: String(raw.content_organisation_reason_en || "").trim(),
    total,
    score_5: score5,
    aeas_score_range: String(raw.aeas_score_range || calibration.aeas_score_range).trim(),
    ielts_reference: String(raw.ielts_reference || calibration.ielts_reference).trim(),
    level: levelFromFivePointScore(score5),
    overall_feedback: composeBilingualText(raw.overall_feedback_zh, raw.overall_feedback_en, raw.overall_feedback),
    overall_feedback_zh: String(raw.overall_feedback_zh || "").trim(),
    overall_feedback_en: String(raw.overall_feedback_en || "").trim(),
    strengths: composeBilingualList(raw.strengths_zh, raw.strengths_en, raw.strengths),
    strengths_zh: normalizeStringArray(raw.strengths_zh),
    strengths_en: normalizeStringArray(raw.strengths_en),
    weaknesses: composeBilingualList(raw.weaknesses_zh, raw.weaknesses_en, raw.weaknesses),
    weaknesses_zh: normalizeStringArray(raw.weaknesses_zh),
    weaknesses_en: normalizeStringArray(raw.weaknesses_en),
    top_3_improvements: composeBilingualList(raw.top_3_improvements_zh, raw.top_3_improvements_en, raw.top_3_improvements),
    top_3_improvements_zh: normalizeStringArray(raw.top_3_improvements_zh),
    top_3_improvements_en: normalizeStringArray(raw.top_3_improvements_en),
    reviewedAt: new Date().toISOString(),
  };
}

function normalizeAiSpeakingReviewResult(raw) {
  const fluency = normalizeFivePointScore(raw.fluency, 0);
  const pronunciation = normalizeFivePointScore(raw.pronunciation, 0);
  const vocabulary = normalizeFivePointScore(raw.vocabulary, 0);
  const grammar = normalizeFivePointScore(raw.grammar, 0);
  const contentTaskResponse = normalizeFivePointScore(raw.content_task_response, 0);
  const score5 = normalizeFivePointScore((fluency + pronunciation + vocabulary + grammar + contentTaskResponse) / 5, 0);
  const total = normalizeScore(score5 * 4, 20);
  const calibration = calibrationFromScore(score5);
  return {
    fluency,
    fluency_reason: getChineseReviewText(raw.fluency_reason_zh, raw.fluency_reason),
    pronunciation,
    pronunciation_reason: getChineseReviewText(raw.pronunciation_reason_zh, raw.pronunciation_reason),
    vocabulary,
    vocabulary_reason: getChineseReviewText(raw.vocabulary_reason_zh, raw.vocabulary_reason),
    grammar,
    grammar_reason: getChineseReviewText(raw.grammar_reason_zh, raw.grammar_reason),
    content_task_response: contentTaskResponse,
    content_task_response_reason: getChineseReviewText(raw.content_task_response_reason_zh, raw.content_task_response_reason),
    total,
    score_5: score5,
    aeas_score_range: String(raw.aeas_score_range || calibration.aeas_score_range).trim(),
    ielts_reference: String(raw.ielts_reference || calibration.ielts_reference).trim(),
    level: levelFromFivePointScore(score5),
    overall_feedback: getChineseReviewText(raw.overall_feedback_zh, raw.overall_feedback),
    main_issues: normalizeStringArray(raw.main_issues_zh || raw.main_issues).map(sanitizeReviewMessage),
    improvements: normalizeStringArray(raw.improvements_zh || raw.improvements).map(sanitizeReviewMessage),
    better_answer_direction: getChineseReviewText(raw.better_answer_direction_zh, raw.better_answer_direction),
    segments: Array.isArray(raw.segments) ? raw.segments : [],
    model: raw.model || "deepseek-v4-pro",
    modelLabel: raw.modelLabel || "AI Review",
    reviewedAt: raw.reviewedAt || new Date().toISOString(),
  };
}

function setSpeakingReviewProgress(progressKey, lines) {
  const latestLine = normalizeStringArray(lines).at(-1) || "";
  speakingReviewProgressLogs.set(progressKey, latestLine ? [latestLine] : []);
  updateSpeakingReviewProgressNode(progressKey);
}

function appendSpeakingReviewProgress(progressKey, line) {
  const existing = speakingReviewProgressLogs.get(progressKey) || [];
  setSpeakingReviewProgress(progressKey, [...existing, line]);
}

function clearSpeakingReviewProgress(progressKey) {
  const timer = speakingReviewProgressTimers.get(progressKey);
  if (timer) window.clearInterval(timer);
  speakingReviewProgressTimers.delete(progressKey);
  speakingReviewProgressLogs.delete(progressKey);
  updateSpeakingReviewProgressNode(progressKey);
}

function updateSpeakingReviewProgressNode(progressKey) {
  const escapedKey = window.CSS?.escape ? CSS.escape(progressKey) : progressKey.replace(/["\\]/g, "\\$&");
  const node = document.querySelector(`[data-speaking-review-log="${escapedKey}"]`);
  if (!node) return;
  const lines = speakingReviewProgressLogs.get(progressKey) || [];
  node.innerHTML = renderSpeakingReviewProgressLines(lines);
}

function renderSpeakingReviewProgressLines(lines) {
  const cleanLines = normalizeStringArray(lines);
  if (!cleanLines.length) return "";
  const latestLine = cleanLines.at(-1);
  return `
    <div class="mock-speaking-review-log">
      <strong>评分进度</strong>
      <p>${escapeHTML(sanitizeReviewMessage(latestLine))}</p>
    </div>
  `;
}

function startSpeakingReviewProgress(progressKey, segmentCount) {
  const total = Math.max(1, Number(segmentCount) || 1);
  const startedAt = Date.now();
  setSpeakingReviewProgress(progressKey, [`正在送出 ${total} 段录音，请稍等。`]);

  const timer = window.setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsedSeconds < 10) {
      setSpeakingReviewProgress(progressKey, ["录音正在路上，很快就开始评分。"]);
      return;
    }
    if (elapsedSeconds < 55) {
      setSpeakingReviewProgress(progressKey, ["正在认真听你的回答。"]);
      return;
    }
    if (elapsedSeconds < 100) {
      setSpeakingReviewProgress(progressKey, ["正在整理你的表现重点。"]);
      return;
    }
    if (elapsedSeconds < 170) {
      setSpeakingReviewProgress(progressKey, ["正在写评分和改进建议。"]);
      return;
    }
    setSpeakingReviewProgress(progressKey, ["还在努力评分中，请先不要关闭页面。"]);
  }, 5000);
  speakingReviewProgressTimers.set(progressKey, timer);
}

function finishSpeakingReviewProgress(progressKey) {
  const timer = speakingReviewProgressTimers.get(progressKey);
  if (timer) window.clearInterval(timer);
  speakingReviewProgressTimers.delete(progressKey);
  appendSpeakingReviewProgress(progressKey, "评分完成，可以查看结果了。");
}

async function requestAiSpeakingSection2Review(subject, type, questionIndex, question) {
  if (!window.rewardSchoolApi?.reviewSpeakingSection2) throw new Error("Reward School speaking API client is missing.");

  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  const payloadSegments = segments.map((segment, index) => {
    const recording = speakingRecordings.get(getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id));
    return {
      id: index === 0 ? "monologue" : `followUp${index}`,
      type: index === 0 ? "monologue" : "followUp",
      question: segment.prompt,
      blob: recording?.blob,
    };
  });

  if (payloadSegments.some((segment) => !segment.blob)) {
    throw new Error("请先完成所有口语录音，再提交评分。");
  }

  const payload = await window.rewardSchoolApi.reviewSpeakingSection2({
    topicCard: question.text || "",
    prompts: question.prompts || [],
    segments: payloadSegments,
    sourceId: String(question.sourceId || question.id || question.number || ""),
    token: getAuthToken(),
    onProgress: (line) => appendSpeakingReviewProgress(
      `${subject.id}:${type.id}:${questionIndex}:speaking`,
      line
    ),
  });
  return normalizeAiSpeakingReviewResult(payload);
}

async function requestAiSpeakingType3Review(subject, type, questionIndex, question) {
  if (!window.rewardSchoolApi?.reviewSpeakingType3) throw new Error("Reward School speaking type 3 API client is missing.");

  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  const payloadSegments = segments.map((segment, index) => {
    const recording = speakingRecordings.get(getSpeakingRecordingKey(subject.id, type.id, questionIndex, segment.id));
    return {
      id: `pictureQuestion${index + 1}`,
      type: "pictureQuestion",
      question: segment.prompt,
      blob: recording?.blob,
    };
  });

  if (payloadSegments.some((segment) => !segment.blob)) {
    throw new Error("请先完成所有图片口语录音，再提交评分。");
  }

  const payload = await window.rewardSchoolApi.reviewSpeakingType3({
    imageTitle: question.imageTitle || question.text || "Picture-based Questions",
    imageDescription: question.scoringImageDescription || {},
    pictureQuestions: question.pictureQuestions || segments.map((segment) => segment.prompt),
    segments: payloadSegments,
    sourceId: String(question.sourceId || question.id || question.number || ""),
    token: getAuthToken(),
    onProgress: (line) => appendSpeakingReviewProgress(
      `${subject.id}:${type.id}:${questionIndex}:speaking`,
      line
    ),
  });
  return normalizeAiSpeakingReviewResult(payload);
}

function getSpeakingReviewHeading(question) {
  return question?.speakingMode === "picture-response" ? "口语第三题型" : "口语第二题型";
}

function getSpeakingReviewSubheading(question, isLoading, hasReview) {
  if (question?.speakingMode === "picture-response") {
    return isLoading
      ? "正在批量提交图片口语录音并评分，请稍等。"
      : hasReview
        ? "以下为图片描述题五项评分与中文反馈。"
        : "提交后会显示图片口语评分结果。";
  }

  return isLoading
    ? "正在批量提交录音并评分，请稍等。"
    : hasReview
      ? "以下为 Section 2 五项评分与中文反馈。"
      : "提交后会显示口语评分结果。";
}

function renderAiSpeakingModelResult(review, isLoading) {
  const hasScore = Number.isFinite(Number(review?.total));
  const modelError = sanitizeReviewMessage(review?.error || "");
  const calibration = buildCalibrationMeta(review);
  const rubricRows = getSpeakingReviewItems()
    .map((item) => {
      const score = hasScore ? formatFivePointScore(review[item.key]) : "--";
      const reason = hasScore
        ? review[item.reasonKey]
        : modelError
          ? modelError
          : isLoading
            ? "正在上传全部录音并等待评分结果。"
            : "提交后会显示口语评分。";
      return `
        <div class="mock-ai-score-card">
          <span>${escapeHTML(item.title)}</span>
          <strong>${escapeHTML(score)}/5</strong>
          <small>${formatBilingualFeedback(reason)}</small>
        </div>
      `;
    })
    .join("");

  return `
    <section class="mock-ai-model-result">
      ${modelError ? `<div class="mock-ai-error">${escapeHTML(modelError)}</div>` : ""}
      <div class="mock-ai-review-total">
        <span>五分制评分</span>
        <strong>${hasScore ? escapeHTML(formatFivePointScore(calibration.score5)) : "--"}/5</strong>
        <small>${hasScore ? escapeHTML(review.level) : modelError ? "评分失败" : isLoading ? "评分中..." : "尚未评分"}</small>
      </div>
      <div class="mock-ai-score-grid">
        ${rubricRows}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>整体反馈</h4>
        <p>${formatBilingualFeedback(hasScore ? review.overall_feedback : "提交录音后，会在这里看到评分和建议。")}</p>
      </div>
      <div class="mock-ai-feedback-block">
        <h4>主要问题</h4>
        ${renderListItems(hasScore ? review.main_issues : [], isLoading ? "正在分析主要问题。" : "暂无问题反馈。")}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>改进建议</h4>
        ${renderListItems(hasScore ? review.improvements : [], isLoading ? "正在生成改进建议。" : "暂无改进建议。")}
      </div>
      <div class="mock-ai-feedback-block">
        <h4>更好的回答方向</h4>
        <p>${formatBilingualFeedback(hasScore ? review.better_answer_direction : "提交后会给出更好的回答方向，但不会生成整篇背诵稿。")}</p>
      </div>
    </section>
  `;
}

function renderAiSpeakingReview(subject, type, questionIndex, status = "ready", errorMessage = "") {
  const question = getQuestion(type, questionIndex);
  const record = getQuestionRecord(subject.id, type.id, questionIndex);
  const review = record?.speakingReview;
  const progressKey = `${subject.id}:${type.id}:${questionIndex}:speaking`;
  const progressLines = speakingReviewProgressLogs.get(progressKey) || [];
  const isLoading = status === "loading";
  const hasReview = review && !review.error && Number.isFinite(Number(review.total));
  const reviewSection = renderAiSpeakingModelResult(hasReview ? review : { modelLabel: "评分服务", error: status === "error" ? sanitizeReviewMessage(errorMessage) : "" }, isLoading || !hasReview);

  return `
    <div class="mock-review-overlay" data-ai-review-overlay>
      <div class="mock-ai-review-dialog" role="dialog" aria-modal="true" aria-label="Speaking AI review">
        <div class="mock-review-header">
          <div>
            <p class="eyebrow">${escapeHTML(getSpeakingReviewHeading(question))}</p>
            <h3>口语评分反馈</h3>
            <p>${escapeHTML(getSpeakingReviewSubheading(question, isLoading, hasReview))} ${escapeHTML(question?.speakingTitle || "")}</p>
          </div>
          <button class="mock-review-close" type="button" data-close-ai-review>关闭</button>
        </div>
        ${errorMessage ? `<div class="mock-ai-error">${escapeHTML(sanitizeReviewMessage(errorMessage))}</div>` : ""}
        <div data-speaking-review-log="${escapeHTML(progressKey)}">
          ${renderSpeakingReviewProgressLines(progressLines)}
        </div>
        <div class="mock-ai-model-results">
          ${reviewSection}
        </div>
      </div>
    </div>
  `;
}

function openAiSpeakingReview(subject, type, questionIndex, status = "ready", errorMessage = "") {
  document.querySelector("[data-ai-review-overlay]")?.remove();
  document.body.insertAdjacentHTML("beforeend", renderAiSpeakingReview(subject, type, questionIndex, status, errorMessage));
}

function closeAiSpeakingReview() {
  document.querySelector("[data-ai-review-overlay]")?.remove();
}

async function requestAiWritingReview(question, essay, modelConfig) {
  const model = typeof modelConfig === "string" ? modelConfig : modelConfig.id;
  const modelLabel = typeof modelConfig === "string" ? modelConfig : modelConfig.label || modelConfig.id;

  if (!window.rewardSchoolApi?.reviewWriting) throw new Error("Reward School API client is missing.");

  const payload = await window.rewardSchoolApi.reviewWriting({
    question: question.text || "",
    essay,
    sourceId: String(question.sourceId || question.id || question.number || ""),
    token: getAuthToken(),
  });
  return {
    ...normalizeAiWritingReviewResult(payload),
    model,
    modelLabel: payload.modelLabel || modelLabel,
    backendModel: payload.model,
  };
}

async function refreshAuthUserFromServer() {
  return refreshAuthStateFromServer();
}

function showAiReviewAccessError(error) {
  if (isAiReviewCooldownError(error)) {
    showSystemToast("AI 批改暂时不能提交", formatAiReviewCooldownMessage(error));
    return;
  }

  const message = sanitizeReviewMessage(error?.message || "");
  if (error?.status === 401) {
    showSystemToast("请先登录", "登录后才能使用 AI 批改。");
    return;
  }
  if (error?.status === 404) {
    showSystemToast("线上 API 尚未更新", "请先部署后端，或改用本地服务器测试这个批改限制流程。");
    return;
  }
  if (/verify|验证|邮箱/i.test(message)) {
    showSystemToast("需要先验证邮箱", "请先到邮箱点击验证链接，验证后才能使用 AI 批改。");
    return;
  }

  showSystemToast("暂时无法提交 AI 批改", message || "请稍后再试。");
}

async function canUseAiReview(kind = "writing") {
  if (!getAuthToken()) {
    showSystemToast("请先登录", "登录后才能使用 AI 批改。");
    openAuthModal("login");
    return false;
  }

  const user = await refreshAuthUserFromServer();
  if (!user?.id) {
    showSystemToast("会员状态取得失败", "无法从服务器确认账号状态，请检查 API 连接或重新登录。");
    return false;
  }

  if (!user?.emailVerified && !user?.superUser) {
    showSystemToast("需要先验证邮箱", "请先到邮箱点击验证链接，验证后才能使用 AI 批改。");
    return false;
  }

  try {
    await window.rewardSchoolApi.checkAiReviewAccess({
      token: getAuthToken(),
      kind,
    });
  } catch (error) {
    showAiReviewAccessError(error);
    return false;
  }

  return true;
}

async function submitAiWritingReview(subject, type, questionIndex) {
  const question = getQuestion(type, questionIndex);
  const record = getQuestionRecord(subject.id, type.id, questionIndex);
  const essay = parseStoredInputAnswer(record?.answer).essay || "";
  const writingAnswer = JSON.stringify({
    ...parseStoredInputAnswer(record?.answer),
    essay,
  });
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
  if (pendingAiReviewKeys.has(pendingKey)) {
    showSystemToast("AI 批改正在提交", "请稍等，当前题目已经在处理。");
    return;
  }

  recordPracticeAttempt(
    subject,
    type,
    questionIndex,
    "writing-draft",
    {
      essay,
      question: question.text || "",
      sourceId: String(question.sourceId || question.id || question.number || ""),
    },
    { status: "submitted-for-review" }
  );

  if (!(await canUseAiReview("writing"))) return;

  pendingAiReviewKeys.add(pendingKey);
  setPendingReviewMeta(pendingKey, { kind: "writing", subject, type, questionIndex, status: "loading" });
  const key = getQuestionKey(subject.id, type.id, questionIndex);
  const previousAnswerState = { ...(mockProgress.answers[key] || {}) };
  mockProgress.answers[key] = {
    ...(mockProgress.answers[key] || {}),
    answer: writingAnswer,
    aiReviewStatus: "loading",
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  openAiWritingReview(subject, type, questionIndex, "loading");

  try {
    const aiReviews = await Promise.all(models.map((model) => requestAiWritingReview(question, essay, model)));
    mockProgress.answers[key] = {
      ...(mockProgress.answers[key] || {}),
      answer: writingAnswer,
      graded: aiReviews.some((review) => !review.error),
      correct: null,
      aiReviews,
      aiReviewStatus: "done",
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    recordPracticeAttempt(
      subject,
      type,
      questionIndex,
      "writing-review",
      {
        essay,
        question: question.text || "",
        sourceId: String(question.sourceId || question.id || question.number || ""),
      },
      { aiReviews }
    );
    const meta = { kind: "writing", subject, type, questionIndex, status: "ready" };
    if (isCurrentQuestion(subject.id, type.id, questionIndex)) {
      openAiWritingReview(subject, type, questionIndex, "ready");
    } else {
      maybeNotifyReviewComplete(meta);
    }
  } catch (error) {
    const errorMessage = sanitizeReviewMessage(error.message || "批改失败，请稍后再试。");
    if (isAiReviewCooldownError(error)) {
      mockProgress.answers[key] = {
        ...previousAnswerState,
        updatedAt: new Date().toISOString(),
      };
      saveProgress();
      closeAiWritingReview();
      showSystemToast("AI 批改暂时不能提交", formatAiReviewCooldownMessage(error));
      return;
    }

    mockProgress.answers[key] = {
      ...(mockProgress.answers[key] || {}),
      answer: writingAnswer,
      aiReviewStatus: "error",
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    const meta = { kind: "writing", subject, type, questionIndex, status: "error", errorMessage };
    if (isCurrentQuestion(subject.id, type.id, questionIndex) && document.querySelector("[data-ai-review-overlay]")) {
      openAiWritingReview(subject, type, questionIndex, "error", errorMessage);
    } else {
      maybeNotifyReviewComplete(meta, true);
    }
  } finally {
    pendingAiReviewKeys.delete(pendingKey);
    clearPendingReviewMeta(pendingKey);
  }
}

async function submitSpeakingSection2Review(subject, type, questionIndex) {
  const question = getQuestion(type, questionIndex);
  if (!question || !["monologue", "picture-response"].includes(question.speakingMode)) {
    window.alert("当前题型暂未开放口语评分。");
    return;
  }

  const segments = getSpeakingSegments(subject, type, questionIndex, question);
  const completed = getSpeakingCompletedSegments(subject, type, questionIndex, question);
  if (completed.length < getSpeakingExpectedSegmentCount(question) || completed.length < segments.length) {
    window.alert("请先完成主陈述和 3 个 follow-up 录音，再提交评分。");
    return;
  }

  const key = getQuestionKey(subject.id, type.id, questionIndex);
  const record = mockProgress.answers[key] || {};
  if (record.speakingReview && !record.speakingReview.error) {
    openAiSpeakingReview(subject, type, questionIndex, "ready");
    return;
  }
  const previousAnswerState = { ...record };

  const pendingKey = `${subject.id}:${type.id}:${questionIndex}:speaking`;
  if (pendingAiReviewKeys.has(pendingKey)) {
    showSystemToast("AI 批改正在提交", "请稍等，当前题目已经在处理。");
    return;
  }

  const reviewKind = question.speakingMode === "picture-response" ? "speaking-type3" : "speaking-section2";
  if (!(await canUseAiReview(reviewKind))) return;

  pendingAiReviewKeys.add(pendingKey);
  setPendingReviewMeta(pendingKey, { kind: "speaking", subject, type, questionIndex, status: "loading" });
  mockProgress.answers[key] = {
    ...(mockProgress.answers[key] || {}),
    answer: "completed",
    graded: false,
    correct: null,
    speakingReviewStatus: "loading",
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  startSpeakingReviewProgress(pendingKey, segments.length);
  openAiSpeakingReview(subject, type, questionIndex, "loading");

  try {
    const speakingReview = question.speakingMode === "picture-response"
      ? await requestAiSpeakingType3Review(subject, type, questionIndex, question)
      : await requestAiSpeakingSection2Review(subject, type, questionIndex, question);
    finishSpeakingReviewProgress(pendingKey);
    mockProgress.answers[key] = {
      ...(mockProgress.answers[key] || {}),
      answer: "completed",
      graded: true,
      correct: null,
      speakingReview,
      speakingReviewStatus: "done",
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    recordPracticeAttempt(
      subject,
      type,
      questionIndex,
      "speaking-review",
      {
        question: question.text || question.title || "",
        speakingMode: question.speakingMode || "",
      },
      { speakingReview }
    );
    const meta = { kind: "speaking", subject, type, questionIndex, status: "ready" };
    if (isCurrentQuestion(subject.id, type.id, questionIndex)) {
      openAiSpeakingReview(subject, type, questionIndex, "ready");
    } else {
      maybeNotifyReviewComplete(meta);
    }
    window.setTimeout(() => clearSpeakingReviewProgress(pendingKey), 3000);
  } catch (error) {
    const timer = speakingReviewProgressTimers.get(pendingKey);
    if (timer) window.clearInterval(timer);
    speakingReviewProgressTimers.delete(pendingKey);

    if (isAiReviewCooldownError(error)) {
      clearSpeakingReviewProgress(pendingKey);
      mockProgress.answers[key] = {
        ...previousAnswerState,
        updatedAt: new Date().toISOString(),
      };
      saveProgress();
      closeAiSpeakingReview();
      showSystemToast("AI 批改暂时不能提交", formatAiReviewCooldownMessage(error));
      return;
    }

    appendSpeakingReviewProgress(pendingKey, "评分过程中遇到问题，请稍后再试。");
    mockProgress.answers[key] = {
      ...(mockProgress.answers[key] || {}),
      speakingReview: {
        error: sanitizeReviewMessage(error.message || "口语评分失败。"),
        reviewedAt: new Date().toISOString(),
      },
      speakingReviewStatus: "error",
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    const errorMessage = sanitizeReviewMessage(error.message || "口语评分失败，请稍后再试。");
    const meta = { kind: "speaking", subject, type, questionIndex, status: "error", errorMessage };
    if (isCurrentQuestion(subject.id, type.id, questionIndex) && document.querySelector("[data-ai-review-overlay]")) {
      openAiSpeakingReview(subject, type, questionIndex, "error", errorMessage);
    } else {
      maybeNotifyReviewComplete(meta, true);
    }
  } finally {
    pendingAiReviewKeys.delete(pendingKey);
    clearPendingReviewMeta(pendingKey);
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

async function submitFullMockTestReview(subject) {
  if (!subject?.isFullMockTest) return;
  const completion = getFullMockCompletion(subject);
  if (!completion.complete) {
    showSystemToast("还不能提交评分", `请先完成所有小节，目前已完成 ${completion.attempted}/${completion.total} 题。`);
    return;
  }

  gradeSubjectAnswers(subject);
  showSystemToast("正在提交整套评分", "客观题已完成批改，正在处理需要评分的回答。");

  const aiTasks = subject.types.flatMap((type) =>
    getQuestions(type)
      .filter((question) => question.reviewMode === "ai" || question.speakingMode === "monologue")
      .map((question) => ({ type, question }))
  );

  for (const { type, question } of aiTasks) {
    const record = getQuestionRecord(subject.id, type.id, question.number);
    if (question.reviewMode === "ai") {
      if (!record?.aiReviews?.some?.((review) => !review.error)) {
        await submitAiWritingReview(subject, type, question.number);
      }
      continue;
    }

    if (question.speakingMode === "monologue" && !record?.speakingReview) {
      await submitSpeakingSection2Review(subject, type, question.number);
    }
  }

  if (subject.isStreamingMockTest) {
    randomMockSession = { active: false, completed: true };
  }
  saveExamReport(subject);
  setMockState({ subjectId: subject.id, typeId: null, questionIndex: null });
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
    <a href="${escapeHTML(config.onlineFrontendUrl || "http://47.239.62.81/aeas-mock.html")}">打开可用版本</a>
  `;
  mockApp?.insertAdjacentElement("afterbegin", notice);
}

async function handleAuthSubmit(form, action) {
  if (!window.rewardSchoolApi?.login || !window.rewardSchoolApi?.register) {
    setAuthMessage(form, "账号服务还没有加载完成。", true);
    return;
  }

  const mode = action || form.dataset.authMode || "login";
  const email = form.elements.email?.value?.trim() || "";
  const password = form.elements.password?.value || "";
  const displayName = form.elements.displayName?.value?.trim() || "";
  setAuthMessage(form, mode === "register" ? "正在注册..." : "正在登录...");

  try {
    const session = mode === "register"
      ? await window.rewardSchoolApi.register({ email, password, displayName })
      : await window.rewardSchoolApi.login({ email, password });
    saveAuthSession({ token: session?.token || "", user: null, status: "loading" });
    mockProgress = createEmptyProgress(null);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
    setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
    closeAuthModal();
    renderMockApp();
    const user = await refreshAuthStateFromServer({ hydrateProgress: true });
    if (!user?.id) {
      window.alert("会员状态取得失败，无法从服务器确认账号状态。请稍后重新登录或检查 API。");
    }
  } catch (error) {
    setAuthMessage(form, error.message || "账号操作失败。", true);
  }
}

async function handlePasswordResetRequest(form) {
  if (!window.rewardSchoolApi?.requestPasswordReset) {
    setAuthMessage(form, "账号服务还没有加载完成。", true);
    return;
  }

  const email = form.elements.email?.value?.trim() || "";
  if (!email) {
    setAuthMessage(form, "请先填写邮箱。", true);
    return;
  }

  setAuthMessage(form, "正在发送重设邮件...");
  try {
    await window.rewardSchoolApi.requestPasswordReset({ email });
    setAuthMessage(form, "如果这个邮箱存在，重设密码邮件已经发送。请到邮箱打开链接。");
  } catch (error) {
    setAuthMessage(form, error.message || "发送重设邮件失败。", true);
  }
}

async function handleAuthLogout() {
  const token = getAuthToken();
  saveAuthSession(null);
  resetLocalPracticeForSignedOutUser();
  closeAuthModal();
  setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });

  if (token && window.rewardSchoolApi?.logout) {
    window.rewardSchoolApi.logout({ token }).catch((error) => {
      console.warn("Could not logout cleanly:", error);
    });
  }
}

function setAuthMessage(form, message, isError = false) {
  const node = form?.querySelector?.("[data-auth-message]");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-error", isError);
}

if (mockApp) {
  showSecureApiNotice();
  mockApp.addEventListener("submit", (event) => {
    const form = event.target.closest?.("[data-auth-form]");
    if (!form) return;

    event.preventDefault();
    const submitter = event.submitter;
    const action = submitter?.dataset?.authAction || "login";
    void handleAuthSubmit(form, action);
  });

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
      const confirmed = window.confirm("确定要开始新一轮练习吗？当前这一轮会保留在云端历史中，本机画面会从空白进度开始。");
      if (confirmed) resetProgress();
      return;
    }

    if (target.dataset.authLogout !== undefined) {
      void handleAuthLogout();
      return;
    }

    if (target.dataset.authRefresh !== undefined) {
      void refreshAuthStateFromServer();
      return;
    }

    if (target.dataset.openAuth) {
      openAuthModal(target.dataset.openAuth);
      return;
    }

    if (target.dataset.reviewSubject) {
      openSubjectReview(target.dataset.reviewSubject, target.dataset.reviewType || "");
      return;
    }

    if (target.dataset.openExamReports !== undefined) {
      openExamReportsList();
      return;
    }

    if (target.dataset.openExamReport) {
      openExamReport(target.dataset.openExamReport);
      return;
    }

    if (target.dataset.submitFullMockTest !== undefined) {
      const subject = findSubject(mockState.subjectId);
      if (subject?.isFullMockTest) void submitFullMockTestReview(subject);
      return;
    }

    if (target.dataset.startRandomMockTest !== undefined) {
      if (randomMockSession.active && !randomMockSession.completed && !confirmAbandonRandomMockTest()) return;
      showRandomMockIntro();
      return;
    }

    if (target.dataset.confirmStartRandomMockTest !== undefined) {
      startRandomMockTest();
      return;
    }

    if (target.dataset.abandonRandomMockTest !== undefined) {
      if (!confirmAbandonRandomMockTest()) return;
      abandonRandomMockTest();
      return;
    }

    if (target.dataset.streamNextQuestion !== undefined) {
      goToNextStreamingMockStep();
      return;
    }

    const reset = target.dataset.reset;
    if (reset === "grades") {
      if (isRandomMockInProgress() && !confirmAbandonRandomMockTest()) return;
      if (isRandomMockInProgress()) abandonRandomMockTest({ goHome: false });
      setMockState({ gradeBand: null, subjectId: null, typeId: null, questionIndex: null });
      return;
    }
    if (reset === "subjects") {
      if (isRandomMockInProgress() && !confirmAbandonRandomMockTest()) return;
      if (isRandomMockInProgress()) abandonRandomMockTest({ goHome: false });
      setMockState({ subjectId: null, typeId: null, questionIndex: null });
      return;
    }
    if (reset === "types") {
      if (isRandomMockInProgress() && !confirmAbandonRandomMockTest()) return;
      if (isRandomMockInProgress()) abandonRandomMockTest({ goHome: false });
      setMockState({ typeId: null, questionIndex: null });
      return;
    }
    if (reset === "questions") {
      if (isRandomMockInProgress() && !confirmAbandonRandomMockTest()) return;
      if (isRandomMockInProgress()) abandonRandomMockTest({ goHome: false });
      setMockState({ questionIndex: null });
      return;
    }

    if (target.dataset.gradeBand) {
      if (!isAuthenticated()) {
        if (getAuthToken()) {
          void refreshAuthStateFromServer();
          window.alert("正在重新取得会员状态，请稍后再进入题库。");
        } else {
          openAuthModal("login");
        }
        return;
      }
      setMockState({ gradeBand: target.dataset.gradeBand, subjectId: null, typeId: null, questionIndex: null });
      return;
    }

    if (target.dataset.subject) {
      if (isRandomMockInProgress() && !confirmAbandonRandomMockTest()) return;
      if (isRandomMockInProgress()) abandonRandomMockTest({ goHome: false });
      if (target.dataset.subject === RANDOM_MOCK_TEST_ID) {
        showRandomMockIntro();
        return;
      }
      const selectedSubject = findSubject(target.dataset.subject);
      ensureExamStartedAt(selectedSubject);
      setMockState({ subjectId: target.dataset.subject, typeId: null, questionIndex: null });
      return;
    }

    if (target.dataset.type) {
      if (isRandomMockInProgress() && !confirmAbandonRandomMockTest()) return;
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

    if (target.dataset.resetSpeakingReview !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type && mockState.questionIndex) {
        resetSpeakingReview(subject, type, mockState.questionIndex);
      }
      return;
    }

    if (target.dataset.submitSpeakingReview !== undefined) {
      const subject = findSubject(mockState.subjectId);
      const type = findType(subject, mockState.typeId);
      if (subject && type && mockState.questionIndex) {
        submitSpeakingSection2Review(subject, type, mockState.questionIndex);
      }
      return;
    }

    if (target.dataset.question) {
      saveCurrentAnswerFromForm();
      if (isRandomMockInProgress()) {
        goToNextStreamingMockStep();
        return;
      }
      setMockState({ questionIndex: Number(target.dataset.question) });
      return;
    }
  });

  purgeSubjectProgress(RANDOM_MOCK_TEST_ID);
  saveProgress();
  renderMockApp();
  if (getAuthToken()) {
    void refreshAuthStateFromServer({ hydrateProgress: true });
  }
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
  const openAuthButton = event.target?.closest?.("[data-open-auth]");
  if (openAuthButton) {
    openAuthModal(openAuthButton.dataset.openAuth);
    return;
  }

  const closeAuthButton = event.target?.closest?.("[data-close-auth]");
  if (closeAuthButton || event.target?.matches?.("[data-auth-overlay]")) {
    closeAuthModal();
    return;
  }

  const passwordResetButton = event.target?.closest?.("[data-request-password-reset]");
  if (passwordResetButton) {
    const form = passwordResetButton.closest("[data-auth-form]");
    if (form) void handlePasswordResetRequest(form);
    return;
  }

  const closeEmailVerificationButton = event.target?.closest?.("[data-close-email-verification]");
  if (closeEmailVerificationButton || event.target?.matches?.("[data-email-verification-overlay]")) {
    closeEmailVerificationModal();
    return;
  }

  const resendVerificationButton = event.target?.closest?.("[data-resend-verification]");
  if (resendVerificationButton) {
    void handleResendVerification();
    return;
  }

  document.querySelectorAll(".mock-review-filter-dropdown[open]").forEach((dropdown) => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
  });

  const detailButton = event.target?.closest?.("[data-toggle-detail]");
  if (detailButton) {
    if (openAiReviewFromDetail(detailButton)) return;

    const row = document.querySelector(`[data-detail-row="${detailButton.dataset.toggleDetail}"]`);
    if (row) row.hidden = !row.hidden;
    return;
  }

  const closeButton = event.target?.closest?.("[data-close-review]");
  if (closeButton) {
    closeSubjectReview();
    return;
  }

  const closeExamReportButton = event.target?.closest?.("[data-close-exam-report]");
  if (closeExamReportButton || event.target?.matches?.("[data-exam-report-overlay]")) {
    document.querySelector("[data-exam-report-overlay]")?.remove();
    return;
  }

  const closeExamReportsButton = event.target?.closest?.("[data-close-exam-reports]");
  if (closeExamReportsButton || event.target?.matches?.("[data-exam-reports-overlay]")) {
    document.querySelector("[data-exam-reports-overlay]")?.remove();
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

document.addEventListener("submit", (event) => {
  const form = event.target?.closest?.("[data-auth-form]");
  if (!form || form.closest("[data-mock-app]")) return;

  event.preventDefault();
  void handleAuthSubmit(form, form.dataset.authMode || "login");
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
    document.querySelector("[data-exam-report-overlay]")?.remove();
    document.querySelector("[data-exam-reports-overlay]")?.remove();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (isRandomMockInProgress()) {
    event.preventDefault();
    event.returnValue = getRandomMockLeaveMessage();
  }
  cleanupSpeakingStream();
});

window.addEventListener("pagehide", () => {
  if (!isRandomMockInProgress()) return;
  purgeSubjectProgress(RANDOM_MOCK_TEST_ID);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(compactMockProgressForStorage(mockProgress)));
});

void migrateAllLegacySpeakingRecordings();
