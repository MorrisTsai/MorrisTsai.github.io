const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form");
const REWARD_SCHOOL_FRONTEND_VERSION = "20260625-11";

window.rewardSchoolFrontendVersion = REWARD_SCHOOL_FRONTEND_VERSION;

function getDebugBadgeText() {
  const apiConfig = window.rewardSchoolAiConfig;
  const apiText = apiConfig?.apiBaseUrl ? ` | API: ${apiConfig.apiBaseUrl}` : "";
  return `Frontend v${REWARD_SCHOOL_FRONTEND_VERSION}${apiText}`;
}

function setupHiddenDebugBadge() {
  const brand = document.querySelector(".brand");
  const params = new URLSearchParams(window.location.search);
  const badge = document.createElement("div");
  badge.id = "reward-school-debug-badge";
  badge.textContent = getDebugBadgeText();
  Object.assign(badge.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "99999",
    display: params.get("debug") === "1" || params.get("apiDebug") === "1" ? "block" : "none",
    maxWidth: "min(560px, calc(100vw - 32px))",
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

  let clickCount = 0;
  let clickTimer = null;
  brand?.addEventListener("click", (event) => {
    clickCount += 1;
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      clickCount = 0;
    }, 1400);

    if (clickCount >= 5) {
      event.preventDefault();
      badge.textContent = getDebugBadgeText();
      badge.style.display = badge.style.display === "none" ? "block" : "none";
      clickCount = 0;
    }
  });
}

setupHiddenDebugBadge();

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = contactForm.querySelector(".form-note");
    const submitButton = contactForm.querySelector('button[type="submit"]');

    if (note) {
      note.textContent = "正在发送咨询需求，请稍候...";
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "发送中...";
    }

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      contactForm.reset();
      if (note) {
        note.textContent = "已成功发送，我们会尽快与您联系。";
      }
    } catch (error) {
      if (note) {
        note.textContent = "发送失败，请稍后再试，或直接通过微信/电话联系我们。";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "发送咨询需求";
      }
    }
  });
}
