const REWARD_SCHOOL_API_BASE_URL =
  window.REWARD_SCHOOL_API_BASE_URL ||
  (window.location.protocol === "file:" ? "http://localhost:5132" : "https://api.rewardschool.com.au");

window.rewardSchoolAiConfig = {
  provider: "reward-school-api",
  apiBaseUrl: REWARD_SCHOOL_API_BASE_URL,
  writingReviewEndpoint: `${REWARD_SCHOOL_API_BASE_URL}/api/aeas/writing/review`,
  models: [{ id: "deepseek-v4-pro", label: "AI Review" }],
};
