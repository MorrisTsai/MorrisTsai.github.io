window.rewardSchoolApi = {
  async register({ email, password, displayName }) {
    return fetchJson(getApiEndpoint("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  async resendVerification({ token }) {
    return fetchJson(getApiEndpoint("/auth/resend-verification"), {
      method: "POST",
      headers: getAuthHeaders(token),
    });
  },

  async login({ email, password }) {
    return fetchJson(getApiEndpoint("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  async requestPasswordReset({ email }) {
    return fetchJson(getApiEndpoint("/auth/request-password-reset"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  async logout({ token }) {
    await fetchJson(getApiEndpoint("/auth/logout"), {
      method: "POST",
      headers: getAuthHeaders(token),
      expectNoContent: true,
    });
  },

  async getCurrentUser({ token }) {
    return fetchJson(getApiEndpoint("/auth/me"), {
      headers: getAuthHeaders(token),
    });
  },

  async getVocabularyDataset({ list = "core" } = {}) {
    return fetchJson(`${getApiEndpoint("/study/vocabulary")}?list=${encodeURIComponent(list)}`, {
      timeoutMs: 60000,
    });
  },

  async getEnglishKnowledgeDataset() {
    return fetchJson(getApiEndpoint("/study/english-knowledge"), {
      timeoutMs: 60000,
    });
  },

  async getAdvisorProductFlow({ token }) {
    return fetchJson(getApiEndpoint("/advisor/product-flow"), {
      headers: getAuthHeaders(token),
    });
  },

  async getAdvisorSchools({ token }) {
    return fetchJson(getApiEndpoint("/advisor/schools"), {
      headers: getAuthHeaders(token),
    });
  },

  async getAssessmentDemos() {
    return fetchJson(getApiEndpoint("/advisor/assessment-demos"));
  },

  async getTranscriptLarkStatus({ token }) {
    return fetchJson(getApiEndpoint("/advisor/transcripts/lark/status"), {
      headers: getAuthHeaders(token),
    });
  },

  async getLarkAuthorizationUrl({ token }) {
    return fetchJson(getApiEndpoint("/advisor/transcripts/lark/oauth/start"), {
      headers: getAuthHeaders(token),
    });
  },

  async listLarkTranscriptFiles({ token, folder = "" }) {
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
    return fetchJson(`${getApiEndpoint("/advisor/transcripts/lark/files")}${query}`, {
      headers: getAuthHeaders(token),
      timeoutMs: 30000,
    });
  },

  async analyzeTranscriptUpload({ token, files }) {
    const body = new FormData();
    Array.from(files || []).forEach((file) => body.append("files", file, file.name));
    return fetchJson(getApiEndpoint("/advisor/transcripts/analyze-upload"), {
      method: "POST",
      headers: getAuthHeaders(token),
      body,
      timeoutMs: 300000,
    });
  },

  async analyzeLarkTranscript({ token, fileUrlOrToken }) {
    return fetchJson(getApiEndpoint("/advisor/transcripts/analyze-lark"), {
      method: "POST",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrlOrToken }),
      timeoutMs: 300000,
    });
  },

  async createStudentAssessment({ token, assessment }) {
    return fetchJson(getApiEndpoint("/advisor/assessments"), {
      method: "POST",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(assessment),
    });
  },

  async getMyStudentAssessments({ token }) {
    return fetchJson(getApiEndpoint("/advisor/assessments/mine"), {
      headers: getAuthHeaders(token),
    });
  },

  async getAdvisorAssessments({ token }) {
    return fetchJson(getApiEndpoint("/advisor/assessments"), {
      headers: getAuthHeaders(token),
    });
  },

  async getStudentAssessment({ token, assessmentId }) {
    return fetchJson(`${getApiEndpoint("/advisor/assessments")}/${encodeURIComponent(assessmentId)}`, {
      headers: getAuthHeaders(token),
    });
  },

  async reviewStudentAssessment({ token, assessmentId, advisorStatus, advisorNotes }) {
    return fetchJson(`${getApiEndpoint("/advisor/assessments")}/${encodeURIComponent(assessmentId)}/review`, {
      method: "PUT",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ advisorStatus, advisorNotes }),
    });
  },

  async getAdminAnalytics({ token, start, end, event = "", source = "", device = "", page = "" }) {
    const query = new URLSearchParams({ start, end });
    if (event) query.set("event", event);
    if (source) query.set("source", source);
    if (device) query.set("device", device);
    if (page) query.set("page", page);
    return fetchJson(`${getApiEndpoint("/admin/analytics")}?${query}`, {
      headers: getAuthHeaders(token),
    });
  },

  async getAdminAnalyticsReport({ token, start, end, event = "", source = "", device = "", page = "", type = "sessions", search = "", pageNumber = 1, pageSize = 10 }) {
    const query = new URLSearchParams({ start, end, type, pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (event) query.set("event", event);
    if (source) query.set("source", source);
    if (device) query.set("device", device);
    if (page) query.set("page", page);
    if (search) query.set("search", search);
    return fetchJson(`${getApiEndpoint("/admin/analytics/report")}?${query}`, {
      headers: getAuthHeaders(token),
    });
  },

  async getAdminUsers({ token }) {
    return fetchJson(getApiEndpoint("/admin/users"), {
      headers: getAuthHeaders(token),
    });
  },

  async setUserRole({ token, userId, role }) {
    return fetchJson(`${getApiEndpoint("/admin/users")}/${encodeURIComponent(userId)}/role`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });
  },

  async getAccessConfiguration({ token }) {
    return fetchJson(getApiEndpoint("/admin/access-configuration"), {
      headers: getAuthHeaders(token),
    });
  },

  async setRolePermission({ token, role, permission, enabled }) {
    return fetchJson(getApiEndpoint("/admin/access-configuration"), {
      method: "PUT",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, permission, enabled: Boolean(enabled) }),
    });
  },

  async updateProfile({ token, displayName }) {
    return fetchJson(getApiEndpoint("/auth/profile"), {
      method: "PUT",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName }),
    });
  },

  async changePassword({ token, currentPassword, newPassword }) {
    await fetchJson(getApiEndpoint("/auth/change-password"), {
      method: "POST",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
      expectNoContent: true,
    });
  },

  async checkAiReviewAccess({ token, kind = "writing" }) {
    const endpoint = `${getApiEndpoint("/aeas/review/access")}?kind=${encodeURIComponent(kind || "writing")}`;
    return fetchJson(endpoint, {
      headers: getAuthHeaders(token),
    });
  },

  async getPracticeProgress({ token, kind = "aeas-mock" }) {
    const endpoint = `${getApiEndpoint("/practice/progress")}?kind=${encodeURIComponent(kind)}`;
    return fetchJson(endpoint, {
      headers: getAuthHeaders(token),
      allowNotFound: true,
    });
  },

  async getPracticeHistory({ token, kind = "aeas-mock", limit = 20 }) {
    const endpoint = `${getApiEndpoint("/practice/history")}?kind=${encodeURIComponent(kind)}&limit=${encodeURIComponent(limit)}`;
    return fetchJson(endpoint, {
      headers: getAuthHeaders(token),
    });
  },

  async getTeacherStudents({ token }) {
    return fetchJson(getApiEndpoint("/teacher/students"), { headers: getAuthHeaders(token) });
  },

  async addTeacherStudent({ token, email }) {
    return fetchJson(getApiEndpoint("/teacher/students"), {
      method: "POST",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  async removeTeacherStudent({ token, studentId }) {
    return fetchJson(getApiEndpoint(`/teacher/students/${encodeURIComponent(studentId)}`), {
      method: "DELETE",
      headers: getAuthHeaders(token),
      expectNoContent: true,
    });
  },

  async getTeacherStudentPractice({ token, studentId, kind = "aeas-mock", sessionId = "" }) {
    const query = new URLSearchParams({ kind });
    if (sessionId) query.set("sessionId", sessionId);
    return fetchJson(`${getApiEndpoint(`/teacher/students/${encodeURIComponent(studentId)}/practice`)}?${query}`, {
      headers: getAuthHeaders(token),
      timeoutMs: 30000,
    });
  },

  async getTeacherAudioBlob({ token, studentId, audioId }) {
    const response = await fetch(getApiEndpoint(`/teacher/students/${encodeURIComponent(studentId)}/audio/${encodeURIComponent(audioId)}`), {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) throw new Error(response.status === 404 ? "录音文件不存在。" : "录音读取失败。");
    return response.blob();
  },

  async savePracticeProgress({ token, kind = "aeas-mock", sessionId, progress }) {
    await fetchJson(getApiEndpoint("/practice/progress"), {
      method: "PUT",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind, sessionId, progress }),
      expectNoContent: true,
    });
  },

  async savePracticeAttempt({ token, attempt }) {
    return fetchJson(getApiEndpoint("/practice/attempts"), {
      method: "POST",
      headers: {
        ...getAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attempt),
    });
  },

  async uploadPracticeAudio({ token, kind = "aeas-mock", sessionId, questionKey, segmentId, blob }) {
    const body = new FormData();
    body.append("kind", kind);
    body.append("sessionId", sessionId);
    body.append("questionKey", questionKey);
    body.append("segmentId", segmentId);
    body.append("audio", blob, `${segmentId || "recording"}.${getAudioExtension(blob?.type || "")}`);

    return fetchJson(getApiEndpoint("/practice/audio"), {
      method: "POST",
      headers: getAuthHeaders(token),
      body,
    });
  },

  async reviewWriting({ question, essay, sourceId, token }) {
    const config = window.rewardSchoolAiConfig || {};
    const endpoint = getWritingReviewEndpoint(config);
    const timeoutMs = Number(config.requestTimeoutMs || 65000);
    window.rewardSchoolApi.lastEndpoint = endpoint;

    let response;
    const controller = new AbortController();
    let didTimeout = false;
    let timeoutId = 0;
    const timeoutError = new Error(`Writing review API timed out after ${Math.round(timeoutMs / 1000)} seconds at ${endpoint}.`);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
        reject(timeoutError);
      }, timeoutMs);
    });

    try {
      response = await Promise.race([fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        signal: controller.signal,
        body: JSON.stringify({
          question,
          essay,
          sourceId,
        }),
      }), timeoutPromise]);

      const responseText = await Promise.race([response.text(), timeoutPromise]);
      if (!response.ok) {
        throw createReviewError(responseText, response.status, "Writing review API failed");
      }

      try {
        return JSON.parse(responseText);
      } catch (error) {
        throw new Error(`Writing review API returned invalid JSON from ${endpoint}: ${responseText.slice(0, 180)}`);
      }
    } catch (error) {
      if (didTimeout || error === timeoutError || error?.name === "AbortError") {
        throw timeoutError;
      }
      if (error?.message?.startsWith("Writing review API")) throw error;
      throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async reviewSpeakingSection2({ topicCard, prompts, segments, sourceId, token, onProgress }) {
    const config = window.rewardSchoolAiConfig || {};
    const endpoint = getSpeakingSection2ReviewEndpoint(config);
    const timeoutMs = Number(config.speakingRequestTimeoutMs || 600000);
    window.rewardSchoolApi.lastSpeakingEndpoint = endpoint;
    const reportProgress = typeof onProgress === "function" ? onProgress : () => {};
    const totalSegments = (segments || []).length;

    const body = new FormData();
    body.append("topicCard", topicCard || "");
    body.append("prompts", JSON.stringify(prompts || []));
    body.append("followUpQuestions", JSON.stringify((segments || []).filter((segment) => segment.type === "followUp").map((segment) => segment.question || "")));
    body.append("segmentIds", JSON.stringify((segments || []).map((segment) => segment.id || "")));
    body.append("segmentTypes", JSON.stringify((segments || []).map((segment) => segment.type || "")));
    if (sourceId) body.append("sourceId", sourceId);
    (segments || []).forEach((segment, index) => {
      const extension = getAudioExtension(segment.blob?.type || "");
      body.append(`audio${String(index).padStart(2, "0")}`, segment.blob, `${segment.id || `segment-${index + 1}`}.${extension}`);
      reportProgress(`第 ${index + 1}/${totalSegments} 段录音准备好了。`);
    });

    let response;
    const controller = new AbortController();
    let didTimeout = false;
    let timeoutId = 0;
    const timeoutError = new Error(`Speaking review API timed out after ${Math.round(timeoutMs / 1000)} seconds at ${endpoint}.`);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
        reject(timeoutError);
      }, timeoutMs);
    });

    try {
      (segments || []).forEach((_, index) => {
        reportProgress(`第 ${index + 1}/${totalSegments} 段录音已送出。`);
      });

      response = await Promise.race([fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(token),
        signal: controller.signal,
        body,
      }), timeoutPromise]);

      const responseText = await Promise.race([response.text(), timeoutPromise]);
      if (!response.ok) {
        throw createReviewError(responseText, response.status, "Speaking review API failed");
      }

      try {
        const payload = JSON.parse(responseText);
        const returnedSegments = Array.isArray(payload?.segments) && payload.segments.length ? payload.segments : segments || [];
        returnedSegments.forEach((_, index) => {
          reportProgress(`第 ${index + 1}/${totalSegments} 段录音已听完。`);
        });
        reportProgress("正在整理评分和建议。");
        return payload;
      } catch (error) {
        throw new Error(`Speaking review API returned invalid JSON from ${endpoint}: ${responseText.slice(0, 180)}`);
      }
    } catch (error) {
      if (didTimeout || error === timeoutError || error?.name === "AbortError") {
        throw timeoutError;
      }
      if (error?.message?.startsWith("Speaking review API")) throw error;
      throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async reviewSpeakingType3({ imageTitle, imageDescription, pictureQuestions, segments, sourceId, token, onProgress }) {
    const config = window.rewardSchoolAiConfig || {};
    const endpoint = getSpeakingType3ReviewEndpoint(config);
    const timeoutMs = Number(config.speakingRequestTimeoutMs || 600000);
    window.rewardSchoolApi.lastSpeakingEndpoint = endpoint;
    const reportProgress = typeof onProgress === "function" ? onProgress : () => {};
    const totalSegments = (segments || []).length;

    const body = new FormData();
    body.append("imageTitle", imageTitle || "");
    body.append("imageDescriptionCore", imageDescription?.core || "");
    body.append("visibleDetails", JSON.stringify(imageDescription?.visibleDetails || []));
    body.append("activities", JSON.stringify(imageDescription?.activities || []));
    body.append("pictureQuestions", JSON.stringify(pictureQuestions || []));
    body.append("segmentIds", JSON.stringify((segments || []).map((segment) => segment.id || "")));
    body.append("segmentTypes", JSON.stringify((segments || []).map((segment) => segment.type || "")));
    if (sourceId) body.append("sourceId", sourceId);
    (segments || []).forEach((segment, index) => {
      const extension = getAudioExtension(segment.blob?.type || "");
      body.append(`audio${String(index).padStart(2, "0")}`, segment.blob, `${segment.id || `segment-${index + 1}`}.${extension}`);
      reportProgress(`第 ${index + 1}/${totalSegments} 段录音准备好了。`);
    });

    let response;
    const controller = new AbortController();
    let didTimeout = false;
    let timeoutId = 0;
    const timeoutError = new Error(`Speaking type 3 review API timed out after ${Math.round(timeoutMs / 1000)} seconds at ${endpoint}.`);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
        reject(timeoutError);
      }, timeoutMs);
    });

    try {
      (segments || []).forEach((_, index) => {
        reportProgress(`第 ${index + 1}/${totalSegments} 段录音已送出。`);
      });

      response = await Promise.race([fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(token),
        signal: controller.signal,
        body,
      }), timeoutPromise]);

      const responseText = await Promise.race([response.text(), timeoutPromise]);
      if (!response.ok) {
        throw createReviewError(responseText, response.status, "Speaking type 3 review API failed");
      }

      try {
        const payload = JSON.parse(responseText);
        const returnedSegments = Array.isArray(payload?.segments) && payload.segments.length ? payload.segments : segments || [];
        returnedSegments.forEach((_, index) => {
          reportProgress(`第 ${index + 1}/${totalSegments} 段录音已听完。`);
        });
        reportProgress("正在整理评分和建议。");
        return payload;
      } catch (error) {
        throw new Error(`Speaking type 3 review API returned invalid JSON from ${endpoint}: ${responseText.slice(0, 180)}`);
      }
    } catch (error) {
      if (didTimeout || error === timeoutError || error?.name === "AbortError") {
        throw timeoutError;
      }
      if (error?.message?.startsWith("Speaking type 3 review API")) throw error;
      throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  },
};

