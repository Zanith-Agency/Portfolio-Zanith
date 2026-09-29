export function initStoryScroll() {
  const sections = Array.from(document.querySelectorAll(".story-block"));
  if (sections.length === 0) return;

  const menuItems = Array.from(document.querySelectorAll(".services-menu-item"));
  const menuEl = document.querySelector(".services-menu");
  const indicatorEl = document.querySelector(".scroll-indicator");
  const indicatorNumber = document.querySelector(".scroll-indicator-number");
  const header = document.getElementById("site-header");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setDark = (dark) => {
    menuEl?.classList.toggle("is-dark-bg", dark);
    indicatorEl?.classList.toggle("is-dark-bg", dark);
    header?.classList.toggle("is-dark-bg", dark);
  };

  const updateActive = (index) => {
    const menuIndex = Number(sections[index]?.dataset.skillMenuIndex ?? -1);
    if (menuIndex >= 0) {
      menuItems.forEach((el, i) => el.classList.toggle("is-active", i === menuIndex));
    }
    if (indicatorNumber) indicatorNumber.textContent = String(index + 1).padStart(2, "0");
    setDark(sections[index]?.dataset.dark === "true");
  };
  updateActive(0);

  // Apparition en fondu, une fois par section, quand elle entre dans l'écran
  if (reduced) {
    sections.forEach((s) => s.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    sections.forEach((s) => revealObserver.observe(s));
  }

  // Suit quelle section occupe la bande centrale de l'écran, pour mettre à
  // jour le menu, le numéro d'indicateur, et le contraste clair/sombre.
  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = sections.indexOf(entry.target);
          if (index !== -1) updateActive(index);
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  sections.forEach((s) => activeObserver.observe(s));

  const scrollToMenuIndex = (menuIndex) => {
    const target = sections.find((s) => Number(s.dataset.skillMenuIndex) === menuIndex);
    if (!target) return;
    if (window.__lenis) {
      window.__lenis.scrollTo(target, { duration: 1 });
    } else {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };
  menuItems.forEach((item, i) => item.addEventListener("click", () => scrollToMenuIndex(i)));
}