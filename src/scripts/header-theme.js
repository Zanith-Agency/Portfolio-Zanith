// Couleur du header selon ce qui défile en dessous de lui.
//
// Le header est fixe et transparent : son texte doit être clair sur un
// fond sombre et sombre sur un fond clair. Chaque grande zone de la
// page indique son fond avec data-header-theme="dark" ou "light", et
// on bascule la classe .is-dark-bg du header (texte clair) selon la
// zone qui passe derrière lui pendant le défilement.
//
// Réutilisable sur n'importe quelle page : il suffit d'ajouter
// data-header-theme sur ses sections.

export function initHeaderTheme() {
  const header = document.getElementById("site-header");
  const zones = Array.from(document.querySelectorAll("[data-header-theme]"));
  if (!header || zones.length === 0) return;

  let scheduled = false;

  const update = () => {
    scheduled = false;
    const probe = header.offsetHeight / 2; // milieu du header
    const zone = zones.find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top <= probe && rect.bottom > probe;
    });
    if (zone) {
      header.classList.toggle("is-dark-bg", zone.dataset.headerTheme === "dark");
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
}