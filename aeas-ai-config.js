const rewardSchoolAiParams = new URLSearchParams(window.location.search);
const rewardSchoolAiHashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const rewardSchoolApiMode = rewardSchoolAiParams.get("api") || rewardSchoolAiHashParams.get("api");
const REWARD_SCHOOL_FRONTEND_VERSION = window.rewardSchoolFrontendVersion || "20260625-17";
const REWARD_SCHOOL_ONLINE_API_HOST = "39.105.34.236";
const REWARD_SCHOOL_ONLINE_API_BASE_URL = `http://${REWARD_SCHOOL_ONLINE_API_HOST}/api`;
const REWARD_SCHOOL_ONLINE_FRONTEND_URL = `http://${REWARD_SCHOOL_ONLINE_API_HOST}/aeas-mock.html`;

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

  if (rewardSchoolApiMode === "local") {
    return "http://localhost:5132";
  }

  if (rewardSchoolApiMode === "online") {
    return REWARD_SCHOOL_ONLINE_API_BASE_URL;
  }

  const { protocol, hostname, host } = window.location;

  if (isRewardSchoolLocalHost(protocol, hostname)) {
    return "http://localhost:5132";
  }

  // Frontend served from the API nginx host: use same-origin /api.
  if (hostname === REWARD_SCHOOL_ONLINE_API_HOST) {
    return `${protocol}//${host}/api`;
  }

  // HTTPS marketing site cannot call HTTP API (browser mixed-content block).
  if (protocol === "https:" && isRewardSchoolMarketingHost(hostname)) {
    return "";
  }

  return REWARD_SCHOOL_ONLINE_API_BASE_URL;
}

const REWARD_SCHOOL_API_BASE_URL = resolveRewardSchoolApiBaseUrl();
const REWARD_SCHOOL_WRITING_REVIEW_ENDPOINT = REWARD_SCHOOL_API_BASE_URL
  ? `${REWARD_SCHOOL_API_BASE_URL.replace(/\/$/, "")}/aeas/writing/review`
  : "/api/aeas/writing/review";
const REWARD_SCHOOL_SPEAKING_SECTION2_REVIEW_ENDPOINT = REWARD_SCHOOL_API_BASE_URL
  ? `${REWARD_SCHOOL_API_BASE_URL.replace(/\/$/, "")}/aeas/speaking/section2/review`
  : "/api/aeas/speaking/section2/review";

window.rewardSchoolAiConfig = {
  provider: "reward-school-api",
  frontendVersion: REWARD_SCHOOL_FRONTEND_VERSION,
  apiBaseUrl: REWARD_SCHOOL_API_BASE_URL,
  writingReviewEndpoint: REWARD_SCHOOL_WRITING_REVIEW_ENDPOINT,
  speakingSection2ReviewEndpoint: REWARD_SCHOOL_SPEAKING_SECTION2_REVIEW_ENDPOINT,
  onlineFrontendUrl: REWARD_SCHOOL_ONLINE_FRONTEND_URL,
  requiresSecureApi: window.location.protocol === "https:" && isRewardSchoolMarketingHost(window.location.hostname),
  requestTimeoutMs: 65000,
  speakingRequestTimeoutMs: 360000,
  models: [{ id: "deepseek-v4-pro", label: "AI Review" }],
};

console.info("[Reward School API]", window.rewardSchoolAiConfig);
