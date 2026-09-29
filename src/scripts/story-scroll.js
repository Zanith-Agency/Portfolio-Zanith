import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export function initStoryScroll() {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  const sections = Array.from(document.querySelectorAll(".story-section"));
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

  const updateActive = (sectionIndex) => {
    const menuIndex = Number(sections[sectionIndex]?.dataset.skillMenuIndex ?? -1);
    menuItems.forEach((el, i) => el.classList.toggle("is-active", i === menuIndex));
    if (indicatorNumber) indicatorNumber.textContent = String(sectionIndex + 1).padStart(2, "0");
  };
  updateActive(0);
  setDark(sections[0]?.dataset.dark === "true");

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

  if (reduced) return;

  const getMaxRadius = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return Math.sqrt((w / 2) ** 2 + h ** 2) * 1.05;
  };

  sections.forEach((section, i) => {
    const panel = section.querySelector(".story-panel");

    if (i > 0) gsap.set(panel, { clipPath: "circle(0px at 50% 100%)" });

    let crossedDark = false;

    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      scrub: 0.4,
      onUpdate: (self) => {
        if (i === 0) return;
        const revealProgress = Math.min(1, self.progress / 0.5);
        const r = getMaxRadius() * revealProgress;
        panel.style.clipPath = `circle(${r}px at 50% 100%)`;

        const dark = section.dataset.dark === "true";
        if (revealProgress >= 0.5 && !crossedDark) {
          crossedDark = true;
          setDark(dark);
        } else if (revealProgress < 0.5 && crossedDark) {
          crossedDark = false;
          const prevDark = sections[i - 1]?.dataset.dark === "true";
          setDark(prevDark);
        }
      },
      onEnter: () => updateActive(i),
      onEnterBack: () => updateActive(i),
      onLeaveBack: () => updateActive(Math.max(0, i - 1)),
    });
  });

  window.addEventListener("resize", () => ScrollTrigger.refresh());
}