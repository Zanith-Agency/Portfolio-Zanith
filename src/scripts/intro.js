import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(SplitText);

const SESSION_KEY = "zanith-intro-played";

export function initIntro() {
  const header = document.getElementById("site-header");
  if (!header || !header.classList.contains("is-intro")) return;

  const items = header.querySelectorAll("[data-intro-item]"); // ne contient PAS #page-label, exprès
  const pageLabel = document.getElementById("page-label");
  const introExtraMenuItem = document.getElementById("intro-extra-menu-item");
  const gear = document.getElementById("intro-gear");
  const homeContent = document.querySelector("[data-reveal-after-intro]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const alreadyPlayed = sessionStorage.getItem(SESSION_KEY);

  const revealInstantly = () => {
    header.classList.remove("is-intro");
    gsap.set(header, { clearProps: "height,backgroundColor" });
    if (gear) gear.remove();
    if (introExtraMenuItem) introExtraMenuItem.remove();
    if (pageLabel) gsap.set(pageLabel, { opacity: 1 });
    if (homeContent) gsap.set(homeContent, { yPercent: 0 });
  };

  if (alreadyPlayed || reduced) {
    revealInstantly();
    return;
  }

  sessionStorage.setItem(SESSION_KEY, "1");

  const split = new SplitText(items, { type: "chars" });
  gsap.set(split.chars, { opacity: 0, y: 10 });
  if (pageLabel) gsap.set(pageLabel, { opacity: 0 }); // reste caché pendant tout le début
  if (homeContent) gsap.set(homeContent, { yPercent: 100 });
  if (gear) gsap.set(gear, { opacity: 0, scale: 0.8 });

  const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });

  tl.to(split.chars, { opacity: 1, y: 0, duration: 0.7, stagger: 0.03, ease: "power2.out" })
    .add(() => split.revert())
    .to(gear, { opacity: 1, scale: 1, duration: 0.4 }, "-=0.2")
    .to({}, { duration: 3.2 })
    .to(gear, { opacity: 0, scale: 0.8, duration: 0.4 })
    .to(header, { height: "80px", backgroundColor: "transparent", duration: 1.1 })
    .to(homeContent, { yPercent: 0, duration: 1.1 }, "<")
    // "Travail" quitte le menu pendant que le label central apparaît,
    // synchronisé avec l'arrivée de la home.
    .to(introExtraMenuItem, { opacity: 0, duration: 0.5 }, "<")
    .to(pageLabel, { opacity: 1, duration: 0.6 }, "<+0.3")
    .add(() => {
      header.classList.remove("is-intro");
      gsap.set(header, { clearProps: "height,backgroundColor" });
      introExtraMenuItem?.remove();
    });
}