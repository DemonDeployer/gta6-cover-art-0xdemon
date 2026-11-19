// Neon Vice Cover Studio — turns a photo + caption into multi-panel poster cover art.
// Everything is drawn on canvas, locally, with original art: no Rockstar logos, artwork
// or fonts. Fonts are Anton + Bebas Neue (SIL OFL) under app/fonts/.

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const sizeLabel = document.getElementById('size-label');

/** The whole cover state: photos, crops, layout, grade, words and effects. */
const state = {
  photos: [null, null, null],
  crops: [
    { zoom: 100, px: 0, py: 0 },
    { zoom: 100, px: 0, py: 0 },
    { zoom: 100, px: 0, py: 0 },
  ],
  activePanel: 0,
  layout: 'split',
  grade: 'sunset',
  caption: 'VICE NIGHTS',
  subtitle: 'SUNSET BOULEVARD',
  captionStyle: 'sunset',
  capSize: 100,
  size: { w: 1080, h: 1080, label: '1080 × 1080' },
  palms: true,
  sun: true,
  halftone: true,
  vignette: true,
  frame: true,
};

const GRADES = {
  sunset: { filter: 'saturate(1.3) contrast(1.06)', sky: ['#2b1055', '#c62b78', '#ff7842', '#ffc93c'], tint: 'rgba(255, 110, 60, 0.16)', neon: '#ff2e88' },
  neon: { filter: 'saturate(1.65) contrast(1.1) hue-rotate(-14deg)', sky: ['#160b3a', '#7a1fa2', '#ff2e88', '#ff7ad9'], tint: 'rgba(255, 46, 136, 0.2)', neon: '#37e6ff' },
  teal: { filter: 'saturate(1.15) contrast(1.08) hue-rotate(16deg)', sky: ['#041e2e', '#0b5e6e', '#19c2a6', '#7ef0d4'], tint: 'rgba(25, 194, 166, 0.16)', neon: '#7ef0d4' },
  gold: { filter: 'saturate(1.4) contrast(1.05) sepia(0.28)', sky: ['#3a1c05', '#a34d12', '#ff9a2f', '#ffe08a'], tint: 'rgba(255, 170, 40, 0.18)', neon: '#ffc93c' },
};

const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080', file: 'neon-vice-cover-1080x1080.png' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350', file: 'neon-vice-cover-1080x1350.png' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080', file: 'neon-vice-cover-1920x1080.png' },
};

