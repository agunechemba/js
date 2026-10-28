/* ============================================================
   JAVASCRIPT NOTES — PAGE-TURNING ENGINE
   Based on the template engine. Two small extensions:
     1. data-nav button support (prev / next / first)
     2. part-page and back-cover indicator labels
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Reference ---------- */
  const pages      = Array.from(document.querySelectorAll(".book-page"));
  const STORAGE_KEY = "javascript-notes-storybook:last-page";

  let currentIndex = 0;
  let isReady      = false;

  /* ---------- Build reading progress + indicator + hint ---------- */
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.innerHTML = '<div class="reading-progress-fill"></div>';
  document.body.appendChild(progress);

  const indicator = document.createElement("div");
  indicator.className = "page-indicator";
  indicator.setAttribute("aria-live", "polite");
  document.body.appendChild(indicator);

  const hint = document.createElement("div");
  hint.className = "page-hint";
  hint.textContent = "← → to turn pages";
  document.body.appendChild(hint);

  /* ---------- Helpers ---------- */
  function pageById(id) {
    if (!id) return null;
    const el = document.getElementById(id);
    return el && el.classList.contains("book-page") ? el : null;
  }

  function updateChrome() {
    const total   = pages.length;
    const percent = ((currentIndex + 1) / total) * 100;
    const fill    = progress.querySelector(".reading-progress-fill");
    fill.style.width = percent + "%";

    const page = pages[currentIndex];
    let label;
    if (page.classList.contains("part-page")) {
      const pn = page.querySelector(".part-number");
      label = pn ? pn.textContent.trim() : "Part";
    } else if (page.classList.contains("cover-page")) {
      label = (page.id === "back") ? "The End" : "Cover";
    } else if (page.id === "glossary") {
      label = "Glossary";
    } else {
      const heading = page.querySelector("h2");
      const match   = heading && heading.textContent.match(/Chapter\s+\d+/i);
      label         = match ? match[0] : "Page";
    }
    indicator.textContent = label + " · " + (currentIndex + 1) + "/" + total;

    if (currentIndex === 0 || currentIndex === total - 1) {
      hint.classList.add("hidden");
    } else {
      hint.classList.remove("hidden");
    }
  }

  /* ---------- Core: show a page ---------- */
  function showPage(idOrEl, opts = {}) {
    const { updateHistory = true, smooth = true } = opts;
    const target = typeof idOrEl === "string" ? pageById(idOrEl) : idOrEl;
    if (!target) return;

    const newIndex = pages.indexOf(target);
    if (newIndex === -1) return;
    if (newIndex === currentIndex && target.classList.contains("active")) return;

    const direction = newIndex > currentIndex ? 1 : -1;

    pages.forEach((p) => p.classList.remove("active", "page-enter"));

    target.classList.add("active");
    void target.offsetWidth;
    target.classList.add("page-enter");

    currentIndex = newIndex;
    updateChrome();

    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });

    try { localStorage.setItem(STORAGE_KEY, target.id); } catch (_) {}

    if (updateHistory) {
      const newHash = "#" + target.id;
      if (location.hash !== newHash) {
        history.pushState({ page: target.id }, "", newHash);
      }
    }

    target.style.setProperty("--page-tilt", direction > 0 ? "-0.4deg" : "0.4deg");
  }

  /* ---------- Intercept data-nav buttons ---------- */
  document.addEventListener("click", function (e) {
    const navBtn = e.target.closest("[data-nav]");
    if (navBtn) {
      e.preventDefault();
      const direction = navBtn.getAttribute("data-nav");
      if (direction === "prev" && currentIndex > 0) {
        showPage(pages[currentIndex - 1]);
      } else if (direction === "next" && currentIndex < pages.length - 1) {
        showPage(pages[currentIndex + 1]);
      } else if (direction === "first") {
        showPage(pages[0]);
      }
      return;
    }

    /* ---------- Intercept internal anchor links (TOC) ---------- */
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    if (!id) return;
    const target = pageById(id);
    if (!target) return;

    e.preventDefault();
    showPage(target);
  });

  /* ---------- Keyboard navigation ---------- */
  document.addEventListener("keydown", function (e) {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

    if (e.key === "ArrowRight" || e.key === "PageDown") {
      if (currentIndex < pages.length - 1) {
        e.preventDefault();
        showPage(pages[currentIndex + 1]);
      }
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      if (currentIndex > 0) {
        e.preventDefault();
        showPage(pages[currentIndex - 1]);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      showPage(pages[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      showPage(pages[pages.length - 1]);
    }
  });

  /* ---------- Browser back/forward ---------- */
  window.addEventListener("popstate", function () {
    const id = location.hash.slice(1);
    if (!id) {
      showPage(pages[0], { updateHistory: false });
      return;
    }
    const target = pageById(id);
    if (target) showPage(target, { updateHistory: false });
  });

  /* ---------- Init ---------- */
  function init() {
    document.body.classList.add("js-ready");

    let startId = null;

    if (location.hash) {
      const t = pageById(location.hash.slice(1));
      if (t) startId = t.id;
    }

    if (!startId) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && pageById(saved)) startId = saved;
      } catch (_) {}
    }

    if (!startId && pages.length) startId = pages[0].id;

    if (startId) {
      const target = pageById(startId);
      if (target) {
        pages.forEach((p) => p.classList.remove("active", "page-enter"));
        target.classList.add("active");
        currentIndex = pages.indexOf(target);
        updateChrome();
        if (location.hash.slice(1) !== target.id) {
          history.replaceState({ page: target.id }, "", "#" + target.id);
        }
      }
    }

    isReady = true;

    setTimeout(() => {
      if (currentIndex > 0) hint.classList.remove("hidden");
    }, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();