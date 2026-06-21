const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form");

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
