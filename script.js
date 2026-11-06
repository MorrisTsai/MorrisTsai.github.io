const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form");
const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-C2EGD547FP";
let googleAnalyticsLoaded = false;

function renderSharedSiteNavigation() {
  if (!siteNav) return;
  const inSchoolDirectory = /\/schools\//i.test(window.location.pathname.replace(/\\/g, "/"));
  const prefix = inSchoolDirectory ? "../" : "";
  const href = (path) => `${prefix}${path}`;
  siteNav.innerHTML = `
    <a href="${href("pte.html")}">PTE 培训</a>
    <details class="nav-dropdown"><summary>中学留学</summary><div>
      <a href="${href("advisor-product-flow.html")}">私校申请与升学规划</a>
      <a href="${href("aeas.html")}">升学衔接课程</a>
      <a href="${href("under-18-welfare-guide.html")}">住宿监护与入学落地</a>
      <a class="nav-advisor-link" href="${href("advisor-schools.html")}"><span>学校资料库</span></a>
    </div></details>
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

function ensureGoogleTagQueue() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
}

function loadGoogleAnalytics() {
  if (googleAnalyticsLoaded || location.pathname === "/advisor-product-flow.html") return;
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
  if (googleAnalyticsLoaded) return;
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
    if (location.pathname === "/advisor-product-flow.html") return;
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

scheduleGoogleAnalytics();

function normalizeAnalyticsMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(metadata)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 24)
    .map(([key, value]) => [String(key).slice(0, 48), typeof value === "string" ? value.slice(0, 160) : value]));
}

const schoolMatch = window.location.pathname.match(/\/schools\/([^/]+)\.html$/i);
if (schoolMatch) {
  sendGoogleAnalyticsEvent("school_profile_view", { school: decodeURIComponent(schoolMatch[1]) });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest?.("a, button, .wechat-card");
  if (!target) return;
  const href = target.getAttribute?.("href") || "";
  if (target.closest?.(".wechat-card")) {
    sendGoogleAnalyticsEvent("wechat_click");
    return;
  }
  if (href.includes("#contact") || target.classList?.contains("nav-consult-link")) {
    sendGoogleAnalyticsEvent("consultation_click", { label: target.textContent?.trim() || "" });
    return;
  }
});

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
      sendGoogleAnalyticsEvent("consultation_submit", {
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
