import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

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

  // Quelle section occupe la bande centrale de l'écran → menu / indicateur / contraste
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

  // Formation du dôme (cercle qui grandit) + apparition du contenu
  sections.forEach((section) => {
    const wrap = section.querySelector(".story-block-dome-wrap");
    const circle = section.querySelector(".story-block-dome-circle");
    const inner = section.querySelector(".story-block-inner");

    if (!wrap || !circle) {
      // Pas de dôme sur cette section (la toute première) — juste l'apparition du contenu au scroll
      if (inner && !section.classList.contains("story-block--first")) {
        ScrollTrigger.create({
          trigger: section,
          start: "top 85%",
          onEnter: () => inner.classList.add("is-visible"),
          once: true,
        });
      }
      return;
    }

    const getRMax = () => {
      const domeHeight = wrap.getBoundingClientRect().height;
      return Math.sqrt((window.innerWidth / 2) ** 2 + domeHeight ** 2) * 1.15;
    };

    if (reduced) {
      const r = getRMax();
      circle.style.width = `${r * 2}px`;
      circle.style.height = `${r * 2}px`;
      inner?.classList.add("is-visible");
      return;
    }

    let rMax = getRMax();
    window.addEventListener("resize", () => { rMax = getRMax(); });

    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "top 25%", // la formation du dôme s'étale sur ~3/4 de la hauteur d'écran
      scrub: 0.3,
      onUpdate: (self) => {
        const r = rMax * self.progress;
        circle.style.width = `${r * 2}px`;
        circle.style.height = `${r * 2}px`;
        if (self.progress > 0.05) inner?.classList.add("is-visible");
      },
    });
  });

  window.addEventListener("resize", () => ScrollTrigger.refresh());
}