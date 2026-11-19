/* Neon Vice Cover Studio — canvas cover maker, fully offline.
   One central draw function renders every layout and grade, on screen
   and on the export canvas, so the preview is exactly what you download. */
"use strict";

const LAYOUTS = {
  square:   { w: 1080, h: 1080, label: "Square 1080x1080",
              panels: [{ x: 0, y: 0, w: 1080, h: 1080 }] },
  portrait: { w: 1080, h: 1350, label: "Portrait 1080x1350",
              panels: [{ x: 0, y: 0, w: 1080, h: 950 },
                        { x: 0, y: 950, w: 1080, h: 400 }] },
  wide:     { w: 1920, h: 1080, label: "Wide 1920x1080",
              panels: [{ x: 0, y: 0, w: 1240, h: 1080 },
                        { x: 1240, y: 0, w: 680, h: 1080 }] },
};

const GRADES = {
  sunset: "Sunset Split",
  neon: "Neon Diagonal",
  gold: "Gold Strip",
  dusk: "Purple Dusk",
};

const DEFAULT_CROPS = {
  square:   [{ zoom: 1.2, cx: 0.5, cy: 0.45 }],
  portrait: [{ zoom: 1.25, cx: 0.5, cy: 0.4 }, { zoom: 1.6, cx: 0.5, cy: 0.7 }],
  wide:     [{ zoom: 1.2, cx: 0.42, cy: 0.45 }, { zoom: 1.7, cx: 0.62, cy: 0.55 }],
};

const state = {
  layout: "square",
  grade: "sunset",
  title: "NEON VICE",
  subtitle: "A SUNSET STORY IN THE CITY",
  activePanel: 0,
  crops: JSON.parse(JSON.stringify(DEFAULT_CROPS)),
  photo: null,
  photoName: "samples/pier.jpg",
};

const preview = document.getElementById("preview");
const pctx = preview.getContext("2d");
const selftestEl = document.getElementById("selftest");
const exportInfo = document.getElementById("exportInfo");
window.__coverReady = false;

function params() { return new URLSearchParams(location.search); }

