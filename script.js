const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form");
const REWARD_SCHOOL_FRONTEND_VERSION = "20260720-05";
const ANALYTICS_VISITOR_STORAGE_KEY = "rewardSchoolAnalyticsVisitorV1";
const ANALYTICS_SESSION_STORAGE_KEY = "rewardSchoolAnalyticsSessionV1";
const ANALYTICS_SESSION_CONTEXT_KEY = "rewardSchoolAnalyticsContextV1";
const ANALYTICS_FIRST_SEEN_STORAGE_KEY = "rewardSchoolAnalyticsFirstSeenV1";
const ANALYTICS_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";
const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-C2EGD547FP";
const ANALYTICS_REQUEST_TIMEOUT_MS = 2000;
const GOOGLE_ANALYTICS_EXCLUDED_PATHS = [
  "/admin",
  "/advisor-product-flow.html",
  "/advisor-school-detail.html",
];

let googleAnalyticsLoaded = false;

window.rewardSchoolFrontendVersion = REWARD_SCHOOL_FRONTEND_VERSION;

function renderSharedSiteNavigation() {
  if (!siteNav) return;
  const inSchoolDirectory = /\/schools\//i.test(window.location.pathname.replace(/\\/g, "/"));
  const prefix = inSchoolDirectory ? "../" : "";
  const href = (path) => `${prefix}${path}`;
  siteNav.innerHTML = `
    <a class="nav-mock-cta" href="${href("aeas-mock.html")}"><span>模拟练习</span><small>适合 AEAS 考生</small></a>
    <details class="nav-dropdown"><summary>中学留学</summary><div>
      <a href="${href("advisor-product-flow.html")}">私校申请与升学规划</a>
      <a href="${href("aeas.html")}">升学衔接课程</a>
      <a href="${href("aeas-study-resources.html")}">AEAS 考试学习资料</a>
      <a class="nav-mock-link" href="${href("aeas-mock.html")}"><span>入学模拟练习</span><small>适合 AEAS 考生</small></a>
      <a href="${href("under-18-welfare-guide.html")}">住宿监护与入学落地</a>
      <a class="nav-advisor-link" href="${href("advisor-schools.html")}"><span>学校资料库</span></a>
    </div></details>
    <a href="${href("pte.html")}">PTE 培训</a>
    <a href="${href("camp.html")}">小留学</a>
    <details class="nav-dropdown nav-guides-dropdown"><summary>升学指南</summary><div>
      <a href="${href("guides.html")}">全部升学指南</a>
      <a href="${href("aeas-exam-guide.html")}">AEAS 考试流程</a>
      <a href="${href("aeas-score-report.html")}">AEAS 成绩报告</a>
      <a href="${href("year-11-application-timeline.html")}">Year 11 申请时间线</a>
      <a href="${href("under-18-welfare-guide.html")}">未满 18 岁住宿与监护安排</a>
    </div></details>
    <details class="nav-dropdown nav-account-dropdown"><summary>关于 Reward</summary><div>
      <a href="${href("index.html#why-us")}">关于我们</a>
      <a href="${href("profile.html")}">个人中心</a>
      <a class="nav-consult-link" href="${href("index.html#contact")}">预约咨询</a>
    </div></details>
  `;
  const currentFile = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
  siteNav.querySelectorAll("a[href]").forEach((link) => {
    const linkedFile = link.getAttribute("href")?.split("#")[0].split("?")[0].split("/").pop();
    if (linkedFile && linkedFile === currentFile) link.setAttribute("aria-current", "page");
  });
}

renderSharedSiteNavigation();

function shouldUseGoogleAnalytics() {
  const path = window.location.pathname.toLowerCase();
  return !GOOGLE_ANALYTICS_EXCLUDED_PATHS.some((excludedPath) => path.startsWith(excludedPath));
}

function ensureGoogleTagQueue() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
}

