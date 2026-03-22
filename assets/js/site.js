const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealElements = document.querySelectorAll(".reveal");
const sectionLinks = document.querySelectorAll(".story-link");
const sections = document.querySelectorAll(".section-anchor");
const progressBar = document.getElementById("story-progress-bar");
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

if (!prefersReducedMotion) {
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealElements.forEach(element => revealObserver.observe(element));
} else {
  revealElements.forEach(element => element.classList.add("is-visible"));
}

const setActiveSection = activeId => {
  sectionLinks.forEach(link => {
    link.classList.toggle("is-active", link.dataset.target === activeId);
  });
};

if (sections.length > 0 && sectionLinks.length > 0) {
  const sectionObserver = new IntersectionObserver(
    entries => {
      const visibleEntry = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry) {
        setActiveSection(visibleEntry.target.dataset.section);
      }
    },
    { threshold: [0.3, 0.55, 0.8], rootMargin: "-10% 0px -25% 0px" }
  );

  sections.forEach(section => sectionObserver.observe(section));
}

const updateScrollUI = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const percent = maxScroll <= 0 ? 0 : Math.round((window.scrollY / maxScroll) * 100);

  if (progressBar) {
    progressBar.style.height = `${percent}%`;
  }
};

updateScrollUI();
window.addEventListener("scroll", updateScrollUI, { passive: true });
