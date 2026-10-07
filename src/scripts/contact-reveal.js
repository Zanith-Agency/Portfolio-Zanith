// Page contact : il n'y a plus de texte masqué à révéler à la souris —
// le toggle jour/nuit bascule simplement le thème (couleurs) de toute
// la section via les custom properties --bg-primary/--text-primary
// redéfinies en CSS, et synchronise la couleur du header global.

export function initContactReveal() {
  const section = document.querySelector(".contact-page");
  const toggle = document.getElementById("theme-toggle");
  if (!section || !toggle) return; // pas la page contact

  const label = toggle.querySelector(".theme-toggle-label");
  const header = document.getElementById("site-header");

  toggle.addEventListener("click", () => {
    const isNight = section.getAttribute("data-theme") === "night";
    section.setAttribute("data-theme", isNight ? "day" : "night");
    toggle.setAttribute("aria-pressed", String(!isNight));
    if (label) label.textContent = isNight ? "Jour" : "Nuit";
    // Le header est un élément global (hors de cette section) : on
    // bascule sa couleur en même temps que le fond de la page contact.
    header?.classList.toggle("is-dark-bg", !isNight);
  });
}