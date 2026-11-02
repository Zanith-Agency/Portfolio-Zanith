// Mise en avant du projet actif de la roue (page d'accueil) :
// la fiche en haut à gauche et les deux points forts sous la roue.
//
// Les données de chaque projet sont fournies par la page dans un
// <script type="application/json" data-spotlight-data>. Le changement
// de projet se fait en deux temps : l'ancien contenu s'efface en
// remontant légèrement, le nouveau apparaît en remontant depuis le bas.
// Tout le texte est injecté avec textContent (jamais en HTML).

import { gsap } from "gsap";

const FACT_LABELS = [
  ["client", "Client"],
  ["year", "Année"],
  ["sector", "Secteur"],
  ["services", "Services"],
  ["tools", "Technologies"],
];

export function createSpotlight(root) {
  const dataEl = root.querySelector("[data-spotlight-data]");
  const panel = root.querySelector("[data-spot-panel]");
  const highlights = root.querySelector("[data-spot-highlights]");
  if (!dataEl || !panel) return null;

  let projects = [];
  try {
    projects = JSON.parse(dataEl.textContent || "[]");
  } catch {
    return null;
  }

  const indexEl = panel.querySelector("[data-spot-index]");
  const titleEl = panel.querySelector("[data-spot-title]");
  const summaryEl = panel.querySelector("[data-spot-summary]");
  const factsEl = panel.querySelector("[data-spot-facts]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current = -1;
  let timeline = null;
  let hidden = false;

  const fill = (index) => {
    const project = projects[index];
    if (!project) return;

    indexEl.textContent = `${String(index + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
    titleEl.textContent = project.title;
    summaryEl.textContent = project.summary || "";
    summaryEl.hidden = !project.summary;

    factsEl.replaceChildren();
    FACT_LABELS.forEach(([key, label]) => {
      const value = project[key];
      if (!value) return;
      const row = document.createElement("div");
      row.className = "work-fact";
      row.dataset.fact = key;
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.append(dt, dd);
      factsEl.append(row);
    });

    if (highlights) {
      highlights.replaceChildren();
      (project.highlights || []).slice(0, 2).forEach((item, k) => {
        const block = document.createElement("div");
        block.className = "work-highlight";
        const number = document.createElement("span");
        number.className = "work-highlight-number";
        number.textContent = String(k + 1).padStart(2, "0");
        const title = document.createElement("span");
        title.className = "work-highlight-title";
        title.textContent = item.title || "";
        const text = document.createElement("p");
        text.className = "work-highlight-text";
        text.textContent = item.text || "";
        block.append(number, title, text);
        highlights.append(block);
      });
      highlights.classList.toggle("is-empty", highlights.childElementCount === 0);
    }
  };

  // Éléments animés, dans l'ordre d'apparition
  const targets = () =>
    [indexEl, titleEl, summaryEl, factsEl, ...(highlights ? highlights.children : [])].filter(
      (el) => el && !el.hidden
    );

  return {
    setActive(index) {
      if (hidden || index === current) return;
      const first = current === -1;
      current = index;
      timeline?.kill();

      if (reduced) {
        fill(index);
        root.classList.add("has-spotlight");
        return;
      }

      // Les points forts sont recréés à chaque changement : l'apparition
      // est donc lancée APRÈS le remplacement du contenu, sur les
      // nouveaux éléments.
      const showNew = () => {
        fill(index);
        root.classList.add("has-spotlight");
        timeline = gsap.fromTo(
          targets(),
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.05 }
        );
      };

      if (first) {
        showNew();
      } else {
        timeline = gsap.to(targets(), {
          opacity: 0,
          y: -10,
          duration: 0.22,
          ease: "power1.in",
          stagger: 0.025,
          onComplete: showNew,
        });
      }
    },

    // Fermeture de la roue : tout s'efface et ne bouge plus
    hide() {
      hidden = true;
      timeline?.kill();
      root.classList.add("is-closing");
    },

    get active() {
      return current;
    },
  };
}