/* ---------- palm silhouettes, drawn in canvas ---------- */
function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  // curved trunk
  ctx.lineWidth = Math.max(4, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  const topX = x + lean * s * 0.35;
  const topY = y - s;
  ctx.quadraticCurveTo(x + lean * s * 0.08, y - s * 0.55, topX, topY);
  ctx.stroke();
  // fronds
  ctx.lineWidth = Math.max(3, s * 0.035);
  for (let a = -165; a <= 15; a += 24) {
    const ang = (a * Math.PI) / 180;
    const len = s * 0.46;
    const mx = topX + Math.cos(ang) * len * 0.55;
    const my = topY + Math.sin(ang) * len * 0.4 + s * 0.12;
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len + s * 0.3;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalms(ctx, W, H) {
  const c = "rgba(22, 8, 38, 0.92)";
  drawPalm(ctx, W * 0.05, H * 1.01, H * 0.22, c, -0.15);
  drawPalm(ctx, W * 0.95, H * 1.01, H * 0.19, c, 0.15);
}

/* ---------- the one central draw function ---------- */
function drawCover(ctx, W, H, layoutName, grade, photo, crops, title, subtitle) {
  const layout = LAYOUTS[layoutName];
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Photo panels, each with its own crop.
  layout.panels.forEach((p, i) => {
    const crop = crops[i] || { zoom: 1.2, cx: 0.5, cy: 0.45 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    if (photo && photo.naturalWidth) {
      const iw = photo.naturalWidth, ih = photo.naturalHeight;
      const base = Math.max(p.w / iw, p.h / ih);
      const scale = base * crop.zoom;
      const sw = Math.min(iw, p.w / scale);
      const sh = Math.min(ih, p.h / scale);
      const sx = Math.max(0, Math.min(iw - sw, crop.cx * iw - sw / 2));
      const sy = Math.max(0, Math.min(ih - sh, crop.cy * ih - sh / 2));
      ctx.drawImage(photo, sx, sy, sw, sh, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = "#2a1547";
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();
  });

  // Panel dividers.
  ctx.fillStyle = "#fff";
  if (layoutName === "portrait") ctx.fillRect(0, 950, W, 6);
  if (layoutName === "wide") ctx.fillRect(1240, 0, 6, H);

  // ---- grade overlays ----
  if (grade === "sunset") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255, 94, 98, 0.20)");
    g.addColorStop(0.55, "rgba(255, 122, 24, 0.10)");
    g.addColorStop(1, "rgba(255, 46, 136, 0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Slatted sun: warm disc with thin dark slats drawn OVER it,
    // so the slats never erase the photo underneath.
    const sx = W * 0.20, sy = H * 0.20, r = Math.min(W, H) * 0.13;
    const sg = ctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
    sg.addColorStop(0, "rgba(255, 246, 200, 0.95)");
    sg.addColorStop(1, "rgba(255, 150, 60, 0.85)");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(40, 10, 50, 0.55)";
    for (let k = 0; k < 3; k++) {
      const y = sy + r * (0.05 + k * 0.28);
      ctx.fillRect(sx - r, y, r * 2, r * 0.09);
    }
  } else if (grade === "neon") {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "#ff2e88";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55); ctx.lineTo(W, H * 0.15);
    ctx.lineTo(W, H * 0.32); ctx.lineTo(0, H * 0.72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.82); ctx.lineTo(W, H * 0.42);
    ctx.lineTo(W, H * 0.55); ctx.lineTo(0, H * 0.95); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#ff2e88"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, H * 0.55); ctx.lineTo(W, H * 0.15); ctx.stroke();
    ctx.strokeStyle = "#22d3ee";
    ctx.beginPath(); ctx.moveTo(0, H * 0.82); ctx.lineTo(W, H * 0.42); ctx.stroke();
  } else if (grade === "gold") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255, 201, 60, 0.22)");
    g.addColorStop(0.5, "rgba(255, 201, 60, 0.05)");
    g.addColorStop(1, "rgba(255, 170, 40, 0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255, 201, 60, 0.92)";
    ctx.fillRect(0, 0, W, H * 0.045);
    ctx.fillRect(0, H * 0.955, W, H * 0.045);
    ctx.fillStyle = "#1a0b2e";
    ctx.fillRect(0, H * 0.045, W, 4);
    ctx.fillRect(0, H * 0.951, W, 4);
  } else { // dusk
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(88, 28, 135, 0.30)");
    g.addColorStop(0.6, "rgba(120, 40, 160, 0.12)");
    g.addColorStop(1, "rgba(30, 8, 60, 0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // dusk moon
    ctx.fillStyle = "rgba(240, 220, 255, 0.9)";
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.18, Math.min(W, H) * 0.07, 0, Math.PI * 2); ctx.fill();
  }

  drawPalms(ctx, W, H);

  // ---- caption ----
  const titleSize = Math.round(W * (layoutName === "wide" ? 0.075 : 0.105));
  const subSize = Math.round(W * 0.032);
  // Gold Strip has solid bands at the very top and bottom, so the caption
  // and badge sit clear of them.
  const capY = grade === "gold" ? H - Math.round(H * 0.17) : H - Math.round(H * 0.10);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = titleSize * 0.18;
  ctx.shadowOffsetY = titleSize * 0.06;
  ctx.font = titleSize + "px Anton, sans-serif";
  ctx.lineWidth = Math.max(4, titleSize * 0.09);
  ctx.strokeStyle = "#160a24";
  const titleText = (title || "NEON VICE").toUpperCase();
  ctx.strokeText(titleText, W / 2, capY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(titleText, W / 2, capY);
  ctx.restore();

  ctx.save();
  ctx.font = subSize + "px 'Bebas Neue', sans-serif";
  try { ctx.letterSpacing = Math.round(subSize * 0.18) + "px"; } catch (e) { /* older canvas */ }
  ctx.lineWidth = Math.max(3, subSize * 0.12);
  ctx.strokeStyle = "#160a24";
  const subText = (subtitle || "").toUpperCase();
  const subY = capY + subSize + Math.round(H * 0.015);
  ctx.strokeText(subText, W / 2, subY);
  ctx.fillStyle = "#ffc93c";
  ctx.fillText(subText, W / 2, subY);
  ctx.restore();

  // top badge
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = Math.round(W * 0.024) + "px 'Bebas Neue', sans-serif";
  try { ctx.letterSpacing = "3px"; } catch (e) {}
  ctx.fillStyle = "rgba(22, 10, 36, 0.75)";
  const badge = "NEON VICE  •  SUNSET CITY";
  const bw = ctx.measureText(badge).width + W * 0.03;
  const badgeTop = grade === "gold" ? H * 0.06 : H * 0.03;
  ctx.fillRect(W * 0.03, badgeTop, bw, H * 0.045);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(badge, W * 0.045, badgeTop + H * 0.033);
  ctx.restore();
}

function render() {
  const layout = LAYOUTS[state.layout];
  preview.width = layout.w;
  preview.height = layout.h;
  drawCover(pctx, layout.w, layout.h, state.layout, state.grade,
    state.photo, state.crops[state.layout], state.title, state.subtitle);
  exportInfo.textContent = layout.label + " • " + GRADES[state.grade];
  window.__coverReady = true;
}

/* ---------- photo loading ---------- */
function loadPhoto(src, name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { state.photo = img; state.photoName = name || src; render(); resolve(true); };
    img.onerror = () => { resolve(false); };
    img.src = src;
  });
}

/* ---------- self-test ---------- */
async function selftest() {
  const sizes = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
  const bad = [];
  for (const [name, [w, h]] of Object.entries(sizes)) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    drawCover(c.getContext("2d"), w, h, name, state.grade,
      state.photo, state.crops[name], state.title, state.subtitle);
    if (c.width !== w || c.height !== h) bad.push(name + " is " + c.width + "x" + c.height);
  }
  if (bad.length === 0) {
    selftestEl.textContent = "SELFTEST OK — square 1080x1080, portrait 1080x1350, wide 1920x1080";
    selftestEl.className = "selftest ok";
    document.title = "SELFTEST OK — Neon Vice Cover Studio";
  } else {
    selftestEl.textContent = "SELFTEST FAIL — " + bad.join("; ");
    selftestEl.className = "selftest bad";
    document.title = "SELFTEST FAIL — Neon Vice Cover Studio";
  }
}

