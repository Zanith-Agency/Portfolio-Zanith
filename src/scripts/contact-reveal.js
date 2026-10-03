// Page contact : en mode "jour", le texte est blanc sur fond blanc et
// n'apparaît que dans un halo autour du curseur (masque CSS piloté par
// --mx/--my). Le toggle jour/nuit inverse les couleurs et désactive le
// masque en mode nuit (texte pleinement visible).

export function initContactReveal() {
  const section = document.querySelector(".contact-page");
  const mask = section?.querySelector(".contact-text--reveal");
  if (!section || !mask) return; // pas la page contact

  const toggle = document.getElementById("theme-toggle");
  const label = toggle?.querySelector(".theme-toggle-label");
  const header = document.getElementById("site-header");

  // Repéré en testant la page : tant qu'aucun mousemove n'a eu lieu,
  // le CSS retombe sur sa valeur par défaut (--mx/--my: 50%), donc un
  // cercle de texte coloré apparaît au centre de l'écran dès le
  // chargement — avant même que quiconque ait touché la souris. On
  // pousse le masque hors champ au départ pour que rien ne soit
  // révélé tant qu'il n'y a pas eu d'interaction réelle.
  section.style.setProperty("--mx", "-9999px");
  section.style.setProperty("--my", "-9999px");

  toggle?.addEventListener("click", () => {
    const isNight = section.getAttribute("data-theme") === "night";
    section.setAttribute("data-theme", isNight ? "day" : "night");
    toggle.setAttribute("aria-pressed", String(!isNight));
    if (label) label.textContent = isNight ? "Jour" : "Nuit";
    // Le header est un élément global (hors de cette section) : on
    // bascule sa couleur en même temps que le fond de la page contact.
    header?.classList.toggle("is-dark-bg", !isNight);
  });

  // Important : le masque CSS (mask-image) est positionné par rapport à
  // la boîte de .reveal-mask elle-même, donc les coordonnées doivent
  // être calculées relativement à CET élément, pas à la page ou à la
  // section parente — sinon le halo apparaît décalé par rapport au
  // curseur réel.
  const updatePosition = (x, y) => {
    const rect = mask.getBoundingClientRect();
    section.style.setProperty("--mx", `${x - rect.left}px`);
    section.style.setProperty("--my", `${y - rect.top}px`);
  };

  section.addEventListener("mousemove", (e) => {
    updatePosition(e.clientX, e.clientY);
  });

  // Fallback tactile : le doigt joue le rôle du curseur pendant le
  // contact avec l'écran (pas de vrai "hover" sur mobile).
  section.addEventListener(
    "touchmove",
    (e) => {
      const touch = e.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    },
    { passive: true }
  );
}