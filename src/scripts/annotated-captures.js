// Captures annotées des pages projets (AnnotatedCaptures.astro) :
// onglets, points numérotés, zones mises en valeur et zoom animé.

export function initAnnotatedCaptures() {
  document.querySelectorAll("[data-annotated-captures]").forEach((root) => {
    if (root.dataset.notesReady) return;
    root.dataset.notesReady = "true";
    initNotes(root);
  });
}

function initNotes(root) {
  const tabs = Array.from(root.querySelectorAll("[data-notes-tab]"));
  const captures = Array.from(root.querySelectorAll("[data-notes-capture]"));
  const mobile = window.matchMedia("(max-width: 800px)");

  // Zoom maximal : plus fort sur téléphone, où la capture est petite
  const maxZoom = () => (mobile.matches ? 3.2 : 2.4);
  const PAD = 4; // marge autour des zones cadrées (% de l'image)

  captures.forEach((capture) => {
    const stage = capture.querySelector("[data-notes-stage]");
    const figure = capture.querySelector("[data-notes-figure]");
    const dots = Array.from(capture.querySelectorAll("[data-notes-dot]"));
    const notes = Array.from(capture.querySelectorAll("[data-notes-note]"));
    const veils = Array.from(capture.querySelectorAll("[data-notes-veil]"));
    const zones = Array.from(capture.querySelectorAll("[data-zone-of]"));
    const zoomButton = capture.querySelector("[data-notes-zoom]");
    const count = notes.length;

    const state = {
      active: 0,
      // Sur téléphone, on arrive directement zoomé sur la première note
      zoomed: mobile.matches,
    };

    // Cadre englobant les zones de la note (en %)
    const frameOf = (index) => {
      const own = zones.filter((z) => Number(z.dataset.zoneOf) === index);
      const x1 = Math.min(...own.map((z) => Number(z.dataset.x))) - PAD;
      const y1 = Math.min(...own.map((z) => Number(z.dataset.y))) - PAD;
      const x2 = Math.max(...own.map((z) => Number(z.dataset.x) + Number(z.dataset.w))) + PAD;
      const y2 = Math.max(...own.map((z) => Number(z.dataset.y) + Number(z.dataset.h))) + PAD;
      return { x1, y1, x2, y2 };
    };

    const render = () => {
      const { active, zoomed } = state;
      notes.forEach((note, i) => (note.hidden = i !== active));
      // Le voile est un <svg> : la propriété .hidden n'existe que sur les
      // éléments HTML, il faut donc passer par l'attribut.
      veils.forEach((veil, i) => veil.toggleAttribute("hidden", i !== active));
      dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === active)));
      zones.forEach((zone) => zone.classList.toggle("is-active", Number(zone.dataset.zoneOf) === active));
      zoomButton?.setAttribute("aria-pressed", String(zoomed));

      let scale = 1;
      let tx = 0;
      let ty = 0;
      if (zoomed) {
        const f = frameOf(active);
        scale = Math.max(1, Math.min(maxZoom(), 100 / (f.x2 - f.x1), 100 / (f.y2 - f.y1)));
        // Centre du cadre au centre de la capture, sans jamais montrer
        // de vide sur les bords
        const cx = (f.x1 + f.x2) / 2;
        const cy = (f.y1 + f.y2) / 2;
        tx = Math.min(0, Math.max(100 - 100 * scale, 50 - cx * scale));
        ty = Math.min(0, Math.max(100 - 100 * scale, 50 - cy * scale));
      }
      stage.style.transform = `translate(${tx}%, ${ty}%) scale(${scale})`;
      stage.style.setProperty("--zoom", String(scale));
    };

    const show = (index, zoom = true) => {
      state.active = ((index % count) + count) % count;
      if (zoom) state.zoomed = true;
      render();
    };

    dots.forEach((dot) => {
      dot.addEventListener("click", () => show(Number(dot.dataset.notesDot)));
    });
    capture.querySelectorAll("[data-notes-step]").forEach((button) => {
      button.addEventListener("click", () => show(state.active + Number(button.dataset.notesStep)));
    });
    zoomButton?.addEventListener("click", () => {
      state.zoomed = !state.zoomed;
      render();
    });

    // Glissement horizontal sur la capture (au doigt) : note suivante
    let start = null;
    figure.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      start = { x: event.clientX, y: event.clientY };
    });
    figure.addEventListener("pointerup", (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) show(state.active + (dx < 0 ? 1 : -1));
    });
    figure.addEventListener("pointercancel", () => {
      start = null;
    });

    mobile.addEventListener?.("change", render);
    render();
  });

  const selectTab = (tab, focus = false) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    captures.forEach((capture) => {
      capture.hidden = capture.dataset.notesCapture !== tab.dataset.notesTab;
    });
    tab.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    // Onglets au clavier : flèches gauche / droite
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      selectTab(tabs[(index + step + tabs.length) % tabs.length], true);
    });
  });
}