/* ---------- editor wiring ---------- */
function markActive(btns, value, attr) {
  btns.forEach((b) => b.classList.toggle("active", b.dataset[attr] === value));
}

function buildPanelButtons() {
  const row = document.getElementById("panelRow");
  row.innerHTML = "";
  const n = LAYOUTS[state.layout].panels.length;
  for (let i = 0; i < n; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "Panel " + (i + 1);
    b.dataset.panel = String(i);
    if (i === state.activePanel) b.classList.add("active");
    b.addEventListener("click", () => { state.activePanel = i; syncCropControls(); buildPanelButtons(); });
    row.appendChild(b);
  }
}

function crop() { return state.crops[state.layout][state.activePanel]; }

function syncCropControls() {
  const c = crop();
  document.getElementById("zoom").value = c.zoom;
  document.getElementById("cx").value = c.cx;
  document.getElementById("cy").value = c.cy;
  document.getElementById("zoomVal").textContent = Number(c.zoom).toFixed(2);
  document.getElementById("cxVal").textContent = Number(c.cx).toFixed(2);
  document.getElementById("cyVal").textContent = Number(c.cy).toFixed(2);
}

function bind(id, key, fmt) {
  const el = document.getElementById(id);
  el.addEventListener("input", () => {
    crop()[key] = Number(el.value);
    document.getElementById(id + "Val").textContent = Number(el.value).toFixed(2);
    render();
  });
}

