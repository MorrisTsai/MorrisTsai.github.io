const rewardSchoolAiParams = new URLSearchParams(window.location.search);
const rewardSchoolApiMode = rewardSchoolAiParams.get("api");
const rewardSchoolApiDebug = rewardSchoolAiParams.get("apiDebug") === "1";
const REWARD_SCHOOL_FRONTEND_VERSION = "20260625-04";

const REWARD_SCHOOL_API_BASE_URL =
  window.REWARD_SCHOOL_API_BASE_URL ||
  (rewardSchoolApiMode === "online"
    ? "http://39.105.34.236"
    : window.location.protocol === "file:"
      ? "http://localhost:5132"
      : "http://39.105.34.236");

window.rewardSchoolAiConfig = {
  provider: "reward-school-api",
  frontendVersion: REWARD_SCHOOL_FRONTEND_VERSION,
  apiBaseUrl: REWARD_SCHOOL_API_BASE_URL,
  writingReviewEndpoint: `${REWARD_SCHOOL_API_BASE_URL}/api/aeas/writing/review`,
  models: [{ id: "deepseek-v4-pro", label: "AI Review" }],
};

console.info("[Reward School API]", window.rewardSchoolAiConfig);

if (rewardSchoolApiDebug) {
  window.addEventListener("DOMContentLoaded", () => {
    const badge = document.createElement("div");
    const mode = rewardSchoolApiMode === "online" ? "online" : window.location.protocol === "file:" ? "local" : "production";
    badge.textContent = `v${REWARD_SCHOOL_FRONTEND_VERSION} | API ${mode}: ${REWARD_SCHOOL_API_BASE_URL}`;
    badge.title = window.rewardSchoolAiConfig.writingReviewEndpoint;
    Object.assign(badge.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "99999",
      maxWidth: "min(520px, calc(100vw - 32px))",
      padding: "10px 14px",
      borderRadius: "999px",
      background: "#06265f",
      color: "#fff",
      boxShadow: "0 18px 50px rgba(6, 38, 95, 0.25)",
      font: "700 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    });
    document.body.appendChild(badge);
  });
}
