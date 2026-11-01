// Navigation « Nadir → Zénith » entre projets (ProjectAscent.astro).
//
// L'étage regardé reste au centre de la fenêtre ; monter ou descendre
// fait glisser toute la pile, déplace le curseur de la jauge et fait
// défiler l'altitude. Cliquer un étage voisin le fait venir au centre ;
// cliquer l'étage du centre (ou le bouton « Découvrir ») ouvre le projet
// avec la sortie diagonale.

import { gsap } from "gsap";
import { playDiagonalExit, markDiagonalTransition } from "./page-transition";

const formatAltitude = (meters) => `${Math.round(meters).toLocaleString("fr-FR")} m`;

export function initProjectAscent() {
  const root = document.querySelector("[data-ascent]");
  if (!root || root.dataset.ascentReady) return;
  root.dataset.ascentReady = "true";

  const shaft = root.querySelector("[data-ascent-shaft]");
  const list = root.querySelector("[data-ascent-floors]");
  const floors = Array.from(root.querySelectorAll("[data-ascent-floor]"));
  const cursor = root.querySelector("[data-ascent-cursor]");
  const altitudeEl = root.querySelector("[data-ascent-altitude]");
  const openLink = root.querySelector("[data-ascent-open]");
  const openLabel = root.querySelector("[data-ascent-open-label]");
  const status = root.querySelector("[data-ascent-status]");
  const upButton = root.querySelector('[data-ascent-step="1"]');
  const downButton = root.querySelector('[data-ascent-step="-1"]');
  if (!shaft || !list || floors.length < 2) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = floors.length;
  const current = Number(root.dataset.current);
  let focus = Number(root.dataset.initial);
  let leaving = false;
  const shown = { altitude: Number(floors[focus].dataset.altitude) };

  root.classList.add("is-ready");

  // Centre l'étage regardé dans la fenêtre
  const layout = (animate) => {
    const floor = floors[focus];
    const offset = floor.offsetTop + floor.offsetHeight / 2;
    const y = shaft.clientHeight / 2 - offset;
    if (!animate) list.style.transition = "none";
    list.style.transform = `translateY(${y}px)`;
    if (!animate) {
      list.getBoundingClientRect(); // applique la position sans animation
      list.style.transition = "";
    }
  };

  const setFocus = (index, animate = true) => {
    focus = Math.max(0, Math.min(count - 1, index));
    const floor = floors[focus];
    const target = Number(floor.dataset.altitude);

    floors.forEach((f, k) => {
      f.classList.toggle("is-focus", k === focus);
      f.classList.toggle("is-near", Math.abs(k - focus) === 1);
    });
    layout(animate);

    cursor?.style.setProperty("--pos", String(focus / (count - 1)));

    gsap.killTweensOf(shown);
    gsap.to(shown, {
      altitude: target,
      duration: animate && !reduced ? 0.9 : 0,
      ease: "power2.inOut",
      onUpdate: () => {
        altitudeEl.textContent = formatAltitude(shown.altitude);
      },
    });

    upButton.disabled = focus >= count - 1;
    downButton.disabled = focus <= 0;

    const isCurrent = focus === current;
    openLink.href = floor.querySelector("a").href;
    openLabel.textContent = isCurrent ? "Vous êtes ici" : `Découvrir ${floor.dataset.title}`;
    openLink.classList.toggle("is-disabled", isCurrent);
    openLink.setAttribute("aria-disabled", String(isCurrent));
    if (animate && status) {
      status.textContent = `${floor.dataset.title}, altitude ${formatAltitude(target)}`;
    }
  };

  // Ouvre un projet : la section se referme en diagonale, puis la page
  // du projet s'ouvre avec le mouvement inverse.
  const leave = (href) => {
    if (leaving) return;
    leaving = true;
    playDiagonalExit(root).then(() => {
      markDiagonalTransition();
      window.location.href = href;
    });
  };

  const isModifiedClick = (event) =>
    event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;

  floors.forEach((floor, index) => {
    const link = floor.querySelector("a");
    link.addEventListener("click", (event) => {
      if (isModifiedClick(event)) return;
      event.preventDefault();
      if (index !== focus) {
        setFocus(index); // un étage voisin vient d'abord au centre
      } else if (index !== current) {
        leave(link.href);
      }
    });
    // Au clavier (Tab), l'étage qui reçoit le focus vient au centre
    link.addEventListener("focus", () => {
      if (link.matches(":focus-visible") && index !== focus) setFocus(index);
    });
  });

  upButton.addEventListener("click", () => setFocus(focus + 1));
  downButton.addEventListener("click", () => setFocus(focus - 1));

  openLink.addEventListener("click", (event) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    if (focus !== current) leave(openLink.href);
  });

  // Filet de sécurité pour les navigateurs sans overflow: clip : si la
  // fenêtre a défilé d'elle-même, on la remet en place.
  shaft.addEventListener("scroll", () => {
    if (shaft.scrollTop !== 0) shaft.scrollTop = 0;
  });

  // Positionnement initial, puis à chaque redimensionnement
  setFocus(focus, false);
  window.addEventListener("resize", () => layout(false));

  // Retour arrière : la page peut être restaurée refermée
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    leaving = false;
    root.style.clipPath = "";
  });
}