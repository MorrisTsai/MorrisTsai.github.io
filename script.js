const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form");
const REWARD_SCHOOL_FRONTEND_VERSION = "20260628-04";

window.rewardSchoolFrontendVersion = REWARD_SCHOOL_FRONTEND_VERSION;

function preserveRuntimeParamsOnLocalLinks() {
  const currentParams = new URLSearchParams(window.location.search);
  const paramNames = ["api", "debug", "apiDebug"];
  const paramsToKeep = paramNames.filter((name) => currentParams.has(name));
  if (!paramsToKeep.length) return;

  document.querySelectorAll('a[href$=".html"], a[href*=".html#"], a[href*=".html?"]').forEach((link) => {
    const rawHref = link.getAttribute("href") || "";
    if (!rawHref || rawHref.startsWith("http://") || rawHref.startsWith("https://") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      return;
    }

    const hashIndex = rawHref.indexOf("#");
    const beforeHash = hashIndex >= 0 ? rawHref.slice(0, hashIndex) : rawHref;
    const hash = hashIndex >= 0 ? rawHref.slice(hashIndex) : "";
    const queryIndex = beforeHash.indexOf("?");
    const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "";
    if (!path.toLowerCase().endsWith(".html")) return;

    const targetParams = new URLSearchParams(query);
    paramsToKeep.forEach((name) => {
      if (!targetParams.has(name)) {
        targetParams.set(name, currentParams.get(name));
      }
    });

    const nextQuery = targetParams.toString();
    link.setAttribute("href", `${path}${nextQuery ? `?${nextQuery}` : ""}${hash}`);
  });
}

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
    display: params.get("apiDebug") === "1" ? "block" : "none",
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
preserveRuntimeParamsOnLocalLinks();

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
