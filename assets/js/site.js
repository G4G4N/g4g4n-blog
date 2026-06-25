const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealElements = document.querySelectorAll(".reveal");
const sectionLinks = document.querySelectorAll(".story-link");
const sections = document.querySelectorAll(".section-anchor");
const progressBar = document.getElementById("story-progress-bar");
const readingBar = document.getElementById("reading-bar");
const themeToggle = document.getElementById("theme-toggle");
const footerQuote = document.getElementById("daily-footer-quote");
const root = document.documentElement;

const footerQuotes = [
  "The sea is wide. Good writing should be wider.",
  "A calm map beats a loud captain every time.",
  "Chase freedom, not filler.",
  "Every good crew runs on trust, timing, and a little chaos.",
  "Some stories are treasure. Some are just driftwood.",
  "The horizon is useful because it makes you move.",
  "A good logbook saves future sailors a stupid mistake.",
  "Not every storm is destiny. Some are just bad config.",
  "A crew survives on judgment long before it survives on speed.",
  "The best adventures leave you smarter than they found you.",
  "If the map is honest, the voyage gets easier.",
  "Every ship needs a north star and fewer meetings."
];

const applyThemeLabel = () => {
  if (!themeToggle) {
    return;
  }
  const isDark = root.dataset.theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
};

if (themeToggle) {
  applyThemeLabel();
  themeToggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("g4g4n-theme", root.dataset.theme);
    applyThemeLabel();
  });
}

if (footerQuote) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - yearStart) / 86400000);
  footerQuote.textContent = footerQuotes[dayOfYear % footerQuotes.length];
}

// --- Scroll reveal (progressive enhancement) ---------------------------------
// Content is fully visible by default (see CSS: only `html.js .reveal` is
// hidden). We only ever ADD `is-visible`, and we guarantee every element gets
// revealed even if the observer never fires, so content can never get stuck
// hidden the way it did when a tall section never crossed the threshold.
const revealAll = () => revealElements.forEach(el => el.classList.add("is-visible"));

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealAll();
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    // Small threshold + generous bottom margin so even very tall elements
    // (and elements already on screen at load) reliably trigger.
    { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }
  );

  revealElements.forEach(element => revealObserver.observe(element));

  // Failsafe: nothing should remain hidden once the page has settled.
  window.addEventListener("load", () => {
    setTimeout(revealAll, 1400);
  });
}

// --- Section nav highlighting ------------------------------------------------
const setActiveSection = activeId => {
  sectionLinks.forEach(link => {
    link.classList.toggle("is-active", link.dataset.target === activeId);
  });
};

if (sections.length > 0 && sectionLinks.length > 0 && "IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    entries => {
      const visibleEntry = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry) {
        setActiveSection(visibleEntry.target.dataset.section);
      }
    },
    { threshold: [0.2, 0.5, 0.75], rootMargin: "-12% 0px -45% 0px" }
  );

  sections.forEach(section => sectionObserver.observe(section));
}

// --- Scroll progress (vertical nav rail + top reading bar) -------------------
const updateScrollUI = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const percent = maxScroll <= 0 ? 0 : Math.min(100, Math.round((window.scrollY / maxScroll) * 100));

  if (progressBar) {
    progressBar.style.height = `${percent}%`;
  }
  if (readingBar) {
    readingBar.style.transform = `scaleX(${percent / 100})`;
  }
};

updateScrollUI();
window.addEventListener("scroll", updateScrollUI, { passive: true });
window.addEventListener("resize", updateScrollUI, { passive: true });
