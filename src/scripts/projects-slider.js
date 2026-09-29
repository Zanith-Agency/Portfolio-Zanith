import { gsap } from "gsap";

const POINTS = 21; // résolution de la vague (plus de points = plus fluide)
const AMPLITUDE = 9; // amplitude en %
const PHASE_SPEED = 5; // vitesse à laquelle la vague "roule" pendant le balayage
const HIDDEN_FRONT = -25;
const REVEALED_FRONT = 125;
const FULL_CLIP = "polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%)";

// Génère un polygone à la volée (pas d'interpolation entre 2 formes figées) :
// la phase du sinus avance en même temps que le front, donc la crête de la
// vague se déplace verticalement PENDANT le balayage horizontal — c'est ce
// qui donne l'impression d'une vraie vague qui roule, pas d'un zigzag qui glisse.
function buildWaveClip(front, phase, amplitude) {
  const pts = [`-20% 0%`];
  for (let i = 0; i < POINTS; i++) {
    const y = (i / (POINTS - 1)) * 100;
    const x = front + amplitude * Math.sin((y / 100) * 4 * Math.PI + phase);
    pts.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  pts.push(`-20% 100%`);
  return `polygon(${pts.join(", ")})`;
}

export function initProjectsSlider() {
  const root = document.getElementById("projects-slider");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".projects-slide"));
  const prevBtn = root.querySelector(".slider-prev");
  const nextBtn = root.querySelector(".slider-next");
  const currentEl = root.querySelector(".slider-current");
  const totalEl = root.querySelector(".slider-total");
  const fillEl = root.querySelector(".slider-track-fill");
  const crest = root.querySelector(".wave-crest");
  const count = slides.length;
  if (count === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = 0;
  let animating = false;

  slides.forEach((s, i) => {
    gsap.set(s, {
      clipPath: i === 0 ? FULL_CLIP : buildWaveClip(HIDDEN_FRONT, 0, AMPLITUDE),
      zIndex: i === 0 ? 2 : 1,
      rotateY: 0,
      filter: "none",
    });
  });
  if (totalEl) totalEl.textContent = String(count).padStart(2, "0");
  updateMeta(0);

  function updateMeta(index) {
    if (currentEl) currentEl.textContent = String(index + 1).padStart(2, "0");
    if (fillEl) fillEl.style.width = `${((index + 1) / count) * 100}%`;
  }

  function goTo(index) {
    if (animating || index === active) return;
    const prev = active;
    active = index;
    animating = true;
    updateMeta(index);

    const incoming = slides[index];
    const outgoing = slides[prev];

    if (reduced) {
      gsap.set(outgoing, { clipPath: buildWaveClip(HIDDEN_FRONT, 0, AMPLITUDE), zIndex: 1 });
      gsap.set(incoming, { clipPath: FULL_CLIP, zIndex: 2, rotateY: 0, filter: "none" });
      animating = false;
      return;
    }

    gsap.set(incoming, {
      clipPath: buildWaveClip(HIDDEN_FRONT, 0, AMPLITUDE),
      zIndex: 2,
      rotateY: -14,
      filter: "drop-shadow(-10px 0 18px rgba(0,0,0,0.4))",
    });
    gsap.set(outgoing, { zIndex: 1 });

    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: 1,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        const t = proxy.t;
        const front = gsap.utils.interpolate(HIDDEN_FRONT, REVEALED_FRONT, t);
        const phase = t * PHASE_SPEED;
        const amp = AMPLITUDE * (0.45 + 0.55 * Math.sin(t * Math.PI));

        gsap.set(incoming, {
          clipPath: buildWaveClip(front, phase, amp),
          rotateY: -14 * (1 - t),
        });
        // le visuel sortant recule et s'assombrit légèrement : donne une
        // impression de profondeur derrière la page qui se lève.
        gsap.set(outgoing, { scale: 1 + 0.025 * t, filter: `brightness(${1 - 0.18 * t})` });

        if (crest) {
          gsap.set(crest, { left: `${front}%`, opacity: Math.sin(t * Math.PI) });
        }
      },
      onComplete: () => {
        gsap.set(incoming, { clipPath: FULL_CLIP, rotateY: 0, filter: "none" });
        gsap.set(outgoing, { clipPath: buildWaveClip(HIDDEN_FRONT, 0, AMPLITUDE), zIndex: 1, scale: 1, filter: "none" });
        animating = false;
      },
    });
  }

  prevBtn?.addEventListener("click", () => goTo((active - 1 + count) % count));
  nextBtn?.addEventListener("click", () => goTo((active + 1) % count));
}