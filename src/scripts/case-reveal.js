// Apparition discrète des éléments de l'étude de cas au défilement :
// chaque élément marqué data-case-reveal remonte légèrement et apparaît
// en fondu quand il entre dans l'écran. Une seule fois — il ne
// disparaît pas en remontant.
//
// Le masquage initial n'est appliqué que si ce script tourne
// (html.has-case-reveal) : sans JavaScript, tout reste visible.

export function initCaseReveal() {
  const elements = Array.from(document.querySelectorAll("[data-case-reveal]"));
  if (elements.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("has-case-reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    // Déclenché un peu avant que l'élément soit bien entré dans l'écran
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
  );

  elements.forEach((element) => observer.observe(element));
}