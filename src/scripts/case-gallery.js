// Galerie des pages projets (CaseGallery.astro).
//
// Carrousel : défilement horizontal natif (doigt, pavé tactile), plus le
// glisser à la souris et les flèches. La barre de progression et le
// compteur suivent la position.
// Visionneuse : un clic sur une image l'ouvre en plein écran.

const DRAG_THRESHOLD = 6; // px avant de considérer que c'est un glissement
const SWIPE_THRESHOLD = 50; // px pour changer d'image dans la visionneuse

export function initCaseGalleries() {
  document.querySelectorAll("[data-case-gallery]").forEach((root) => {
    if (root.dataset.galleryReady) return;
    root.dataset.galleryReady = "true";
    initCarousel(root);
    initLightbox(root);
  });
}

// ---------------- Carrousel ----------------

function initCarousel(root) {
  const track = root.querySelector("[data-cg-track]");
  const slides = Array.from(track.querySelectorAll(".cg-slide"));
  const bar = root.querySelector("[data-cg-bar]");
  const current = root.querySelector("[data-cg-current]");
  const prev = root.querySelector('[data-cg-step="-1"]');
  const next = root.querySelector('[data-cg-step="1"]');
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Image la plus proche du bord gauche
  const currentIndex = () => {
    const left = track.scrollLeft;
    let best = 0;
    slides.forEach((slide, index) => {
      if (Math.abs(slide.offsetLeft - left) <
          Math.abs(slides[best].offsetLeft - left)) best = index;
    });
    return best;
  };

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const progress = max > 0 ? track.scrollLeft / max : 1;
    bar?.style.setProperty("--progress", progress.toFixed(4));
    // En fin de course, la dernière image peut ne pas atteindre le bord
    const index = progress > 0.995 ? slides.length - 1 : currentIndex();
    if (current) current.textContent = String(index + 1).padStart(2, "0");
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  };

  const goTo = (index) => {
    const slide = slides[Math.max(0, Math.min(slides.length - 1, index))];
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  prev?.addEventListener("click", () => goTo(currentIndex() - 1));
  next?.addEventListener("click", () => goTo(currentIndex() + 1));
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  // --- Glisser à la souris (le doigt utilise le défilement natif) ---
  let drag = null;
  root.suppressClick = false;

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag = { x: event.clientX, left: track.scrollLeft, moved: false, id: event.pointerId };
  });

  track.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.moved = true;
      track.classList.add("is-dragging");
      track.setPointerCapture(event.pointerId);
    }
    track.scrollLeft = drag.left - dx;
  });

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved, x } = drag;
    drag = null;
    if (!moved) return;
    track.classList.remove("is-dragging");
    // Le clic qui suit un glissement n'ouvre pas la visionneuse
    root.suppressClick = true;
    setTimeout(() => {
      root.suppressClick = false;
    }, 0);
    // Calage : en avançant, sur l'image suivante dès qu'on l'a
    // entamée ; en reculant, sur celle qui dépasse à gauche.
    const pos = track.scrollLeft;
    let i = 0;
    while (i < slides.length - 1 && slides[i + 1].offsetLeft <= pos) i += 1;
    const forward = event.clientX < x;
    goTo(forward && pos - slides[i].offsetLeft > 10 ? i + 1 : i);
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("dragstart", (event) => event.preventDefault());
}

// ---------------- Visionneuse ----------------

function initLightbox(root) {
  const dialog = root.querySelector("[data-cg-lightbox]");
  const full = root.querySelector("[data-cg-full]");
  const count = root.querySelector("[data-cg-full-count]");
  const dataEl = root.querySelector("[data-cg-images]");
  if (!dialog || !full || !dataEl || typeof dialog.showModal !== "function") return;

  let images = [];
  try {
    images = JSON.parse(dataEl.textContent || "[]");
  } catch {
    return;
  }

  let index = 0;
  let opener = null;

  const show = (nextIndex, direction = 0) => {
    index = (nextIndex + images.length) % images.length;
    const image = images[index];
    full.src = image.src;
    full.alt = image.alt;
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`;
    full.style.setProperty("--dir", String(direction || 1));
    full.classList.remove("is-entering");
    void full.offsetWidth; // relance l'animation d'entrée
    full.classList.add("is-entering");
    // Préchargement des voisines
    [index + 1, index - 1].forEach((k) => {
      const preload = new Image();
      preload.src = images[(k + images.length) % images.length].src;
    });
  };

  const open = (startIndex, trigger) => {
    opener = trigger;
    show(startIndex);
    dialog.classList.remove("is-closing");
    dialog.showModal();
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
  };

  const close = () => {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      dialog.classList.remove("is-closing");
      dialog.close();
    };
    if (reduced) finish();
    else {
      dialog.classList.add("is-closing");
      setTimeout(finish, 250);
    }
  };

  // Après fermeture (bouton, Échap ou clic sur le fond) : on rend le
  // défilement et le focus à l'image d'origine.
  dialog.addEventListener("close", () => {
    window.__lenis?.start();
    document.documentElement.style.overflow = "";
    opener?.focus({ preventScroll: true });
  });

  // Échap : on joue le fondu de sortie
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  root.querySelectorAll("[data-cg-open]").forEach((slide) => {
    slide.addEventListener("click", () => {
      if (root.suppressClick) return;
      open(Number(slide.dataset.cgOpen), slide);
    });
  });

  dialog.querySelector("[data-cg-close]")?.addEventListener("click", close);
  dialog.querySelectorAll("[data-cg-full-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.cgFullStep);
      show(index + step, step);
    });
  });

  // Clic sur le fond (hors image et boutons) : fermeture
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.classList.contains("cg-lightbox-figure")) close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") show(index + 1, 1);
    if (event.key === "ArrowLeft") show(index - 1, -1);
  });

  // Glissement au doigt pour changer d'image
  let start = null;
  const figure = dialog.querySelector(".cg-lightbox-figure");
  figure.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    start = { x: event.clientX, y: event.clientY };
  });
  figure.addEventListener("pointerup", (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      const step = dx < 0 ? 1 : -1;
      show(index + step, step);
    }
  });
  figure.addEventListener("pointercancel", () => {
    start = null;
  });
}