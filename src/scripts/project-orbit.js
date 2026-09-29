export function initProjectOrbit() {
  const track = document.querySelector(".project-orbit");
  if (!track) return;

  const items = Array.from(track.querySelectorAll(".project-orbit-item"));
  if (items.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let angle = -90; // le premier projet démarre en haut du cercle
  let paused = false;
  let radius = 0;

  const step = 360 / items.length;

  const computeRadius = () => {
    const rect = track.getBoundingClientRect();
    const itemSize = items[0].getBoundingClientRect().width;
    radius = Math.min(rect.width, rect.height) / 2 - itemSize / 2;
  };

  const render = () => {
    items.forEach((item, i) => {
      const a = ((angle + i * step) * Math.PI) / 180;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      item.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  };

  computeRadius();
  render();

  window.addEventListener("resize", () => {
    computeRadius();
    render();
  });

  if (reduced) return; // pas d'animation si l'utilisateur préfère un mouvement réduit

  let hoveredCount = 0;
items.forEach((item) => {
  item.addEventListener("mouseenter", () => {
    hoveredCount++;
    paused = true;
  });
  item.addEventListener("mouseleave", () => {
    hoveredCount--;
    paused = hoveredCount > 0;
  });
});

  const SPEED = 5; // degrés par seconde — vitesse de rotation, ajustable
  let lastTime = performance.now();

  const tick = (now) => {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (!paused) {
      angle += SPEED * dt;
      render();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}