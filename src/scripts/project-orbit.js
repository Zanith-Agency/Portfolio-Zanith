// Cercle de projets de la page d'accueil.
//
// Position d'un projet sur le cercle :
//
//   angle(item) = angle - i * step + item.extra
//
// - `angle` est l'angle de la roue. Le projet 0 est en tête, chaque
//   projet suivant le suit à un cran (`step`) d'écart.
// - `extra` est un décalage temporaire, utilisé seulement à la
//   fermeture pour amener un projet jusqu'à celui qu'on a cliqué.
//
// Trois phases :
//
// 1. Ouverture (remplissage) — la roue tourne vite. Le projet i
//    apparaît quand sa place passe à 12 h, c'est-à-dire quand
//    `angle - i * step` vaut -90°. Tous entrent donc au même point et
//    suivent le précédent avec un espacement régulier.
// 2. Ralentissement puis rotation continue — une fois le dernier
//    projet entré, la roue décélère en douceur jusqu'à la vitesse
//    d'origine. Même formule, aucune coupure : la vitesse est
//    continue du début à la fin.
// 3. Fermeture — au clic, la roue se fige. Les autres projets avancent
//    jusqu'au projet cliqué, passent derrière lui et s'effacent un à
//    un ; il se referme ensuite en diagonale, puis on navigue.
//
// Mise en avant (si la page la prévoit) : une zone fixe à 12 h, marquée
// par un contour dessiné à la main qui tremble légèrement. Le projet
// qui passe dans ce contour devient le projet actif : sa fiche s'affiche
// en haut à gauche et ses deux points forts sous la roue. Il le reste
// jusqu'à ce que le projet suivant entre à son tour dans le contour.

import { gsap } from "gsap";
import { diagonalClipPath, markDiagonalTransition } from "./page-transition";
import { createSketchFrame } from "./sketch-frame";
import { createSpotlight } from "./orbit-spotlight";

const START_ANGLE = -90; // 12 heures : point d'entrée de tous les projets
const CRUISE_SPEED = 5; // degrés/s — rotation continue (inchangée)

// Ouverture
const REVEAL_INTERVAL = 0.6; // s entre l'entrée de deux projets (le temps
// d'afficher brièvement la fiche de chacun à son arrivée)
const MAX_FILL_SPEED = 200; // degrés/s, plafond pendant le remplissage
const DECEL_DURATION = 1.6; // s pour revenir à la vitesse de croisière
const REVEAL_FADE = 0.3; // s de fondu à l'entrée

// Fermeture
const CLOSE_SPEED = 150; // degrés/s (moyenne) pour rejoindre le projet cliqué
const CLOSE_MIN_DURATION = 0.25; // s, plancher pour un projet déjà tout proche
const ABSORB_DURATION = 0.25; // s pour disparaître derrière le projet cliqué
const WIPE_DURATION = 0.75; // s pour la fermeture diagonale finale

// Ramène un angle dans [0, 360) : écart « vers l'avant », dans le sens
// de rotation de la roue.
const forwardGap = (deg) => ((deg % 360) + 360) % 360;

