// src/lib/themeFromBackground.js

// Reusable tiny canvas (no allocations per sample)
const sampler = (() => {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true });
  return { c, ctx, last: null };
})();

// ---- Public: start auto-theming (video = interval; image = one-shot) ----
export function startAutoTheme(
  el,
  {
    sample = 48,          // 32–64: higher = more accurate, slower
    interval = 2000,      // ms between video samples
    deltaThreshold = 10,  // don't update CSS if palette delta is tiny
  } = {}
) {
  let timer;

  const tick = () => {
    if (!el) return;
    themeFromElement(el, { sample, deltaThreshold, setVars: true });
  };

  const onVis = () => {
    clearInterval(timer);
    if (document.hidden) return;
    tick();
    if (el.tagName === "VIDEO") {
      timer = setInterval(tick, interval);
    }
  };

  document.addEventListener("visibilitychange", onVis);
  onVis();

  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVis);
  };
}

// ---- Public: one-off theme extraction from <img> or <video> ----
export function themeFromElement(
  el,
  {
    sample = 48,
    deltaThreshold = 10,
    setVars = true, // if true, write CSS vars on :root
  } = {}
) {
  const { c, ctx } = sampler;
  c.width = c.height = sample;

  // Draw current frame
  try {
    ctx.drawImage(el, 0, 0, sample, sample);
  } catch {
    return null; // likely CORS taint (ensure crossOrigin + proper headers)
  }

  const { data } = ctx.getImageData(0, 0, sample, sample);

  // Collect pixels; drop extreme dark/bright to avoid muddy picks
  const px = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 24) continue;
    const l = 0.2126 * (r / 255) ** 2.2 + 0.7152 * (g / 255) ** 2.2 + 0.0722 * (b / 255) ** 2.2;
    if (l < 0.05 || l > 0.95) continue;
    px.push([r, g, b]);
  }
  if (!px.length) return null;

  // --- tiny k-means (k=3, 3 iters), saturation-weighted ---
  const K = 3, iters = 3;
  const centers = initKMeans(px, K);
  const weights = px.map((rgb) => 0.6 + rgbToHsl(...rgb).s * 0.8); // prefer vivid
  const { clusters } = runKMeans(px, centers, weights, iters);

  // Dominant = largest weighted cluster; Accent = most saturated centroid
  let dominant = clusters[0], accent = clusters[0];
  for (const c of clusters) {
    if (c.weight > dominant.weight) dominant = c;
    if (c.centroid.hsl.s > accent.centroid.hsl.s) accent = c;
  }

  // ---- Guardrails on accent (keep it lively & readable) ----
  // Saturation floor + lightness clamp
  const MIN_S = 0.35;
  const L_MIN = 0.30, L_MAX = 0.70;

  const aHSL = { ...accent.centroid.hsl };
  if (aHSL.s < MIN_S) aHSL.s = MIN_S;
  aHSL.l = Math.min(L_MAX, Math.max(L_MIN, aHSL.l));

  // Companion color = hue rotated 180°, similar S, mirrored L
  const compH = (aHSL.h + 180) % 360;
  const comp = {
    h: compH,
    s: clamp01(aHSL.s * 0.9),
    l: clamp01(1 - aHSL.l * 0.8),
  };

  // Text/muted based on dominant luminance
  const lum = relativeLuminance(...dominant.centroid.rgb.map((v) => v / 255));
  const text = lum < 0.6 ? "#f8fafc" : "#0b0b0c";
  const muted = lum < 0.6 ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.6)";
  const glassBg = `rgba(255,255,255,${lum < 0.6 ? 0.08 : 0.12})`;
  const glassBorder = `rgba(255,255,255,${lum < 0.6 ? 0.18 : 0.16})`;

  // Grayscale fallback: if frame is nearly desaturated overall, use a fixed accent
  const SAT_GLOBAL = clusters.reduce((m, c) => Math.max(m, c.centroid.hsl.s), 0);
  const palette = {
    accent: SAT_GLOBAL < 0.12 ? "hsl(204 90% 55%)" : hslToCss(aHSL),
    accent2: SAT_GLOBAL < 0.12 ? "hsl(260 70% 55%)" : hslToCss(comp),
    text,
    muted,
    glassBg,
    glassBorder,
  };

  // Skip tiny updates to avoid flicker
  if (sampler.last) {
    const d = colorDelta(palette, sampler.last);
    if (d < deltaThreshold) return sampler.last;
  }
  sampler.last = palette;

  if (setVars) {
    const root = document.documentElement;
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent-2", palette.accent2);
    root.style.setProperty("--text", palette.text);
    root.style.setProperty("--muted", palette.muted);
    root.style.setProperty("--glass-bg", palette.glassBg);
    root.style.setProperty("--glass-border", palette.glassBorder);
  }
  return palette;
}

/* ----------------- helpers ----------------- */
function initKMeans(px, k) {
  const step = Math.max(1, Math.floor(px.length / k));
  return Array.from({ length: k }, (_, i) => px[i * step].slice());
}
function runKMeans(px, centers, w, iters) {
  const K = centers.length;
  const assign = new Array(px.length).fill(0);
  for (let it = 0; it < iters; it++) {
    // assign
    for (let i = 0; i < px.length; i++) {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < K; k++) {
        const d = dist2(px[i], centers[k]) / w[i];
        if (d < bestD) { bestD = d; best = k; }
      }
      assign[i] = best;
    }
    // update
    const sums = Array.from({ length: K }, () => [0, 0, 0, 0]); // r,g,b,weight
    for (let i = 0; i < px.length; i++) {
      const k = assign[i], ww = w[i];
      sums[k][0] += px[i][0] * ww;
      sums[k][1] += px[i][1] * ww;
      sums[k][2] += px[i][2] * ww;
      sums[k][3] += ww;
    }
    for (let k = 0; k < K; k++) {
      if (sums[k][3] > 0) {
        centers[k][0] = sums[k][0] / sums[k][3];
        centers[k][1] = sums[k][1] / sums[k][3];
        centers[k][2] = sums[k][2] / sums[k][3];
      }
    }
  }
  // package
  const clusters = Array.from({ length: K }, (_, k) => {
    const rgb = centers[k].map((x) => Math.round(x));
    const hsl = rgbToHsl(...rgb);
    return { centroid: { rgb, hsl }, weight: 0 };
  });
  for (let i = 0; i < px.length; i++) clusters[assign[i]].weight += w[i];
  return { clusters };
}

function dist2(a, b) { const dr = a[0]-b[0], dg = a[1]-b[1], db = a[2]-b[2]; return dr*dr + dg*dg + db*db; }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}
function hslToCss({ h, s, l }) { return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`; }
function relativeLuminance(r, g, b) {
  const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const R = f(r), G = f(g), B = f(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function colorDelta(a, b) {
  const toHslTriplet = (css) => {
    const m = css.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
    return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
  };
  const [h1, s1, l1] = toHslTriplet(a.accent);
  const [h2, s2, l2] = toHslTriplet(b.accent);
  return Math.abs(h1 - h2) + Math.abs(s1 - s2) + Math.abs(l1 - l2) + (a.text === b.text ? 0 : 50);
}
