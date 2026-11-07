// Interactions des contenus propres à El Mágico (ElMagicoExtras.astro) :
// l'atelier typo & couleurs (les captures annotées sont dans
// annotated-captures.js).

export function initElMagicoExtras() {
  document.querySelectorAll("[data-elm-lab]").forEach(initLab);
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