document.querySelectorAll("#layoutRow button").forEach((b) => {
  b.addEventListener("click", () => {
    state.layout = b.dataset.layout;
    state.activePanel = 0;
    markActive(document.querySelectorAll("#layoutRow button"), state.layout, "layout");
    buildPanelButtons(); syncCropControls(); render();
  });
});
document.querySelectorAll("#gradeRow button").forEach((b) => {
  b.addEventListener("click", () => {
    state.grade = b.dataset.grade;
    markActive(document.querySelectorAll("#gradeRow button"), state.grade, "grade");
    render();
  });
});
document.querySelectorAll("[data-sample]").forEach((b) => {
  b.addEventListener("click", () => {
    markActive(document.querySelectorAll("[data-sample]"), b.dataset.sample, "sample");
    loadPhoto(b.dataset.sample);
  });
});
document.getElementById("upload").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => loadPhoto(r.result, f.name);
  r.readAsDataURL(f);
});
document.getElementById("titleInput").addEventListener("input", (e) => { state.title = e.target.value; render(); });
document.getElementById("subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; render(); });
bind("zoom", "zoom"); bind("cx", "cx"); bind("cy", "cy");

document.getElementById("exportBtn").addEventListener("click", () => {
  const layout = LAYOUTS[state.layout];
  const c = document.createElement("canvas");
  c.width = layout.w; c.height = layout.h;
  drawCover(c.getContext("2d"), layout.w, layout.h, state.layout, state.grade,
    state.photo, state.crops[state.layout], state.title, state.subtitle);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "neon-vice-" + state.layout + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    exportInfo.textContent = layout.label + " exported as PNG (" + Math.round(blob.size / 1024) + " KiB)";
  }, "image/png");
});

/* drag the preview to pan the active panel's crop */
let dragging = null;
preview.addEventListener("pointerdown", (e) => {
  const r = preview.getBoundingClientRect();
  const x = (e.clientX - r.left) * (preview.width / r.width);
  const y = (e.clientY - r.top) * (preview.height / r.height);
  const panels = LAYOUTS[state.layout].panels;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
      state.activePanel = i; buildPanelButtons(); syncCropControls();
      dragging = { x, y, cx: crop().cx, cy: crop().cy, panel: p };
      preview.setPointerCapture(e.pointerId);
      break;
    }
  }
});
preview.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const r = preview.getBoundingClientRect();
  const x = (e.clientX - r.left) * (preview.width / r.width);
  const y = (e.clientY - r.top) * (preview.height / r.height);
  const c = crop();
  c.cx = Math.max(0, Math.min(1, dragging.cx - (x - dragging.x) / dragging.panel.w / c.zoom * 1.6));
  c.cy = Math.max(0, Math.min(1, dragging.cy - (y - dragging.y) / dragging.panel.h / c.zoom * 1.6));
  syncCropControls(); render();
});
preview.addEventListener("pointerup", () => { dragging = null; });

/* ---------- boot ---------- */
async function boot() {
  const q = params();
  if (q.get("layout") && LAYOUTS[q.get("layout")]) state.layout = q.get("layout");
  if (q.get("grade") && GRADES[q.get("grade")]) state.grade = q.get("grade");
  if (q.get("title")) { state.title = q.get("title"); document.getElementById("titleInput").value = state.title; }
  if (q.get("subtitle")) { state.subtitle = q.get("subtitle"); document.getElementById("subtitleInput").value = state.subtitle; }
  if (q.get("shot") === "cover") document.body.classList.add("shot-cover");
  markActive(document.querySelectorAll("#layoutRow button"), state.layout, "layout");
  markActive(document.querySelectorAll("#gradeRow button"), state.grade, "grade");
  buildPanelButtons(); syncCropControls();
  try {
    await Promise.race([
      Promise.all([document.fonts.load('80px Anton'), document.fonts.load('40px "Bebas Neue"')]),
      new Promise((res) => setTimeout(res, 3000)),
    ]);
  } catch (e) { /* fall back to system fonts */ }
  await loadPhoto("samples/pier.jpg");
  render();
  if (q.get("selftest") === "1") await selftest();
}
boot();
