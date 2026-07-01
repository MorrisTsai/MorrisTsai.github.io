const LOGOUT_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";

void signOut();

async function signOut() {
  const title = document.querySelector("[data-logout-title]");
  const message = document.querySelector("[data-logout-message]");
  const token = readToken();

  try {
    if (token && window.rewardSchoolApi?.logout) {
      await window.rewardSchoolApi.logout({ token });
    }
    localStorage.removeItem(LOGOUT_AUTH_STORAGE_KEY);
    title.textContent = "已退出登录";
    message.textContent = "这个设备上的 Reward School 登录状态已经清除。";
  } catch (error) {
    localStorage.removeItem(LOGOUT_AUTH_STORAGE_KEY);
    title.textContent = "已在本机退出";
    message.textContent = "本地登录状态已清除，服务器退出请求稍后可重试。";
  }
}

function readToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOGOUT_AUTH_STORAGE_KEY) || "null");
    return saved?.token || "";
  } catch (error) {
    return "";
  }
}
