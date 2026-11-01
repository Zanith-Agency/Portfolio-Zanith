// Interactions des contenus propres à El Mágico (ElMagicoExtras.astro) :
// l'atelier typo & couleurs et les captures annotées.

export function initElMagicoExtras() {
  document.querySelectorAll("[data-elm-lab]").forEach(initLab);
  document.querySelectorAll("[data-elm-notes]").forEach(initNotes);
}

// ---------------- Atelier typo & couleurs ----------------

function initLab(root) {
  const input = root.querySelector("[data-lab-input]");
  const serif = root.querySelector("[data-lab-serif]");
  const sans = root.querySelector("[data-lab-sans]");
  const styleButtons = root.querySelectorAll("[data-lab-style]");
  const status = root.querySelector("[data-lab-status]");
  const fallback = input?.value || "";

  // Le texte saisi s'affiche dans les deux polices en direct
  input?.addEventListener("input", () => {
    const text = input.value.trim() === "" ? fallback : input.value;
    serif.textContent = text;
    sans.textContent = text;
  });

  // Style du titre : Regular / Italique (doré) / SemiBold
  styleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const style = button.dataset.labStyle;
      styleButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      serif.classList.toggle("is-italic", style === "italic");
      serif.classList.toggle("is-semibold", style === "semibold");
    });
  });

  // Palette : un clic copie le code couleur
  root.querySelectorAll("[data-lab-copy]").forEach((swatch) => {
    const action = swatch.querySelector("[data-lab-action]");
    let timer = null;

    swatch.addEventListener("click", async () => {
      const hex = swatch.dataset.labCopy;
      const copied = await copyText(hex);
      action.textContent = copied ? "Copié ✓" : hex;
      swatch.classList.toggle("is-copied", copied);
      if (status) status.textContent = copied ? `${hex} copié` : `Code couleur : ${hex}`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        action.textContent = "Copier";
        swatch.classList.remove("is-copied");
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

  const showNote = (capture, index) => {
    const dots = Array.from(capture.querySelectorAll("[data-notes-dot]"));
    const notes = Array.from(capture.querySelectorAll("[data-notes-note]"));
    const count = notes.length;
    const target = ((index % count) + count) % count;
    notes.forEach((note, i) => (note.hidden = i !== target));
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === target)));
    capture.dataset.active = String(target);
  };

  captures.forEach((capture) => {
    capture.dataset.active = "0";
    capture.querySelectorAll("[data-notes-dot]").forEach((dot) => {
      dot.addEventListener("click", () => showNote(capture, Number(dot.dataset.notesDot)));
    });
    capture.querySelectorAll("[data-notes-step]").forEach((button) => {
      button.addEventListener("click", () => {
        showNote(capture, Number(capture.dataset.active) + Number(button.dataset.notesStep));
      });
    });
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