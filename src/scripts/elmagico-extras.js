// Interactions des contenus propres à El Mágico (ElMagicoExtras.astro) :
// l'atelier typo & couleurs et les captures annotées.

export function initElMagicoExtras() {
  document.querySelectorAll("[data-elm-lab]").forEach(initLab);
  document.querySelectorAll("[data-elm-notes]").forEach(initNotes);
}

// ---------------- Atelier typo & couleurs ----------------

function initLab(root) {
  const input = root.querySelector("[data-lab-input]");
  const card = root.querySelector("[data-lab-card]");
  const line1 = root.querySelector("[data-lab-line1]");
  const line2 = root.querySelector("[data-lab-line2]");
  const clock = root.querySelector("[data-lab-clock]");
  const styleButtons = root.querySelectorAll("[data-lab-style]");
  const themeButtons = root.querySelectorAll("[data-lab-theme]");
  const status = root.querySelector("[data-lab-status]");
  const fallback = input?.value || "";

  // Titre : comme sur le site, la première phrase en blanc, la suite
  // sur une seconde ligne (« seconde voix »).
  const renderTitle = () => {
    const text = input.value.trim() === "" ? fallback : input.value.trim();
    const match = text.match(/^(.+?[.!?…])\s+(.+)$/);
    line1.textContent = match ? match[1] : text;
    line2.textContent = match ? match[2] : "";
  };
  input?.addEventListener("input", renderTitle);

  // Style de la seconde ligne : Regular / Italique (doré) / SemiBold
  styleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const style = button.dataset.labStyle;
      styleButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      line2.classList.toggle("is-italic", style === "italic");
      line2.classList.toggle("is-semibold", style === "semibold");
      // L'italique porte le doré ; sinon la ligne reste blanche
      line2.dataset.role = style === "italic" ? "dore" : "blanc";
    });
  });

  // Avec / sans la charte
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const plain = button.dataset.labTheme === "plain";
      themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      card.classList.toggle("is-plain", plain);
      card.classList.toggle("is-brand", !plain);
      delete card.dataset.spot;
      if (status) status.textContent = plain ? "Aperçu sans la charte" : "Aperçu avec la charte El Mágico";
    });
  });

  // Heure de Bruxelles, comme l'horloge du vrai site
  if (clock) {
    const format = new Intl.DateTimeFormat("fr-BE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Brussels",
    });
    const tick = () => {
      clock.textContent = format.format(new Date());
    };
    tick();
    setInterval(tick, 15000);
  }

  // Palette : survol = on montre où vit la couleur ; clic = copie
  const spot = (role) => {
    if (!card || card.classList.contains("is-plain")) return;
    if (role) card.dataset.spot = role;
    else delete card.dataset.spot;
  };

  root.querySelectorAll("[data-lab-copy]").forEach((swatch) => {
    const action = swatch.querySelector("[data-lab-action]");
    const role = swatch.dataset.labRole;
    let timer = null;

    swatch.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") spot(role);
    });
    swatch.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") spot(null);
    });
    swatch.addEventListener("focus", () => spot(role));
    swatch.addEventListener("blur", () => spot(null));

    swatch.addEventListener("click", async () => {
      const hex = swatch.dataset.labCopy;
      const copied = await copyText(hex);
      action.textContent = copied ? "Copié ✓" : hex;
      swatch.classList.toggle("is-copied", copied);
      if (status) status.textContent = copied ? `${hex} copié` : `Code couleur : ${hex}`;
      // Au doigt (pas de survol) : on montre la couleur un instant
      spot(role);
      clearTimeout(timer);
      timer = setTimeout(() => {
        action.textContent = "Copier";
        swatch.classList.remove("is-copied");
        if (!swatch.matches(":hover, :focus-visible")) spot(null);
      }, 1600);
    });
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Navigateurs sans API presse-papiers (ou page non sécurisée)
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// ---------------- Captures annotées ----------------

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
      veils.forEach((veil, i) => (veil.hidden = i !== active));
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