async function fetchJson(endpoint, options = {}) {
  let response;
  const timeoutMs = Number(options.timeoutMs || 12000);
  const controller = options.signal ? null : new AbortController();
  const signal = options.signal || controller?.signal;
  let timeoutId = 0;

  if (controller && timeoutMs > 0) {
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    response = await fetch(endpoint, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body,
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`API request timed out after ${Math.round(timeoutMs / 1000)} seconds: ${endpoint}`);
    }
    throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }

  if (options.allowNotFound && response.status === 404) return null;
  if (options.expectNoContent && response.status === 204) return null;

  const responseText = await response.text();
  if (!response.ok) {
    let message = responseText.slice(0, 240);
    let retryAfterSeconds = 0;
    try {
      const payload = JSON.parse(responseText);
      retryAfterSeconds = Number(payload?.retryAfterSeconds || 0);
      message = payload?.retryAfterSeconds > 0
        ? payload?.error
          ? `${payload.error} 请再等 ${payload.retryAfterSeconds} 秒。`
          : `请再等 ${payload.retryAfterSeconds} 秒后重试。`
        : payload?.error || message;
    } catch (error) {
      // Keep the raw server response text.
    }
    const error = new Error(message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.responseText = responseText;
    error.retryAfterSeconds = retryAfterSeconds;
    throw error;
  }

  return responseText ? JSON.parse(responseText) : null;
}

