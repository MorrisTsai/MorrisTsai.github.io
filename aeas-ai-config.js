const rewardSchoolAiParams = new URLSearchParams(window.location.search);
const rewardSchoolAiHashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const rewardSchoolApiMode = rewardSchoolAiParams.get("api") || rewardSchoolAiHashParams.get("api");
const REWARD_SCHOOL_AI_CONFIG_FRONTEND_VERSION = window.rewardSchoolFrontendVersion || "20260625-17";
const REWARD_SCHOOL_ONLINE_API_HOST = "www.rewardschool.com.au";
const REWARD_SCHOOL_ONLINE_IP_HOST = "47.239.62.81";
const REWARD_SCHOOL_ONLINE_API_BASE_URL = `https://${REWARD_SCHOOL_ONLINE_API_HOST}/api`;
const REWARD_SCHOOL_ONLINE_IP_API_BASE_URL = `https://${REWARD_SCHOOL_ONLINE_IP_HOST}/api`;
const REWARD_SCHOOL_LOCAL_API_BASE_URL = "http://localhost:7147/api";
const REWARD_SCHOOL_ONLINE_FRONTEND_URL = `https://${REWARD_SCHOOL_ONLINE_API_HOST}/aeas-mock.html`;

function isRewardSchoolMarketingHost(hostname) {
  return hostname === "rewardschool.com.au" || hostname === "www.rewardschool.com.au" || hostname.endsWith(".github.io");
}

function isRewardSchoolLocalHost(protocol, hostname) {
  return protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";
}

function resolveRewardSchoolApiBaseUrl() {
  if (window.REWARD_SCHOOL_API_BASE_URL !== undefined) {
    return window.REWARD_SCHOOL_API_BASE_URL;
  }

  // Supported launch modes:
  // 1. Online page on rewardschool.com.au/www/47.239.62.81 -> same server /api.
  // 2. Local page -> local API server.
  // 3. Local page with ?api=online -> online API server.
  if (/^https?:\/\//i.test(rewardSchoolApiMode || "") && isRewardSchoolLocalHost(window.location.protocol, window.location.hostname)) {
    return rewardSchoolApiMode.replace(/\/$/, "");
  }

  if (rewardSchoolApiMode === "local") {
    return REWARD_SCHOOL_LOCAL_API_BASE_URL;
  }

  if (rewardSchoolApiMode === "online") {
    return REWARD_SCHOOL_ONLINE_API_BASE_URL;
  }

  const { protocol, hostname } = window.location;

  if (isRewardSchoolLocalHost(protocol, hostname)) {
    return REWARD_SCHOOL_LOCAL_API_BASE_URL;
  }

  if (hostname === REWARD_SCHOOL_ONLINE_API_HOST || hostname === "rewardschool.com.au") {
    return REWARD_SCHOOL_ONLINE_API_BASE_URL;
  }

  if (hostname === REWARD_SCHOOL_ONLINE_IP_HOST) {
    return REWARD_SCHOOL_ONLINE_IP_API_BASE_URL;
  }

  return REWARD_SCHOOL_ONLINE_API_BASE_URL;
}

const REWARD_SCHOOL_API_BASE_URL = resolveRewardSchoolApiBaseUrl();
const REWARD_SCHOOL_WRITING_REVIEW_ENDPOINT = REWARD_SCHOOL_API_BASE_URL
  ? `${REWARD_SCHOOL_API_BASE_URL.replace(/\/$/, "")}/aeas/writing/review`
  : "";
const REWARD_SCHOOL_SPEAKING_SECTION2_REVIEW_ENDPOINT = REWARD_SCHOOL_API_BASE_URL
  ? `${REWARD_SCHOOL_API_BASE_URL.replace(/\/$/, "")}/aeas/speaking/section2/review`
  : "";
const REWARD_SCHOOL_SPEAKING_TYPE3_REVIEW_ENDPOINT = REWARD_SCHOOL_API_BASE_URL
  ? `${REWARD_SCHOOL_API_BASE_URL.replace(/\/$/, "")}/aeas/speaking/type3/review`
  : "";

window.rewardSchoolAiConfig = {
  provider: "reward-school-api",
  frontendVersion: REWARD_SCHOOL_AI_CONFIG_FRONTEND_VERSION,
  apiMode: rewardSchoolApiMode || "auto",
  apiBaseUrl: REWARD_SCHOOL_API_BASE_URL,
  writingReviewEndpoint: REWARD_SCHOOL_WRITING_REVIEW_ENDPOINT,
  speakingSection2ReviewEndpoint: REWARD_SCHOOL_SPEAKING_SECTION2_REVIEW_ENDPOINT,
  speakingType3ReviewEndpoint: REWARD_SCHOOL_SPEAKING_TYPE3_REVIEW_ENDPOINT,
  onlineFrontendUrl: REWARD_SCHOOL_ONLINE_FRONTEND_URL,
  requiresSecureApi: false,
  requestTimeoutMs: 65000,
  speakingRequestTimeoutMs: 600000,
  models: [{ id: "deepseek-v4-pro", label: "AI Review" }],
};

console.info("[Reward School API]", window.rewardSchoolAiConfig);