export function initProjectOrbit() {
  const track = document.querySelector(".project-orbit");
  if (!track) return;

  const anchors = Array.from(track.querySelectorAll(".project-orbit-item"));
  if (anchors.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = 360 / anchors.length;

  // Vitesse de remplissage : la roue avance d'un cran entre deux
  // entrées, pour que chaque projet arrive à 12 h pile à son tour.
  const fillSpeed = Math.min(MAX_FILL_SPEED, step / REVEAL_INTERVAL);

  const items = anchors.map((el, i) => ({
    el,
    inner: el.querySelector(".project-orbit-item-inner"),
    i,
    revealed: false,
    closed: false,
    extra: 0,
    scale: 1,
    opacity: 0,
  }));

  // Rayons horizontal et vertical de l'orbite. Sur ordinateur, le
  // cercle est carré : les deux sont égaux. Sur téléphone, la zone est
  // plus haute que large (voir index.astro) : l'orbite devient un ovale
  // vertical qui profite de la hauteur de l'écran, au lieu d'un petit
  // cercle limité par la largeur où les projets se chevauchent.
  let radiusX = 0;
  let radiusY = 0;

  // Mise en avant (facultative : seulement si la page contient la zone)
  const stage = track.closest("[data-work]");
  const spotlight = stage ? createSpotlight(stage) : null;
  const frameEl = track.querySelector("[data-orbit-frame]");
  const sketch = frameEl ? createSketchFrame(frameEl.querySelector("svg")) : null;
  let zoneHalfWidth = 0; // demi-largeur de la zone des 12 h (px)
  let activeIndex = -1;
  let angle = START_ANGLE;
  let phase = "fill"; // fill → decel → cruise → closing
  let decelElapsed = 0;
  let paused = false;

  const computeRadius = () => {
    // offsetWidth/offsetHeight : taille réelle, sans l'effet des
    // transform (déplacement de l'intro, zoom des projets).
    const width = track.offsetWidth;
    const height = track.offsetHeight;
    const itemSize = anchors[0].offsetWidth;
    radiusX = Math.max(0, width / 2 - itemSize / 2);
    radiusY = Math.max(0, height / 2 - itemSize / 2);

    // Le contour est centré sur la position des 12 h, un peu plus grand
    // que la vignette d'un projet.
    if (frameEl) {
      const thumb = anchors[0].querySelector(".project-orbit-item-inner");
      const thumbHeight = thumb ? thumb.offsetHeight : itemSize * 0.75;
      const pad = Math.max(10, itemSize * 0.1);
      const frameWidth = itemSize + pad * 2;
      const frameHeight = thumbHeight + pad * 2;
      frameEl.style.width = `${frameWidth}px`;
      frameEl.style.height = `${frameHeight}px`;
      frameEl.style.left = `${width / 2 - frameWidth / 2}px`;
      frameEl.style.top = `${height / 2 - radiusY - frameHeight / 2}px`;
      sketch?.resize(frameWidth, frameHeight);
      zoneHalfWidth = frameWidth / 2;
    }
  };

  // Projet actif = celui dont le centre est dans le contour des 12 h. Il
  // reste actif après en être sorti, jusqu'à l'entrée du suivant.
  const updateSpotlight = () => {
    if (!spotlight || phase === "closing") return;
    let best = null;
    let bestDelta = Infinity;
    items.forEach((item) => {
      if (!item.revealed || item.closed) return;
      // Écart angulaire avec 12 h, dans [-180, 180)
      const delta = ((((angle - item.i * step + item.extra - START_ANGLE) % 360) + 540) % 360) - 180;
      if (Math.abs(delta) >= 90) return; // moitié basse de la roue
      const offsetX = Math.abs(Math.sin((delta * Math.PI) / 180)) * radiusX;
      if (offsetX < zoneHalfWidth && Math.abs(delta) < bestDelta) {
        best = item;
        bestDelta = Math.abs(delta);
      }
    });
    frameEl?.classList.toggle("is-occupied", Boolean(best));
    if (best && best.i !== activeIndex) {
      activeIndex = best.i;
      spotlight.setActive(best.i);
    }
  };

  const render = () => {
    items.forEach((item) => {
      if (!item.revealed || item.closed) return;
      const a = ((angle - item.i * step + item.extra) * Math.PI) / 180;
      const x = Math.cos(a) * radiusX;
      const y = Math.sin(a) * radiusY;
      item.el.style.transform =
        `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${item.scale})`;
      item.el.style.opacity = String(item.opacity);
    });
  };

  computeRadius();

  window.addEventListener("resize", () => {
    computeRadius();
    render();
  });

  // Mouvement réduit : pas d'ouverture, pas de rotation, pas de
  // fermeture — le cercle s'affiche complet et les liens naviguent
  // normalement.
  if (reduced) {
    items.forEach((item) => {
      item.revealed = true;
      item.opacity = 1;
      item.el.classList.add("is-revealed");
    });
    render();
    updateSpotlight();
    return;
  }

  // --- Ouverture ---
  const reveal = (item) => {
    item.revealed = true;
    item.el.classList.add("is-revealed");
    item.scale = 0.85;
    gsap.to(item, { opacity: 1, scale: 1, duration: REVEAL_FADE, ease: "power1.out" });
  };

  // Le projet i entre quand sa place passe à 12 h :
  // angle - i * step >= START_ANGLE.
  const revealDue = () => {
    items.forEach((item) => {
      if (!item.revealed && angle - item.i * step >= START_ANGLE - 0.001) reveal(item);
    });
  };

  // --- Fermeture ---
  const diagonalClose = (item) =>
    new Promise((resolve) => {
      const wipe = { p: 0 };
      gsap.to(wipe, {
        p: 1,
        duration: WIPE_DURATION,
        ease: "power2.inOut",
        onUpdate: () => {
          item.inner.style.clipPath = diagonalClipPath(wipe.p);
        },
        onComplete: resolve,
      });
    });

  const startClosing = (selected, href) => {
    if (phase === "closing") return;
    phase = "closing"; // la roue se fige : le projet cliqué devient le point fixe

    // Clic pendant l'ouverture : on termine net les fondus en cours
    // et on écarte les projets pas encore entrés.
    gsap.killTweensOf(items);
    items.forEach((item) => {
      if (!item.revealed) {
        item.closed = true;
        item.el.style.display = "none";
        return;
      }
      item.opacity = 1;
      item.scale = 1;
    });
    render();

    selected.el.style.zIndex = "10";
    selected.el.classList.add("is-selected");
    track.classList.add("is-closing");
    spotlight?.hide();
    sketch?.stop();

    const finish = () => {
      diagonalClose(selected).then(() => {
        // La page projet s'ouvrira avec le mouvement inverse
        markDiagonalTransition();
        window.location.href = href;
      });
    };

    const others = items.filter((item) => item !== selected && !item.closed);
    if (others.length === 0) {
      finish();
      return;
    }

    let pending = others.length;

    others.forEach((item) => {
      item.el.style.zIndex = "1";

      // Chemin à parcourir vers l'avant jusqu'au projet cliqué. Le
      // projet juste derrière lui a le plus court trajet et arrive en
      // premier, puis le suivant, etc. : la roulette se referme dans
      // l'ordre, sans qu'aucun projet n'en double un autre.
      const gap = forwardGap((item.i - selected.i) * step);

      gsap.to(item, {
        extra: gap,
        duration: Math.max(CLOSE_MIN_DURATION, gap / CLOSE_SPEED),
        ease: "sine.in",
        onComplete: () => {
          // Arrivé sur le projet cliqué : il passe derrière et s'efface.
          gsap.to(item, {
            scale: 0.6,
            opacity: 0,
            duration: ABSORB_DURATION,
            ease: "power1.in",
            onComplete: () => {
              item.closed = true;
              item.el.style.display = "none";
              pending -= 1;
              if (pending === 0) finish();
            },
          });
        },
      });
    });
  };

  // Retour arrière depuis la page projet : le navigateur peut restaurer
  // l'accueil tel qu'on l'a quitté (cercle vide, image refermée). On le
  // recharge pour retrouver la roulette complète.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && phase === "closing") window.location.reload();
  });

  // --- Interactions ---
  let hoveredCount = 0;
  const setHover = (delta) => {
    hoveredCount = Math.max(0, hoveredCount + delta);
    paused = hoveredCount > 0;
  };

  items.forEach((item) => {
    const { el } = item;

    // La pause au survol ne s'applique qu'en rotation continue (voir
    // tick) : l'ouverture va toujours jusqu'au bout.
    el.addEventListener("mouseenter", () => setHover(1));
    el.addEventListener("mouseleave", () => setHover(-1));

    // Équivalent tactile : il n'y a pas de mouseenter/mouseleave au
    // doigt, donc sans ça un visiteur mobile ne peut jamais stabiliser
    // le cercle pour lire la légende d'un projet. On met en pause
    // pendant que le doigt reste posé ; { passive: true } car on ne
    // bloque jamais le scroll ni le tap.
    el.addEventListener("touchstart", () => setHover(1), { passive: true });
    el.addEventListener("touchend", () => setHover(-1), { passive: true });

    el.addEventListener("click", (event) => {
      // Ctrl/Cmd-clic, Maj-clic… : le navigateur ouvre un nouvel
      // onglet normalement, sans animation.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      if (!item.revealed || phase === "closing") return;
      startClosing(item, el.href);
    });
  });

  // --- Boucle principale ---
  let lastTime = performance.now();

  const tick = (now) => {
    // Plafonné pour éviter un bond après un passage en arrière-plan.
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (phase === "fill") {
      angle += fillSpeed * dt;
      revealDue();
      if (items.every((item) => item.revealed)) phase = "decel";
    } else if (phase === "decel") {
      decelElapsed += dt;
      const u = Math.min(1, decelElapsed / DECEL_DURATION);
      // La vitesse glisse de fillSpeed à CRUISE_SPEED, sans à-coup.
      const speed = CRUISE_SPEED + (fillSpeed - CRUISE_SPEED) * (1 - u) ** 2;
      angle += speed * dt;
      if (u >= 1) phase = "cruise";
    } else if (phase === "cruise") {
      if (!paused) angle += CRUISE_SPEED * dt;
    }

    render();
    updateSpotlight();
    requestAnimationFrame(tick);
  };

  // La roue démarre vide et ne se remplit qu'une fois réellement visible
  // à l'écran (au moins 40 % du cercle) : elle se trouve sous le hero,
  // et pendant l'intro, intro.js pousse toute la page sous l'écran. Le
  // visiteur voit donc toujours les projets arriver un par un.
  // IntersectionObserver tient compte des déplacements (transform) de
  // l'intro. Il sert aussi à mettre en pause le tremblement du contour
  // quand la roue n'est pas à l'écran.
  const waitForStage = () =>
    new Promise((resolve) => {
      if (!("IntersectionObserver" in window)) {
        sketch?.start();
        return resolve();
      }
      let started = false;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && phase !== "closing") sketch?.start();
          else sketch?.stop();
          if (!started && entry.intersectionRatio >= 0.4) {
            started = true;
            resolve();
          }
        },
        { threshold: [0, 0.4] }
      );
      observer.observe(track);
    });

  waitForStage().then(() => {
    // Le premier projet est déjà à 12 h : il entre immédiatement.
    revealDue();
    render();
    lastTime = performance.now();
    requestAnimationFrame(tick);
  });
}