function getApiEndpoint(path) {
  const config = window.rewardSchoolAiConfig || {};
  const baseUrl = config.apiBaseUrl || resolveApiBaseUrlFallback();
  if (baseUrl) {
    const normalized = baseUrl.replace(/\/$/, "");
    const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
    return `${apiBase}${path}`;
  }

  throw new Error("API config is missing apiBaseUrl. Open this page with ?api=local or ?api=online.");
}

function resolveApiBaseUrlFallback() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const mode = params.get("api") || hashParams.get("api");
  const onlineHost = "www.rewardschool.com.au";
  const onlineIpHost = "47.239.62.81";
  const onlineBase = `https://${onlineHost}/api`;
  const onlineIpBase = `https://${onlineIpHost}/api`;
  const localBase = "http://localhost:7147/api";
  const { protocol, hostname } = window.location;
  const isLocal = protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  if (mode === "online") return onlineBase;
  if (mode === "local") return localBase;
  if (hostname === onlineHost || hostname === "rewardschool.com.au") return onlineBase;
  if (hostname === onlineIpHost) return onlineIpBase;
  if (isLocal) return localBase;
  return onlineBase;
}

function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getReviewErrorMessage(responseText, status, fallback) {
  try {
    const payload = JSON.parse(responseText);
    if (payload?.retryAfterSeconds > 0) {
      return `每个账号每 3 分钟只能提交一次 AI 批改，请再等 ${payload.retryAfterSeconds} 秒。`;
    }
    if (payload?.error) {
      return payload.error;
    }
  } catch (error) {
    // Keep fallback below.
  }

  return `${fallback}: ${status} ${responseText.slice(0, 180)}`;
}

function createReviewError(responseText, status, fallback) {
  const error = new Error(getReviewErrorMessage(responseText, status, fallback));
  error.status = status;

  try {
    const payload = JSON.parse(responseText);
    if (payload?.error) {
      error.serverError = payload.error;
    }
    if (payload?.retryAfterSeconds > 0) {
      error.retryAfterSeconds = Number(payload.retryAfterSeconds);
    }
  } catch (parseError) {
    // Keep the plain message.
  }

  return error;
}

function getWritingReviewEndpoint(config) {
  if (config.writingReviewEndpoint) {
    return config.writingReviewEndpoint;
  }

  return getApiEndpoint("/aeas/writing/review");
}

function getSpeakingSection2ReviewEndpoint(config) {
  if (config.speakingSection2ReviewEndpoint) {
    return config.speakingSection2ReviewEndpoint;
  }

  return getApiEndpoint("/aeas/speaking/section2/review");
}

function getSpeakingType3ReviewEndpoint(config) {
  if (config.speakingType3ReviewEndpoint) {
    return config.speakingType3ReviewEndpoint;
  }

  return getApiEndpoint("/aeas/speaking/type3/review");
}

function getAudioExtension(contentType) {
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("ogg")) return "ogg";
  return "webm";
}

