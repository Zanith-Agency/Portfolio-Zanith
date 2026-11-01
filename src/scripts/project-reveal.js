// Poignée de révélation des pages projets (voir ProjectReveal.astro).
//
// Deux positions à distinguer :
// - la FRONTIÈRE entre les deux univers, qui va du haut (0) au bas (H)
//   de la section : en bas, la vitrine occupe tout l'écran ; en haut,
//   ce sont les coulisses ;
// - la POIGNÉE, qui suit exactement le doigt ou la souris, mais doit
//   toujours rester entièrement visible et attrapable — jamais à
//   moitié sortie de l'écran en bas, jamais cachée sous le header en
//   haut.
//
// Sur toute la partie centrale de l'écran, frontière et poignée sont
// au même endroit, au pixel près. Ce n'est que dans les derniers
// centimètres en haut et en bas que la frontière va un peu plus vite
// que la poignée, pour pouvoir atteindre le bord pendant que la poignée
// s'arrête juste avant. Aucune animation automatique : la frontière
// reste exactement là où on la lâche.

const HANDLE_SIZE = 52; // px, doit correspondre au CSS
const BOTTOM_GAP = 24; // px entre la poignée et le bas de l'écran
const TOP_GAP = 20; // px entre le header et la poignée
const EDGE_ZONE = 140; // px de chaque côté où la frontière « rattrape » le bord
const KEY_STEP = 0.05; // 5 % de la hauteur par appui sur une flèche

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function initProjectReveal() {
  document.querySelectorAll("[data-project-reveal]").forEach(setupReveal);
}

function setupReveal(root) {
  const handle = root.querySelector("[data-reveal-handle]");
  if (!handle || root.dataset.revealReady) return;
  root.dataset.revealReady = "true";

  const header = document.getElementById("site-header");

  // Position de la frontière en proportion de la hauteur :
  // 1 = tout en bas (vitrine seule), 0 = tout en haut (coulisses seules).
  // On garde une proportion plutôt que des pixels pour que la
  // configuration survive à un redimensionnement de la fenêtre.
  let ratio = 1;
  let metrics = null;

  const measure = () => {
    const height = root.clientHeight;
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const top = headerHeight + TOP_GAP + HANDLE_SIZE / 2; // poignée au plus haut
    const bottom = height - BOTTOM_GAP - HANDLE_SIZE / 2; // poignée au plus bas
    const zone = Math.max(0, Math.min(EDGE_ZONE, (bottom - top) / 3));
    metrics = { height, top, bottom, zone };
  };

  // Position de la poignée → position de la frontière (en px)
  const handleToSplit = (y) => {
    const { height, top, bottom, zone } = metrics;
    const h = clamp(y, top, bottom);
    if (zone > 0 && h < top + zone) {
      // [top, top + zone] → [0, top + zone]
      return ((h - top) / zone) * (top + zone);
    }
    if (zone > 0 && h > bottom - zone) {
      // [bottom - zone, bottom] → [bottom - zone, height]
      return bottom - zone + ((h - (bottom - zone)) / zone) * (height - (bottom - zone));
    }
    return h;
  };

  // Position de la frontière (en px) → position de la poignée
  const splitToHandle = (split) => {
    const { height, top, bottom, zone } = metrics;
    const s = clamp(split, 0, height);
    if (zone > 0 && s < top + zone) {
      return top + (s / (top + zone)) * zone;
    }
    if (zone > 0 && s > bottom - zone) {
      return bottom - zone + ((s - (bottom - zone)) / (height - (bottom - zone))) * zone;
    }
    return clamp(s, top, bottom);
  };

  const render = () => {
    const split = ratio * metrics.height;
    root.style.setProperty("--split", `${split}px`);
    root.style.setProperty("--handle-y", `${splitToHandle(split)}px`);
    root.classList.toggle("is-at-bottom", ratio > 0.97);
    // Frontière dans la zone du header : les étiquettes s'y
    // superposeraient au logo et au menu, on les masque.
    root.classList.toggle("is-near-top", split < metrics.top);

    // Pour les lecteurs d'écran : pourcentage des coulisses révélé
    const revealed = Math.round((1 - ratio) * 100);
    handle.setAttribute("aria-valuenow", String(revealed));
    handle.setAttribute("aria-valuetext", `${revealed} % des coulisses visibles`);
  };

  measure();
  render();

  // --- Glissement (souris, doigt, stylet : mêmes événements) ---
  let dragging = false;
  let grabOffset = 0; // écart entre le point saisi et le centre de la poignée

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    measure();

    const rect = root.getBoundingClientRect();
    const handleY = splitToHandle(ratio * metrics.height);
    // On garde l'endroit exact où la poignée a été attrapée : elle ne
    // « saute » pas pour se centrer sous le curseur.
    grabOffset = event.clientY - rect.top - handleY;

    dragging = true;
    handle.setPointerCapture(event.pointerId);
    root.classList.add("is-dragging", "has-interacted");
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const rect = root.getBoundingClientRect();
    const handleY = event.clientY - rect.top - grabOffset;
    ratio = handleToSplit(handleY) / metrics.height;
    render();
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    root.classList.remove("is-dragging");
    // Pas de retour automatique : la frontière reste où on l'a lâchée.
  };

  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  // --- Clavier ---
  handle.addEventListener("keydown", (event) => {
    const moves = {
      ArrowUp: -KEY_STEP,
      ArrowRight: -KEY_STEP,
      ArrowDown: KEY_STEP,
      ArrowLeft: KEY_STEP,
      PageUp: -0.25,
      PageDown: 0.25,
    };
    if (event.key in moves) {
      ratio = clamp(ratio + moves[event.key], 0, 1);
    } else if (event.key === "Home") {
      ratio = 1; // valeur minimale du slider : rien de révélé
    } else if (event.key === "End") {
      ratio = 0; // valeur maximale : coulisses en plein écran
    } else {
      return;
    }
    event.preventDefault();
    root.classList.add("has-interacted");
    measure();
    render();
  });

  // --- Redimensionnement / rotation de l'écran ---
  window.addEventListener("resize", () => {
    measure();
    render();
  });
}