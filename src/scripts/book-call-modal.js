// Modale "Book un rendez-vous" : tombe depuis le haut à l'ouverture
// ("comme une lettre qui tombe", avec un léger rebond à l'arrivée),
// ressort par le bas à la fermeture plutôt que de remonter par où elle
// est venue. Le contenu interne (choix du parcours + formulaire) est
// géré séparément par contact-form.js — ce script ne s'occupe que de
// l'apparition/disparition du panneau.

import { gsap } from "gsap";

export function initBookCallModal() {
  const modal = document.querySelector("[data-book-modal]");
  const panel = modal?.querySelector(".book-modal-panel");
  const backdrop = modal?.querySelector("[data-book-modal-backdrop]");
  const closeBtn = modal?.querySelector("[data-book-modal-close]");
  const openTriggers = document.querySelectorAll("[data-open-book-call]");

  if (!modal || !panel || openTriggers.length === 0) return; // pas la page contact

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let isOpen = false;
  let lastFocused = null;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    lastFocused = document.activeElement;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (reduced) {
      gsap.set(panel, { yPercent: 0 });
    } else {
      // Repart toujours du haut, même si une fermeture précédente a
      // laissé le panneau en bas de l'écran (voir close()) — sinon un
      // deuxième "Book un rendez-vous" remonterait depuis le bas au
      // lieu de retomber d'en haut.
      gsap.set(panel, { yPercent: -130 });
      gsap.to(panel, { yPercent: 0, duration: 0.8, ease: "back.out(1.4)" });
    }

    // Premier champ interactif du panneau (l'option "Nouveau site" au
    // tout premier affichage).
    panel.querySelector("button, input")?.focus();
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    const finish = () => modal.classList.remove("is-open");

    if (reduced) {
      finish();
    } else {
      gsap.to(panel, { yPercent: 130, duration: 0.5, ease: "power2.in", onComplete: finish });
    }

    lastFocused?.focus();
  };

  openTriggers.forEach((trigger) => trigger.addEventListener("click", open));
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) close();
  });
}