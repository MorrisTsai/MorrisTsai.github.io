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
};

function getWritingReviewEndpoint(config) {
  const mode = getApiMode();
  if (mode === "local") {
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
