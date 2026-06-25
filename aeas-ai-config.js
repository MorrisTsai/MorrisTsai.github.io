const rewardSchoolAiParams = new URLSearchParams(window.location.search);
const rewardSchoolAiHashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const rewardSchoolApiMode = rewardSchoolAiParams.get("api") || rewardSchoolAiHashParams.get("api");
const REWARD_SCHOOL_FRONTEND_VERSION = window.rewardSchoolFrontendVersion || "20260625-17";
const REWARD_SCHOOL_ONLINE_API_BASE_URL = "http://39.105.34.236/api";

function resolveRewardSchoolApiBaseUrl() {
  if (window.REWARD_SCHOOL_API_BASE_URL !== undefined) {
    return window.REWARD_SCHOOL_API_BASE_URL;
  }

  if (rewardSchoolApiMode === "online") {
    return REWARD_SCHOOL_ONLINE_API_BASE_URL;
  }

  if (rewardSchoolApiMode === "local") {
    return "http://localhost:5132";
  }

  return REWARD_SCHOOL_ONLINE_API_BASE_URL;
}

const REWARD_SCHOOL_API_BASE_URL = resolveRewardSchoolApiBaseUrl();
const REWARD_SCHOOL_WRITING_REVIEW_ENDPOINT = REWARD_SCHOOL_API_BASE_URL
  ? `${REWARD_SCHOOL_API_BASE_URL.replace(/\/$/, "")}/aeas/writing/review`
  : "/api/aeas/writing/review";

window.rewardSchoolAiConfig = {
  provider: "reward-school-api",
  frontendVersion: REWARD_SCHOOL_FRONTEND_VERSION,
  apiBaseUrl: REWARD_SCHOOL_API_BASE_URL,
  writingReviewEndpoint: REWARD_SCHOOL_WRITING_REVIEW_ENDPOINT,
  requestTimeoutMs: 65000,
  models: [{ id: "deepseek-v4-pro", label: "AI Review" }],
};

console.info("[Reward School API]", window.rewardSchoolAiConfig);
