// Contour « dessiné à la main » qui tremble légèrement, façon dessin
// animé image par image.
//
// Plusieurs traits fermés entourent approximativement un rectangle aux
// coins arrondis. Chaque trait est légèrement décalé et déformé, ne se
// referme pas parfaitement (il dépasse un peu son point de départ,
// comme un geste de crayon), et il est redessiné ~8 fois par seconde
// avec de nouvelles petites irrégularités : les lignes « vibrent » sans
// jamais bouger de place ni changer de taille.

const SVG_NS = "http://www.w3.org/2000/svg";

// Points régulièrement répartis sur le contour d'un rectangle arrondi
function roundedRectPoints(width, height, radius, count) {
  const r = Math.min(radius, width / 2, height / 2);
  const straightW = width - 2 * r;
  const straightH = height - 2 * r;
  const arc = (Math.PI / 2) * r;
  const perimeter = 2 * straightW + 2 * straightH + 4 * arc;

  // Segments parcourus dans le sens horaire depuis le haut-gauche
  const segments = [
    { len: straightW, at: (t) => [r + t * straightW, 0, 0, -1] },
    { len: arc, at: (t) => corner(width - r, r, -Math.PI / 2 + (t * Math.PI) / 2) },
    { len: straightH, at: (t) => [width, r + t * straightH, 1, 0] },
    { len: arc, at: (t) => corner(width - r, height - r, (t * Math.PI) / 2) },
    { len: straightW, at: (t) => [width - r - t * straightW, height, 0, 1] },
    { len: arc, at: (t) => corner(r, height - r, Math.PI / 2 + (t * Math.PI) / 2) },
    { len: straightH, at: (t) => [0, height - r - t * straightH, -1, 0] },
    { len: arc, at: (t) => corner(r, r, Math.PI + (t * Math.PI) / 2) },
  ];

  function corner(cx, cy, angle) {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return [cx + nx * r, cy + ny * r, nx, ny];
  }

  const points = [];
  for (let k = 0; k < count; k++) {
    let distance = (k / count) * perimeter;
    for (const segment of segments) {
      if (distance <= segment.len || segment === segments[segments.length - 1]) {
        points.push(segment.at(segment.len ? Math.min(1, distance / segment.len) : 0));
        break;
      }
      distance -= segment.len;
    }
  }
  return points; // [x, y, normaleX, normaleY]
}

// Courbe lisse passant par les points (Catmull-Rom → Bézier)
function smoothPath(points) {
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function createSketchFrame(svg, options = {}) {
  const {
    strokes = 3, // nombre de traits superposés
    wobble = 2.4, // amplitude des irrégularités (px)
    drift = 3.5, // décalage max de chaque trait (px)
    fps = 8, // images par seconde du « tremblement »
  } = options;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paths = [];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let last = 0;
  let running = false;

  for (let s = 0; s < strokes; s++) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", `sketch-stroke sketch-stroke--${s + 1}`);
    svg.appendChild(path);
    // Chaque trait a sa propre « personnalité » : décalage, point de
    // départ et dépassement, gardés d'une image à l'autre pour que le
    // contour tremble sans se déplacer.
    paths.push({
      el: path,
      dx: (Math.random() - 0.5) * 2 * drift,
      dy: (Math.random() - 0.5) * 2 * drift,
      grow: (Math.random() - 0.5) * drift,
      start: Math.random(),
      overshoot: 0.04 + Math.random() * 0.06,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const draw = () => {
    if (!width || !height) return;
    const inset = drift + wobble + 2; // le dessin reste dans le SVG
    const w = width - 2 * inset;
    const h = height - 2 * inset;
    const count = Math.max(24, Math.round((w + h) / 14));
    const time = performance.now() / 1000;

    paths.forEach((stroke, index) => {
      const base = roundedRectPoints(w + stroke.grow, h + stroke.grow, Math.min(w, h) * 0.06, count);
      const startIndex = Math.floor(stroke.start * count);
      const extra = Math.round(stroke.overshoot * count);
      const points = [];

      for (let k = 0; k <= count + extra; k++) {
        const [x, y, nx, ny] = base[(startIndex + k) % count];
        // Irrégularité : une ondulation douce + un peu de hasard
        const wave = Math.sin(k * 0.9 + stroke.phase + time * 2.1 + index) * 0.6;
        const jitter = (Math.random() - 0.5) * 2;
        const offset = (wave + jitter) * wobble;
        points.push([
          inset - stroke.grow / 2 + stroke.dx + x + nx * offset,
          inset - stroke.grow / 2 + stroke.dy + y + ny * offset,
        ]);
      }
      stroke.el.setAttribute("d", smoothPath(points));
    });
  };

  const loop = (now) => {
    if (!running) return;
    if (now - last >= 1000 / fps) {
      last = now;
      draw();
    }
    frameId = requestAnimationFrame(loop);
  };

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      draw();
    },
    start() {
      if (running || reduced) return;
      running = true;
      frameId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
    },
  };
}