/** Deterministic pseudo-random from a seed, so a panel's skyline is stable. */
function seededRandom(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** The three panel shapes for a layout, as paths of [x, y] points in cover space. */
export function panelShapes(layout, W, H) {
  if (layout === 'diagonal') {
    return [
      [[0, 0], [W * 0.42, 0], [W * 0.18, H], [0, H]],
      [[W * 0.42, 0], [W * 0.72, 0], [W * 0.5, H], [W * 0.18, H]],
      [[W * 0.72, 0], [W, 0], [W, H], [W * 0.5, H]],
    ];
  }
  if (layout === 'strip') {
    return [
      [[0, 0], [W / 3, 0], [W / 3, H], [0, H]],
      [[W / 3, 0], [(2 * W) / 3, 0], [(2 * W) / 3, H], [W / 3, H]],
      [[(2 * W) / 3, 0], [W, 0], [W, H], [(2 * W) / 3, H]],
    ];
  }
  return [
    [[0, 0], [W, 0], [W, H * 0.6], [0, H * 0.6]],
    [[0, H * 0.6], [W / 2, H * 0.6], [W / 2, H], [0, H]],
    [[W / 2, H * 0.6], [W, H * 0.6], [W, H], [W / 2, H]],
  ];
}

/** Bounding box of a panel path. */
function panelBounds(shape) {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

/** Clip the context to a panel path. */
function clipPanel(ctx, shape) {
  ctx.beginPath();
  ctx.moveTo(shape[0][0], shape[0][1]);
  for (let i = 1; i < shape.length; i++) ctx.lineTo(shape[i][0], shape[i][1]);
  ctx.closePath();
  ctx.clip();
}

/** A palm silhouette: trunk plus six drooping fronds. */
export function drawPalmSilhouette(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.02, y - s * 0.6, x + s * 0.1, y - s);
  ctx.stroke();
  const tx = x + s * 0.1;
  const ty = y - s;
  for (const deg of [-155, -125, -98, -70, -42, -14]) {
    const a = (deg * Math.PI) / 180;
    const ex = tx + Math.cos(a) * s * 0.6;
    const ey = ty + Math.sin(a) * s * 0.42 + s * 0.16;
    const mx = tx + Math.cos(a) * s * 0.32;
    const my = ty + Math.sin(a) * s * 0.24 - s * 0.12;
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** A procedural sunset city scene, drawn when a panel has no photo yet. */
export function drawSunsetScene(ctx, box, gradeKey, seed) {
  const g = GRADES[gradeKey];
  const { x, y, w, h } = box;
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  g.sky.forEach((c, i) => sky.addColorStop(i / (g.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Sun disc with a soft glow.
  const cx = x + w * 0.5;
  const cy = y + h * 0.42;
  const r = Math.min(w, h) * 0.2;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, 'rgba(255, 220, 130, 0.55)');
  glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffe28a';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Skyline with lit windows.
  const rnd = seededRandom(seed + 11);
  let bx = x;
  const base = y + h * 0.78;
  ctx.fillStyle = 'rgba(16, 6, 34, 0.92)';
  while (bx < x + w) {
    const bw = w * (0.12 + rnd() * 0.16);
    const bh = h * (0.22 + rnd() * 0.34);
    ctx.fillRect(bx, base - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 214, 110, 0.85)';
    for (let wy = base - bh + h * 0.04; wy < base - h * 0.03; wy += h * 0.07) {
      for (let wx = bx + w * 0.02; wx < bx + bw - w * 0.02; wx += w * 0.05) {
        if (rnd() < 0.4) ctx.fillRect(wx, wy, w * 0.02, h * 0.025);
      }
    }
    ctx.fillStyle = 'rgba(16, 6, 34, 0.92)';
    bx += bw + w * 0.015;
  }
  // Sea / street reflection.
  ctx.fillStyle = 'rgba(20, 8, 40, 0.9)';
  ctx.fillRect(x, base, w, y + h - base);
  ctx.fillStyle = 'rgba(255, 200, 110, 0.5)';
  for (let i = 0; i < 8; i++) {
    const ry = base + ((y + h - base) * (i + 1)) / 9;
    const rw = w * (0.3 - i * 0.02);
    ctx.fillRect(cx - rw / 2, ry, rw, Math.max(1, h * 0.004));
  }
  drawPalmSilhouette(ctx, x + w * 0.08, base + (y + h - base) * 0.4, h * 0.34, 'rgba(10, 3, 22, 0.95)');
  drawPalmSilhouette(ctx, x + w * 0.92, base + (y + h - base) * 0.4, h * 0.3, 'rgba(10, 3, 22, 0.95)');
}

/** Draw one photo into a panel with cover-fit, zoom and pan. */
export function drawPhotoPanel(ctx, shape, img, crop, gradeKey) {
  const box = panelBounds(shape);
  ctx.save();
  clipPanel(ctx, shape);
  const base = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const scale = base * (crop.zoom / 100);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = (crop.px / 100) * Math.max(0, (pw - box.w) / 2);
  const dy = (crop.py / 100) * Math.max(0, (ph - box.h) / 2);
  ctx.filter = GRADES[gradeKey].filter;
  ctx.drawImage(img, box.x + (box.w - pw) / 2 + dx, box.y + (box.h - ph) / 2 + dy, pw, ph);
  ctx.filter = 'none';
  // Warm grade wash so photos sit in the same sunset world.
  ctx.fillStyle = GRADES[gradeKey].tint;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** Retro striped neon sun, drawn over the hero panel's sky.
 *  The disc is painted on an offscreen canvas first: its slats erase only the sun. */
export function drawNeonSun(ctx, cx, cy, r, color) {
  const off = document.createElement('canvas');
  off.width = Math.ceil(r * 4);
  off.height = Math.ceil(r * 4);
  const o = off.getContext('2d');
  const ox = r * 2;
  const oy = r * 2;
  const glow = o.createRadialGradient(ox, oy, r * 0.1, ox, oy, r * 2);
  glow.addColorStop(0, 'rgba(255, 122, 47, 0.5)');
  glow.addColorStop(1, 'rgba(255, 122, 47, 0)');
  o.fillStyle = glow;
  o.fillRect(0, 0, off.width, off.height);
  const grad = o.createLinearGradient(0, oy - r, 0, oy + r);
  grad.addColorStop(0, '#ffc93c');
  grad.addColorStop(0.55, '#ff7a2f');
  grad.addColorStop(1, '#ff2e88');
  o.fillStyle = grad;
  o.beginPath();
  o.arc(ox, oy, r, 0, Math.PI * 2);
  o.fill();
  // Retro slats cut across the lower half of the disc only.
  o.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 4; i++) {
    const sy = oy + r * (0.05 + i * 0.22);
    o.fillRect(ox - r, sy, r * 2, r * (0.05 + i * 0.02));
  }
  o.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, cx - r * 2, cy - r * 2);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Halftone dots fading down from the top of the cover. */
function drawHalftone(ctx, W, H) {
  const step = Math.max(14, W * 0.018);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (let yy = step / 2; yy < H * 0.3; yy += step) {
    const fade = 1 - yy / (H * 0.3);
    for (let xx = step / 2; xx < W; xx += step) {
      const r = Math.max(0.6, step * 0.12 * fade);
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Soft dark vignette around the edges. */
function drawVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(10, 4, 20, 0)');
  v.addColorStop(1, 'rgba(10, 4, 20, 0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** The big caption: subtitle above, title below, tilted a touch like a poster. */
export function drawCaption(ctx, W, H, st) {
  const title = st.caption.trim().toUpperCase();
  const sub = st.subtitle.trim().toUpperCase();
  if (!title && !sub) return;
  const bandH = H * 0.24;
  const bandY = H - bandH;
  ctx.save();
  // Dark band so lettering reads on any photo.
  const band = ctx.createLinearGradient(0, bandY - H * 0.04, 0, H);
  band.addColorStop(0, 'rgba(12, 4, 24, 0)');
  band.addColorStop(0.45, 'rgba(12, 4, 24, 0.55)');
  band.addColorStop(1, 'rgba(12, 4, 24, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - H * 0.04, W, bandH + H * 0.04);
  ctx.translate(W / 2, H - H * 0.055);
  ctx.rotate(-0.03);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let size = H * 0.115 * (st.capSize / 100);
  if (title) {
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    try { ctx.letterSpacing = `${size * 0.02}px`; } catch { /* older canvas */ }
    while (ctx.measureText(title).width > W * 0.92 && size > H * 0.03) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    if (st.captionStyle === 'sunset') {
      const fill = ctx.createLinearGradient(0, -size, 0, 0);
      fill.addColorStop(0, '#fff7d6');
      fill.addColorStop(0.45, '#ffc93c');
      fill.addColorStop(1, '#ff2e88');
      ctx.fillStyle = fill;
      ctx.lineWidth = size * 0.09;
      ctx.strokeStyle = '#160a24';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, 0, 0);
      ctx.fillText(title, 0, 0);
    } else if (st.captionStyle === 'neon') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.35;
      ctx.fillText(title, 0, 0);
      ctx.shadowBlur = size * 0.12;
      ctx.strokeStyle = '#37e6ff';
      ctx.lineWidth = size * 0.035;
      ctx.strokeText(title, 0, 0);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = size * 0.08;
      ctx.strokeStyle = 'rgba(12, 4, 24, 0.9)';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = size * 0.12;
      ctx.strokeText(title, 0, 0);
      ctx.fillText(title, 0, 0);
      ctx.shadowBlur = 0;
    }
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (sub) {
    const subSize = Math.max(H * 0.02, size * 0.24);
    ctx.font = `${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    try { ctx.letterSpacing = `${subSize * 0.42}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(sub, 0, title ? -size * 1.08 : 0);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.restore();
}

/** Draw the whole cover onto ctx at W x H. The preview and the PNG export share it. */
export function drawCover(ctx, W, H, st) {
  const g = GRADES[st.grade];
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1c0b2e';
  ctx.fillRect(0, 0, W, H);
  const shapes = panelShapes(st.layout, W, H);
  shapes.forEach((shape, i) => {
    const img = st.photos[i] || st.photos[0];
    if (img) drawPhotoPanel(ctx, shape, img, st.crops[i], st.grade);
    else {
      ctx.save();
      clipPanel(ctx, shape);
      drawSunsetScene(ctx, panelBounds(shape), st.grade, i * 7 + 3);
      ctx.restore();
    }
  });
  // Neon seams between panels.
  if (st.frame) {
    ctx.save();
    ctx.strokeStyle = g.neon;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.shadowColor = g.neon;
    ctx.shadowBlur = W * 0.012;
    shapes.forEach((shape) => {
      ctx.beginPath();
      ctx.moveTo(shape[0][0], shape[0][1]);
      for (let i = 1; i < shape.length; i++) ctx.lineTo(shape[i][0], shape[i][1]);
      ctx.closePath();
      ctx.stroke();
    });
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeRect(W * 0.012, H * 0.012, W * 0.976, H * 0.976);
    ctx.restore();
  }
  // Retro sun over the hero panel's sky, palms along its foot.
  const hero = panelBounds(shapes[0]);
  if (st.sun && st.layout !== 'strip') {
    ctx.save();
    clipPanel(ctx, shapes[0]);
    drawNeonSun(ctx, hero.x + hero.w * 0.72, hero.y + hero.h * 0.34, Math.min(hero.w, hero.h) * 0.17, g.neon);
    ctx.restore();
  }
  if (st.palms) {
    ctx.save();
    clipPanel(ctx, shapes[0]);
    const py = hero.y + hero.h * 0.98;
    drawPalmSilhouette(ctx, hero.x + hero.w * 0.06, py, hero.h * 0.3, 'rgba(8, 2, 18, 0.9)');
    drawPalmSilhouette(ctx, hero.x + hero.w * 0.94, py, hero.h * 0.26, 'rgba(8, 2, 18, 0.9)');
    ctx.restore();
  }
  if (st.halftone) drawHalftone(ctx, W, H);
  // Sticker badge, top-left — kept clear of the edge so it never clips.
  const bs = Math.max(18, W * 0.052);
  ctx.save();
  ctx.translate(W * 0.115, H * 0.055);
  ctx.rotate(-0.1);
  ctx.fillStyle = '#ffc93c';
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = Math.max(2, W * 0.003);
  const bw = bs * 3.1;
  const bh = bs * 0.95;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#160a24';
  ctx.font = `${bs * 0.42}px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${bs * 0.06}px`; } catch { /* older canvas */ }
  ctx.fillText('★ NEON VICE ★', 0, bs * 0.03);
  ctx.restore();
  drawCaption(ctx, W, H, st);
  if (st.vignette) drawVignette(ctx, W, H);
  ctx.restore();
}

/** Size the preview canvas to the chosen export aspect and redraw. */
function redraw() {
  const { w, h, label } = state.size;
  const scale = Math.min(900 / w, 900 / h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  sizeLabel.textContent = label;
  drawCover(canvas.getContext('2d'), canvas.width, canvas.height, state);
}

/** Render the cover at exact export size and download it as a PNG. */
export function exportCover(sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  state.size = size;
  redraw();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = size.file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved ${size.file} (${size.w} × ${size.h} PNG).`;
  }, 'image/png');
}

/** Load an image element from a URL (sample) or an object URL (upload). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function setPhoto(index, url) {
  try {
    state.photos[index] = await loadImage(url);
    state.crops[index] = { zoom: 100, px: 0, py: 0 };
    syncCropInputs();
    redraw();
  } catch {
    statusEl.textContent = 'That photo could not be loaded.';
  }
}

function syncCropInputs() {
  const c = state.crops[state.activePanel];
  document.getElementById('zoom').value = c.zoom;
  document.getElementById('zoom-val').textContent = `${c.zoom}%`;
  document.getElementById('pan-x').value = c.px;
  document.getElementById('pan-y').value = c.py;
}

/** Wire every control to the state and redraw on change. */
function wireControls() {
  document.getElementById('photo-all').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    for (let i = 0; i < 3; i++) await setPhoto(i, url);
    statusEl.textContent = 'One photo in every panel — pick a panel above to crop it differently.';
  });
  document.querySelectorAll('.photo-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) setPhoto(Number(input.dataset.panel), URL.createObjectURL(file));
    });
  });
  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPhoto(Number(btn.dataset.panel), `samples/${btn.dataset.sample}.jpg`));
  });
  document.getElementById('sample-set').addEventListener('click', async () => {
    await setPhoto(0, 'samples/pier.jpg');
    await setPhoto(1, 'samples/boulevard.jpg');
    await setPhoto(2, 'samples/pier.jpg');
    statusEl.textContent = 'Sample photos loaded — swap in your own any time.';
  });
  document.getElementById('active-panel').addEventListener('change', (e) => {
    state.activePanel = Number(e.target.value);
    syncCropInputs();
  });
  const crop = (key) => (e) => {
    state.crops[state.activePanel][key] = Number(e.target.value);
    if (key === 'zoom') document.getElementById('zoom-val').textContent = `${e.target.value}%`;
    redraw();
  };
  document.getElementById('zoom').addEventListener('input', crop('zoom'));
  document.getElementById('pan-x').addEventListener('input', crop('px'));
  document.getElementById('pan-y').addEventListener('input', crop('py'));
  document.getElementById('reset-crop').addEventListener('click', () => {
    state.crops[state.activePanel] = { zoom: 100, px: 0, py: 0 };
    syncCropInputs();
    redraw();
  });
  document.querySelectorAll('.layout-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      state.layout = btn.dataset.layout;
      redraw();
    });
  });
  document.querySelectorAll('.grade-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.grade-btn').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      state.grade = btn.dataset.grade;
      redraw();
    });
  });
  document.querySelectorAll('.style-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.style-btn').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      state.captionStyle = btn.dataset.style;
      redraw();
    });
  });
  for (const [id, key] of [['opt-palms', 'palms'], ['opt-sun', 'sun'], ['opt-halftone', 'halftone'], ['opt-vignette', 'vignette'], ['opt-frame', 'frame']]) {
    document.getElementById(id).addEventListener('change', (e) => {
      state[key] = e.target.checked;
      redraw();
    });
  }
  document.getElementById('caption').addEventListener('input', (e) => {
    state.caption = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('cap-size').addEventListener('input', (e) => {
    state.capSize = Number(e.target.value);
    document.getElementById('cap-size-val').textContent = `${e.target.value}%`;
    redraw();
  });
  document.getElementById('export-square').addEventListener('click', () => exportCover('square'));
  document.getElementById('export-portrait').addEventListener('click', () => exportCover('portrait'));
  document.getElementById('export-wide').addEventListener('click', () => exportCover('wide'));

  // Drag on the preview to pan the active panel's photo.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, px: state.crops[state.activePanel].px, py: state.crops[state.activePanel].py };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const c = state.crops[state.activePanel];
    c.px = Math.max(-100, Math.min(100, drag.px + ((e.clientX - drag.x) / rect.width) * 200));
    c.py = Math.max(-100, Math.min(100, drag.py + ((e.clientY - drag.y) / rect.height) * 200));
    syncCropInputs();
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
}

/** Fixed scenes for screenshots: ?shot=cover shows one exported cover full-bleed,
 *  ?shot=editor shows the editor with sample photos loaded. Sets window.__shotReady. */
export async function runShotScene(query) {
  const shot = query.get('shot');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption')) {
    state.caption = query.get('caption');
    document.getElementById('caption').value = state.caption;
  }
  if (query.get('subtitle')) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }
  const photo = query.get('photo') ?? 'pier';
  await setPhoto(0, `samples/${photo}.jpg`);
  await setPhoto(1, `samples/${photo === 'pier' ? 'boulevard' : 'pier'}.jpg`);
  await setPhoto(2, `samples/${photo}.jpg`);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = (query.get('size') ?? '1080x1080').split('x').map(Number);
    if (size.length === 2 && size.every((n) => Number.isFinite(n) && n > 0)) {
      state.size = { w: size[0], h: size[1], label: `${size[0]} × ${size[1]}` };
      canvas.width = size[0];
      canvas.height = size[1];
      drawCover(canvas.getContext('2d'), size[0], size[1], state);
    } else {
      redraw();
    }
  } else {
    redraw();
  }
  await document.fonts.ready;
  redraw();
  if (shot === 'cover') {
    const size = state.size;
    canvas.width = size.w;
    canvas.height = size.h;
    drawCover(canvas.getContext('2d'), size.w, size.h, state);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Test hook (?selftest=1): render every export size offscreen and report exact dims. */
export function runSelfTest() {
  const results = Object.entries(EXPORT_SIZES).map(([key, size]) => {
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off.getContext('2d'), size.w, size.h, state);
    return { key, w: off.width, h: off.height, exact: off.width === size.w && off.height === size.h };
  });
  const el = document.getElementById('selftest');
  el.hidden = false;
  el.textContent = JSON.stringify(results);
  document.title = results.every((r) => r.exact) ? 'SELFTEST OK' : 'SELFTEST FAIL';
  return results;
}

wireControls();
const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  runShotScene(params);
} else {
  // Load the bundled fonts before the first paint so lettering is exact.
  Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('40px "Bebas Neue"'),
  ]).catch(() => {}).finally(() => redraw());
  redraw();
  if (params.get('selftest') === '1') {
    document.fonts.ready.then(() => {
      redraw();
      runSelfTest();
    });
  }
}
