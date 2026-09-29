import { gsap } from "gsap";

export function initCarousel() {
  const root = document.getElementById("project-carousel");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".carousel-slide"));
  const captions = Array.from(root.querySelectorAll(".carousel-caption-item"));
  if (slides.length === 0) return;

  let active = 0;
  gsap.set(slides, { rotateY: 90, opacity: 0 });
  gsap.set(slides[0], { rotateY: 0, opacity: 1 });
  slides[0].classList.add("is-active");
  captions[0]?.classList.add("is-active");

  const goTo = (index) => {
    const current = slides[active];
    const next = slides[index];
    current.classList.remove("is-active");
    captions[active]?.classList.remove("is-active");
    next.classList.add("is-active");
    captions[index]?.classList.add("is-active");

    const tl = gsap.timeline({ defaults: { duration: 0.9, ease: "power2.inOut" } });
    tl.to(current, { rotateY: -90, opacity: 0 })
      .fromTo(next, { rotateY: 90, opacity: 0 }, { rotateY: 0, opacity: 1 }, "<");

    active = index;
  };

  if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(() => goTo((active + 1) % slides.length), 4000);
  }
}