// Transitions diagonales entre les pages.
//
// Sortie : un élément se referme en diagonale — le coin haut-droit et
// le coin bas-gauche se rejoignent sur la diagonale centrale (c'est la
// fermeture du projet cliqué sur l'accueil, et celle du bloc « projet
// suivant »).
// Arrivée : la page suivante fait exactement l'inverse — elle part de
// cette ligne diagonale et s'ouvre jusqu'aux coins.
//
// Les deux pages se passent le relais via sessionStorage : la page qui
// part dépose un marqueur, la page qui arrive le consomme. Sans
// marqueur (lien direct, rechargement), la page s'affiche normalement.

import { gsap } from "gsap";

const STORAGE_KEY = "zanith:transition";
const EXIT_DURATION = 0.75;
const ARRIVAL_DURATION = 0.9;

// Zone visible { -t ≤ x - y ≤ t } en % de l'élément :
//   progress 0 → élément entier, progress 1 → réduit à la diagonale
//   centrale (haut-gauche → bas-droite). Toujours 6 points, donc
//   l'interpolation reste parfaitement continue.
export function diagonalClipPath(progress) {
  const t = 100 * (1 - progress);
  const points = [
    [0, 0],
    [t, 0],
    [100, 100 - t],
    [100, 100],
    [100 - t, 100],
    [0, t],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// À appeler juste avant de naviguer, après une sortie diagonale.
export function markDiagonalTransition() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "diagonal");
  } catch {
    // Navigation privée stricte : pas de transition d'arrivée, pas grave.
  }
}

// Ferme un élément en diagonale. Résout la promesse à la fin.
export function playDiagonalExit(element, duration = EXIT_DURATION) {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) return resolve();
    const state = { p: 0 };
    gsap.to(state, {
      p: 1,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {
        element.style.clipPath = diagonalClipPath(state.p);
      },
      onComplete: resolve,
    });
  });
}

// Arrivée sur une page : si la page précédente a laissé le marqueur,
// l'élément s'ouvre depuis la diagonale centrale. La classe
// html.is-arriving (posée par un petit script en tête de page, avant
// tout affichage) le garde fermé en attendant, sans flash.
export async function playDiagonalArrival(element) {
  const root = document.documentElement;
  if (!root.classList.contains("is-arriving") || !element) {
    root.classList.remove("is-arriving");
    return;
  }

  // On attend que l'image principale soit prête (au plus 1,2 s) pour
  // ne pas ouvrir sur un écran vide.
  const hero = element.querySelector('img[fetchpriority="high"]');
  if (hero && !hero.complete) {
    await Promise.race([
      hero.decode().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  }

  const finish = () => {
    element.style.clipPath = "";
    root.classList.remove("is-arriving");
  };

  if (prefersReducedMotion()) return finish();

  const state = { p: 1 };
  element.style.clipPath = diagonalClipPath(1);
  gsap.to(state, {
    p: 0,
    duration: ARRIVAL_DURATION,
    ease: "power3.inOut",
    onUpdate: () => {
      element.style.clipPath = diagonalClipPath(state.p);
    },
    onComplete: finish,
  });
}

// Liens qui partent avec une sortie diagonale (ex. bloc « projet
// suivant ») : data-diagonal-link sur le lien, l'élément qui se referme
// est le lien lui-même.
export function initDiagonalLinks() {
  document.querySelectorAll("[data-diagonal-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      // Ctrl/Cmd-clic, Maj-clic… : nouvel onglet, sans animation.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      if (link.classList.contains("is-leaving")) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      link.classList.add("is-leaving");
      playDiagonalExit(link).then(() => {
        markDiagonalTransition();
        window.location.href = link.href;
      });
    });
  });

  // Retour arrière : le navigateur peut restaurer la page telle qu'on
  // l'a quittée (bloc refermé). On la remet dans son état normal.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.querySelectorAll("[data-diagonal-link].is-leaving").forEach((link) => {
      link.classList.remove("is-leaving");
      link.style.clipPath = "";
    });
  });
}