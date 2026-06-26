window.rewardSchoolApi = {
  async reviewWriting({ question, essay, sourceId }) {
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
        throw new Error(`Writing review API failed at ${endpoint}: ${response.status} ${responseText.slice(0, 180)}`);
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
      if (config.requiresSecureApi && endpoint.startsWith("http://")) {
        throw new Error(
          `Cannot reach API endpoint: ${endpoint}. HTTPS pages cannot call HTTP APIs. Open ${config.onlineFrontendUrl || "http://39.105.34.236/aeas-mock.html"} for AI review.`
        );
      }
      throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async reviewSpeakingSection2({ topicCard, prompts, segments, sourceId, onProgress }) {
    const config = window.rewardSchoolAiConfig || {};
    const endpoint = getSpeakingSection2ReviewEndpoint(config);
    const timeoutMs = Number(config.speakingRequestTimeoutMs || 180000);
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
      reportProgress(`第 ${index + 1}/${totalSegments} 段音频已加入评分队列。`);
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
        reportProgress(`第 ${index + 1}/${totalSegments} 段音频已送出，正在等待分析结果。`);
      });

      response = await Promise.race([fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        body,
      }), timeoutPromise]);

      const responseText = await Promise.race([response.text(), timeoutPromise]);
      if (!response.ok) {
        throw new Error(`Speaking review API failed at ${endpoint}: ${response.status} ${responseText.slice(0, 180)}`);
      }

      try {
        const payload = JSON.parse(responseText);
        const returnedSegments = Array.isArray(payload?.segments) && payload.segments.length ? payload.segments : segments || [];
        returnedSegments.forEach((_, index) => {
          reportProgress(`已取得第 ${index + 1}/${totalSegments} 段语音分析结果。`);
        });
        reportProgress("正在生成综合评分与中文反馈。");
        return payload;
      } catch (error) {
        throw new Error(`Speaking review API returned invalid JSON from ${endpoint}: ${responseText.slice(0, 180)}`);
      }
    } catch (error) {
      if (didTimeout || error === timeoutError || error?.name === "AbortError") {
        throw timeoutError;
      }
      if (error?.message?.startsWith("Speaking review API")) throw error;
      if (config.requiresSecureApi && endpoint.startsWith("http://")) {
        throw new Error(
          `Cannot reach API endpoint: ${endpoint}. HTTPS pages cannot call HTTP APIs. Open ${config.onlineFrontendUrl || "http://39.105.34.236/aeas-mock.html"} for AI review.`
        );
      }
      throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  },
};

function getWritingReviewEndpoint(config) {
  const mode = getApiMode();
  if (mode === "local" || isLocalApiPage()) {
    return "http://localhost:5132/api/aeas/writing/review";
  }

  if (config.writingReviewEndpoint) {
    return config.writingReviewEndpoint;
  }

  if (mode === "online") {
    return "http://39.105.34.236/api/aeas/writing/review";
  }

  return getDefaultWritingReviewEndpoint();
}

function getSpeakingSection2ReviewEndpoint(config) {
  const mode = getApiMode();
  if (mode === "local" || isLocalApiPage()) {
    return "http://localhost:5132/api/aeas/speaking/section2/review";
  }

  if (config.speakingSection2ReviewEndpoint) {
    return config.speakingSection2ReviewEndpoint;
  }

  if (mode === "online") {
    return "http://39.105.34.236/api/aeas/speaking/section2/review";
  }

  const defaultWritingEndpoint = getDefaultWritingReviewEndpoint();
  return defaultWritingEndpoint.replace(/\/aeas\/writing\/review$/, "/aeas/speaking/section2/review");
}

function isLocalApiPage() {
  return window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";
}

function getAudioExtension(contentType) {
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("ogg")) return "ogg";
  return "webm";
}

function getApiMode() {
  const searchParams = new URLSearchParams(window.location.search || "");
  const hashText = (window.location.hash || "").replace(/^#/, "");
  const hashParams = new URLSearchParams(hashText);
  return searchParams.get("api") || hashParams.get("api") || "";
}

function getDefaultWritingReviewEndpoint() {
  const config = window.rewardSchoolAiConfig || {};
  if (config.writingReviewEndpoint) {
    return config.writingReviewEndpoint;
  }

  if (window.location.hostname === "39.105.34.236") {
    return `${window.location.origin}/api/aeas/writing/review`;
  }

  return "http://39.105.34.236/api/aeas/writing/review";
}
