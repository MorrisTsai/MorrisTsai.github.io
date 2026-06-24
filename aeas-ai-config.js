const REWARD_SCHOOL_API_BASE_URL =
  window.REWARD_SCHOOL_API_BASE_URL ||
  (new URLSearchParams(window.location.search).get("api") === "online"
    ? "http://api.rewardschool.com.au"
    : window.location.protocol === "file:"
      ? "http://localhost:5132"
      : "http://api.rewardschool.com.au");

window.rewardSchoolAiConfig = {
  provider: "reward-school-api",
  apiBaseUrl: REWARD_SCHOOL_API_BASE_URL,
  writingReviewEndpoint: `${REWARD_SCHOOL_API_BASE_URL}/api/aeas/writing/review`,
  models: [{ id: "deepseek-v4-pro", label: "AI Review" }],
};