function loadGoogleAnalytics() {
  if (!shouldUseGoogleAnalytics() || googleAnalyticsLoaded) return;
  try {
    googleAnalyticsLoaded = true;
    ensureGoogleTagQueue();
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_MEASUREMENT_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement("script");
    script.async = true;
    script.fetchPriority = "low";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_MEASUREMENT_ID)}`;
    script.dataset.rewardSchoolGoogleAnalytics = "true";
    script.onerror = () => script.remove();
    document.head.appendChild(script);
  } catch (error) {
    // Analytics is optional and must never interrupt the website experience.
  }
}

function scheduleGoogleAnalytics() {
  if (!shouldUseGoogleAnalytics() || googleAnalyticsLoaded) return;
  const scheduleAfterLoad = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => loadGoogleAnalytics(), { timeout: 2500 });
      return;
    }
    window.setTimeout(loadGoogleAnalytics, 1000);
  };
  if (document.readyState === "complete") {
    scheduleAfterLoad();
  } else {
    window.addEventListener("load", scheduleAfterLoad, { once: true });
  }
}

function sendGoogleAnalyticsEvent(eventName, metadata = {}) {
  try {
    if (!shouldUseGoogleAnalytics() || eventName === "page_view") return;
    const safeMetadata = {
      page_path: window.location.pathname || "/",
      ...normalizeAnalyticsMetadata(metadata),
    };
    ensureGoogleTagQueue();
    window.gtag("event", eventName, safeMetadata);
  } catch (error) {
    // Ignore blocked or unavailable third-party analytics.
  }
}

if (shouldUseGoogleAnalytics()) {
  scheduleGoogleAnalytics();
}

function createAnalyticsId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getAnalyticsId(storage, key) {
  try {
    const saved = storage.getItem(key);
    if (saved) return saved;
    const created = createAnalyticsId();
    storage.setItem(key, created);
    return created;
  } catch (error) {
    return createAnalyticsId();
  }
}

function normalizeAnalyticsLabel(value, fallback = "") {
  return String(value || fallback).trim().toLowerCase().slice(0, 80);
}

function detectAnalyticsDevice() {
  const userAgent = navigator.userAgent || "";
  if (/ipad|tablet/i.test(userAgent) || (/macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1)) return "tablet";
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return "mobile";
  return "desktop";
}

function detectAnalyticsBrowser() {
  const userAgent = navigator.userAgent || "";
  if (/edg\//i.test(userAgent)) return "edge";
  if (/opr\//i.test(userAgent)) return "opera";
  if (/samsungbrowser/i.test(userAgent)) return "samsung internet";
  if (/crios|chrome/i.test(userAgent)) return "chrome";
  if (/fxios|firefox/i.test(userAgent)) return "firefox";
  if (/safari/i.test(userAgent)) return "safari";
  return "other";
}

function detectAnalyticsOperatingSystem() {
  const userAgent = navigator.userAgent || "";
  if (/windows/i.test(userAgent)) return "windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (/mac os|macintosh/i.test(userAgent)) return "macos";
  if (/linux/i.test(userAgent)) return "linux";
  return "other";
}

function classifyAnalyticsSource(referrerHost, query) {
  const utmSource = normalizeAnalyticsLabel(query.get("utm_source"));
  const utmMedium = normalizeAnalyticsLabel(query.get("utm_medium"));
  if (utmSource) return { source: utmSource, medium: utmMedium || "campaign" };
  if (!referrerHost || referrerHost === window.location.hostname.toLowerCase()) return { source: "direct", medium: "none" };

  const sourceRules = [
    ["baidu", /(^|\.)baidu\./],
    ["google", /(^|\.)google\./],
    ["bing", /(^|\.)bing\.com$/],
    ["sogou", /(^|\.)sogou\.com$/],
    ["360 search", /(^|\.)(so|haosou)\.com$/],
    ["duckduckgo", /(^|\.)duckduckgo\.com$/],
    ["yahoo", /(^|\.)yahoo\./],
  ];
  const searchMatch = sourceRules.find(([, pattern]) => pattern.test(referrerHost));
  if (searchMatch) return { source: searchMatch[0], medium: "organic" };

  const socialRules = [
    ["wechat", /(^|\.)(weixin\.qq|wechat)\.com$/],
    ["xiaohongshu", /(^|\.)xiaohongshu\.com$/],
    ["zhihu", /(^|\.)zhihu\.com$/],
    ["douyin", /(^|\.)douyin\.com$/],
    ["facebook", /(^|\.)facebook\.com$/],
    ["instagram", /(^|\.)instagram\.com$/],
  ];
  const socialMatch = socialRules.find(([, pattern]) => pattern.test(referrerHost));
  if (socialMatch) return { source: socialMatch[0], medium: "social" };
  return { source: referrerHost.slice(0, 80), medium: "referral" };
}

function getAnalyticsSessionContext() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ANALYTICS_SESSION_CONTEXT_KEY) || "null");
    if (saved?.source && saved?.landingPath) return saved;
  } catch (error) {
    // Rebuild a minimal session context when browser storage is unavailable or invalid.
  }

  let referrerHost = "";
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
  } catch (error) {
    referrerHost = "";
  }
  const query = new URLSearchParams(window.location.search);
  const attribution = classifyAnalyticsSource(referrerHost, query);
  let isReturning = false;
  try {
    isReturning = Boolean(localStorage.getItem(ANALYTICS_FIRST_SEEN_STORAGE_KEY));
    if (!isReturning) localStorage.setItem(ANALYTICS_FIRST_SEEN_STORAGE_KEY, new Date().toISOString());
  } catch (error) {
    isReturning = false;
  }
  const context = {
    source: attribution.source,
    medium: attribution.medium,
    campaign: String(query.get("utm_campaign") || "").slice(0, 120),
    term: String(query.get("utm_term") || "").slice(0, 120),
    content: String(query.get("utm_content") || "").slice(0, 120),
    referrerHost,
    landingPath: window.location.pathname || "/",
    device: detectAnalyticsDevice(),
    browser: detectAnalyticsBrowser(),
    os: detectAnalyticsOperatingSystem(),
    language: String(navigator.language || "unknown").slice(0, 32),
    timezone: String(Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown").slice(0, 64),
    visitorType: isReturning ? "returning" : "new",
  };
  try {
    sessionStorage.setItem(ANALYTICS_SESSION_CONTEXT_KEY, JSON.stringify(context));
  } catch (error) {
    // Continue without persistence; event collection itself remains available.
  }
  return context;
}

function getAnalyticsToken() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_AUTH_STORAGE_KEY) || "null")?.token || "";
  } catch (error) {
    return "";
  }
}

function getAnalyticsEndpoint() {
  const configuredBase = window.rewardSchoolAiConfig?.apiBaseUrl || "";
  if (configuredBase) {
    const normalized = configuredBase.replace(/\/$/, "");
    const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
    return `${apiBase}/analytics/events`;
  }
  if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) || window.location.protocol === "file:") {
    return "https://localhost:7147/api/analytics/events";
  }
  return "/api/analytics/events";
}

function getAnalyticsReferrer() {
  if (!document.referrer) return "";
  try {
    const referrer = new URL(document.referrer);
    return `${referrer.origin}${referrer.pathname}`.slice(0, 500);
  } catch (error) {
    return "";
  }
}

function normalizeAnalyticsMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(metadata)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 24)
    .map(([key, value]) => [String(key).slice(0, 48), typeof value === "string" ? value.slice(0, 160) : value]));
}

function trackRewardSchoolEvent(eventName, metadata = {}) {
  if (!eventName) return Promise.resolve();
  try {
    sendGoogleAnalyticsEvent(eventName, metadata);
    const token = getAnalyticsToken();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), ANALYTICS_REQUEST_TIMEOUT_MS) : null;
    return fetch(getAnalyticsEndpoint(), {
      method: "POST",
      keepalive: true,
      signal: controller?.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        eventId: createAnalyticsId(),
        eventName,
        visitorId: getAnalyticsId(localStorage, ANALYTICS_VISITOR_STORAGE_KEY),
        sessionId: getAnalyticsId(sessionStorage, ANALYTICS_SESSION_STORAGE_KEY),
        pagePath: window.location.pathname || "/",
        referrer: getAnalyticsReferrer(),
        metadata: normalizeAnalyticsMetadata({ ...getAnalyticsSessionContext(), ...metadata }),
      }),
    }).then(() => undefined).catch(() => undefined).finally(() => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    });
  } catch (error) {
    return Promise.resolve();
  }
}

window.rewardSchoolAnalytics = { track: trackRewardSchoolEvent };

window.setTimeout(() => {
  void trackRewardSchoolEvent("page_view", { title: document.title });
  const schoolMatch = window.location.pathname.match(/\/schools\/([^/]+)\.html$/i);
  if (schoolMatch) {
    void trackRewardSchoolEvent("school_profile_view", { school: decodeURIComponent(schoolMatch[1]) });
  }
}, 0);

document.addEventListener("click", (event) => {
  const target = event.target.closest?.("a, button, .wechat-card");
  if (!target) return;
  const href = target.getAttribute?.("href") || "";
  if (target.closest?.(".wechat-card")) {
    void trackRewardSchoolEvent("wechat_click");
    return;
  }
  if (href.includes("#contact") || target.classList?.contains("nav-consult-link")) {
    void trackRewardSchoolEvent("consultation_click", { label: target.textContent?.trim() || "" });
    return;
  }
  if (/aeas-mock\.html/i.test(href)) {
    void trackRewardSchoolEvent("mock_entry_click", { label: target.textContent?.trim() || "" });
  }
});

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

function setupDropdownNavigation() {
  const dropdowns = Array.from(document.querySelectorAll(".site-nav > details.nav-dropdown"));
  if (!dropdowns.length) return;

  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("toggle", () => {
      if (!dropdown.open) return;
      dropdowns.forEach((otherDropdown) => {
        if (otherDropdown !== dropdown) otherDropdown.open = false;
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".nav-dropdown")) return;
    dropdowns.forEach((dropdown) => {
      dropdown.open = false;
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    dropdowns.forEach((dropdown) => {
      dropdown.open = false;
    });
  });
}

setupDropdownNavigation();

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = contactForm.querySelector(".form-note");
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const selectedService = String(new FormData(contactForm).get("service") || "");

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
      void trackRewardSchoolEvent("consultation_submit", {
        service: selectedService,
      });
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
