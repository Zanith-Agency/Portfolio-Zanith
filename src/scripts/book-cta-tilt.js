// Cercle "Book un rendez-vous" : bascule légèrement comme une assiette
// vers le curseur, quel que soit le côté d'où il approche (haut, bas,
// gauche, droite). L'anneau qui se remplit au survol est géré en pur
// CSS (:hover) ; ce script ne s'occupe que de l'inclinaison 3D.
//
// Rappel des maths CSS (vérifié) : avec X à droite, Y vers le bas et Z
// vers le spectateur, rotateX(a) positif éloigne le HAUT de l'élément
// (vers l'écran) — donc pour qu'il se rapproche du spectateur quand la
// souris est AU-DESSUS (dy négatif), il faut rotateX = dy * maxTilt
// (sans signe inversé). Symétriquement, rotateY = -dx * maxTilt pour
// que le bord droit se rapproche quand la souris est à droite.

export function initBookCtaTilt() {
  const button = document.querySelector(".book-cta");
  if (!button) return; // pas la page contact

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  if (reduced || noHover) return; // l'anneau au survol (CSS) suffit déjà

  const maxTilt = 14; // degrés, amplitude max de l'inclinaison

  const handleMove = (event) => {
    const rect = button.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const clampedX = Math.max(-1, Math.min(1, dx));
    const clampedY = Math.max(-1, Math.min(1, dy));

    button.style.transition = "transform 0.1s linear";
    button.style.transform =
      `perspective(600px) rotateX(${clampedY * maxTilt}deg) rotateY(${-clampedX * maxTilt}deg)`;
  };

  const reset = () => {
    button.style.transition = "transform 0.5s var(--ease-default, ease)";
    button.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg)";
  };

  button.addEventListener("mousemove", handleMove);
  button.addEventListener("mouseleave", reset);
}