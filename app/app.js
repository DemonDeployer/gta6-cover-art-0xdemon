// Neon Vice Cover Studio — cover engine + editor (classic script, offline only).
// Every photo is read on the user's machine (FileReader / local samples);
// nothing is uploaded and no network request is made at runtime.

(function () {
  'use strict';

  var canvas = document.getElementById('coverCanvas');
  var ctx = canvas.getContext('2d');
  var params = new URLSearchParams(window.location.search);

  // ---- state ---------------------------------------------------------------
  var photos = []; // { img: HTMLImageElement, name: string }
  var state = {
    layout: 'trio',
    grade: 'sunset',
    size: '1080x1080',
    caption: 'VICE NIGHTS',
    subtitle: 'a neon story in three panels',
    badge: 'EST. 2026',
    selected: 0,
  };
  // One transform per panel slot: which photo, zoom (1 = fit), pan offsets.
  var panels = [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
  ];

  var LAYOUTS = {
    trio: { count: 3, rects: [[0, 0, 1 / 3, 0.8], [1 / 3, 0, 1 / 3, 0.8], [2 / 3, 0, 1 / 3, 0.8]] },
    grid: { count: 4, rects: [[0, 0, 0.5, 0.4], [0.5, 0, 0.5, 0.4], [0, 0.4, 0.5, 0.4], [0.5, 0.4, 0.5, 0.4]] },
    hero: { count: 3, rects: [[0, 0, 0.62, 0.8], [0.62, 0, 0.38, 0.4], [0.62, 0.4, 0.38, 0.4]] },
  };
  var GRADES = {
    sunset: { top: '#ffb703', mid: '#ff7a18', bottom: '#ff2d78', wash: 'rgba(255,45,120,0.16)' },
    neon: { top: '#00e5ff', mid: '#ff2ec4', bottom: '#7b2fff', wash: 'rgba(255,46,196,0.18)' },
    purple: { top: '#c77dff', mid: '#7b2fff', bottom: '#ff5e8a', wash: 'rgba(123,47,255,0.18)' },
    gold: { top: '#ffe66d', mid: '#ffb703', bottom: '#fb8500', wash: 'rgba(251,133,0,0.16)' },
  };
  var GAP = 10;

  function layoutDef() { return LAYOUTS[state.layout]; }
  function panelCount() { return layoutDef().count; }

  // ---- drawing -------------------------------------------------------------
  function drawPhotoCover(c, img, px, py, pw, ph, t) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var base = Math.max(pw / iw, ph / ih) * t.zoom;
    var dw = iw * base, dh = ih * base;
    var dx = px + (pw - dw) / 2 + t.ox * pw;
    var dy = py + (ph - dh) / 2 + t.oy * ph;
    c.drawImage(img, dx, dy, dw, dh);
  }

  function applyGrade(c, px, py, pw, ph, g) {
    var grad = c.createLinearGradient(px, py, px, py + ph);
    grad.addColorStop(0, g.top);
    grad.addColorStop(0.55, g.mid);
    grad.addColorStop(1, g.bottom);
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.55;
    c.fillStyle = grad;
    c.fillRect(px, py, pw, ph);
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = 0.5;
    c.fillStyle = grad;
    c.fillRect(px, py, pw, ph);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = g.wash;
    c.fillRect(px, py, pw, ph);
    c.restore();
  }

  function drawGrainAndVignette(c, W, H) {
    var i, x, y;
    c.save();
    c.globalAlpha = 0.09;
    c.fillStyle = '#ffffff';
    for (i = 0; i < 900; i++) {
      x = Math.random() * W; y = Math.random() * H;
      c.fillRect(x, y, 1.6, 1.6);
    }
    c.globalAlpha = 0.10;
    c.fillStyle = '#000000';
    for (i = 0; i < 500; i++) {
      x = Math.random() * W; y = Math.random() * H;
      c.fillRect(x, y, 1.6, 1.6);
    }
    c.restore();
    var vg = c.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,2,20,0.5)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
  }

  function fitTitleFont(c, text, maxWidth, startPx) {
    var px = startPx;
    c.font = px + 'px Anton, sans-serif';
    while (px > 24 && c.measureText(text).width > maxWidth) {
      px -= 4;
      c.font = px + 'px Anton, sans-serif';
    }
    return px;
  }

  function drawCaptionBand(c, W, H) {
    var bandY = H * 0.8, bandH = H * 0.2;
    var bg = c.createLinearGradient(0, bandY, 0, H);
    bg.addColorStop(0, '#160a2e');
    bg.addColorStop(1, '#0a0416');
    c.fillStyle = bg;
    c.fillRect(0, bandY, W, bandH);
    c.fillStyle = '#ff2d78';
    c.fillRect(0, bandY, W, Math.max(4, H * 0.006));
    var title = (state.caption || 'VICE NIGHTS').toUpperCase();
    var size = fitTitleFont(c, title, W * 0.9, W * 0.105);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(255,45,120,0.55)';
    c.shadowBlur = W * 0.02;
    c.shadowOffsetY = H * 0.004;
    c.lineWidth = Math.max(3, W * 0.007);
    c.strokeStyle = '#160a2e';
    c.strokeText(title, W / 2, bandY + bandH * 0.42);
    var tg = c.createLinearGradient(0, bandY, 0, bandY + bandH * 0.7);
    tg.addColorStop(0, '#fff7ec');
    tg.addColorStop(1, '#ffb703');
    c.fillStyle = tg;
    c.fillText(title, W / 2, bandY + bandH * 0.42);
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.font = Math.round(H * 0.028) + 'px "Bebas Neue", sans-serif';
    c.fillStyle = '#00e5ff';
    c.fillText(state.subtitle || '', W / 2, bandY + bandH * 0.82);
    // Corner badge, top right.
    var badge = (state.badge || '').trim();
    if (badge) {
      c.save();
      c.translate(W * 0.94, H * 0.05);
      c.rotate(0.12);
      c.font = Math.round(W * 0.022) + 'px Anton, sans-serif';
      var bw = c.measureText(badge).width + W * 0.03;
      c.fillStyle = '#ff9f1c';
      c.strokeStyle = '#160a2e';
      c.lineWidth = 3;
      c.beginPath();
      c.rect(-bw / 2, -H * 0.018, bw, H * 0.036);
      c.fill();
      c.stroke();
      c.fillStyle = '#160a2e';
      c.textAlign = 'center';
      c.fillText(badge, 0, 1);
      c.restore();
    }
  }

  function drawCover(c, W, H) {
    c.fillStyle = '#0a0416';
    c.fillRect(0, 0, W, H);
    var def = layoutDef();
    var g = GRADES[state.grade] || GRADES.sunset;
    var i, r, px, py, pw, ph;
    for (i = 0; i < def.count; i++) {
      r = def.rects[i];
      px = r[0] * W + GAP / 2; py = r[1] * H + GAP / 2;
      pw = r[2] * W - GAP; ph = r[3] * H - GAP;
      c.save();
      c.beginPath();
      c.rect(px, py, pw, ph);
      c.clip();
      var photo = photos[panels[i].photo];
      if (photo) {
        drawPhotoCover(c, photo.img, px, py, pw, ph, panels[i]);
        applyGrade(c, px, py, pw, ph, g);
      } else {
        var sky = c.createLinearGradient(px, py, px, py + ph);
        sky.addColorStop(0, g.top); sky.addColorStop(1, g.bottom);
        c.fillStyle = sky;
        c.fillRect(px, py, pw, ph);
        c.fillStyle = 'rgba(255,247,236,0.9)';
        c.font = Math.round(pw * 0.09) + 'px "Bebas Neue", sans-serif';
        c.textAlign = 'center';
        c.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
      }
      c.restore();
      c.strokeStyle = 'rgba(255,247,236,0.85)';
      c.lineWidth = Math.max(2, W * 0.002);
      c.strokeRect(px, py, pw, ph);
    }
    // Outer frame.
    c.strokeStyle = '#fff7ec';
    c.lineWidth = Math.max(4, W * 0.006);
    c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth);
    drawGrainAndVignette(c, W, H);
    drawCaptionBand(c, W, H);
  }

  function renderPreview() {
    canvas.width = 1080;
    canvas.height = 1080;
    drawCover(ctx, 1080, 1080);
  }

  // ---- photos --------------------------------------------------------------
  function addPhotoFile(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          photos.push({ img: img, name: file.name || 'photo' });
          resolve();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function loadSample(path, name) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { photos.push({ img: img, name: name }); resolve(); };
      img.onerror = reject;
      img.src = path;
    });
  }

  function refreshThumbs() {
    var row = document.getElementById('photoThumbs');
    row.innerHTML = '';
    photos.forEach(function (p, idx) {
      var thumb = document.createElement('img');
      thumb.src = p.img.src;
      thumb.alt = p.name;
      thumb.title = p.name;
      if (panels[state.selected] && panels[state.selected].photo === idx) thumb.classList.add('active');
      thumb.addEventListener('click', function () {
        panels[state.selected].photo = idx;
        refreshThumbs();
        renderPreview();
      });
      row.appendChild(thumb);
    });
    var label = document.getElementById('panelLabel');
    if (label) {
      var p = panels[state.selected];
      label.textContent = 'Panel ' + (state.selected + 1) + ' — photo ' + (p.photo + 1) + ' of ' + photos.length + ', zoom ' + Math.round(p.zoom * 100) + '%';
    }
  }

  function refreshPanelStrip() {
    var strip = document.getElementById('panelStrip');
    strip.innerHTML = '';
    for (var i = 0; i < panelCount(); i++) {
      (function (idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-chip' + (state.selected === idx ? ' active' : '');
        btn.textContent = 'Panel ' + (idx + 1);
        btn.addEventListener('click', function () {
          state.selected = idx;
          document.getElementById('zoomInput').value = Math.round(panels[idx].zoom * 100);
          document.getElementById('zoomValue').textContent = Math.round(panels[idx].zoom * 100) + '%';
          refreshPanelStrip();
          refreshThumbs();
        });
        strip.appendChild(btn);
      })(i);
    }
  }

  // ---- export --------------------------------------------------------------
  function exportCover() {
    var parts = state.size.split('x');
    var W = parseInt(parts[0], 10), H = parseInt(parts[1], 10);
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    drawCover(off.getContext('2d'), W, H);
    var note = document.getElementById('exportNote');
    off.toBlob(function (blob) {
      if (!blob) { if (note) note.textContent = 'Export failed — try again.'; return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'neon-vice-cover-' + state.size + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      if (note) note.textContent = 'Exported ' + state.size + ' PNG — check your downloads.';
    }, 'image/png');
  }

  // ---- pointer drag / wheel zoom on the preview ----------------------------
  function panelAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) / rect.width;
    var y = (clientY - rect.top) / rect.height;
    var def = layoutDef();
    for (var i = 0; i < def.count; i++) {
      var r = def.rects[i];
      if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return i;
    }
    return -1;
  }

  var dragging = null;
  canvas.addEventListener('pointerdown', function (e) {
    var idx = panelAt(e.clientX, e.clientY);
    if (idx < 0) return;
    state.selected = idx;
    refreshPanelStrip();
    refreshThumbs();
    dragging = { idx: idx, x: e.clientX, y: e.clientY, ox: panels[idx].ox, oy: panels[idx].oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var rect = canvas.getBoundingClientRect();
    var def = layoutDef();
    var r = def.rects[dragging.idx];
    panels[dragging.idx].ox = dragging.ox + (e.clientX - dragging.x) / rect.width / r[2];
    panels[dragging.idx].oy = dragging.oy + (e.clientY - dragging.y) / rect.height / r[3];
    renderPreview();
  });
  canvas.addEventListener('pointerup', function () { dragging = null; });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var t = panels[state.selected];
    t.zoom = Math.min(2.6, Math.max(1, t.zoom - e.deltaY * 0.001));
    document.getElementById('zoomInput').value = Math.round(t.zoom * 100);
    document.getElementById('zoomValue').textContent = Math.round(t.zoom * 100) + '%';
    refreshThumbs();
    renderPreview();
  }, { passive: false });

  // ---- wire up controls -----------------------------------------------------
  document.getElementById('photoInput').addEventListener('change', function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    Promise.all(files.map(addPhotoFile)).then(function () {
      refreshThumbs();
      renderPreview();
    });
  });
  document.querySelectorAll('[data-sample]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadSample(btn.getAttribute('data-sample'), btn.textContent).then(function () {
        refreshThumbs();
        renderPreview();
      });
    });
  });
  function bindChoice(rowId, attr, apply) {
    document.getElementById(rowId).addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-' + attr + ']');
      if (!btn) return;
      document.querySelectorAll('#' + rowId + ' button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      apply(btn.getAttribute('data-' + attr));
    });
  }
  bindChoice('layoutRow', 'layout', function (v) {
    state.layout = v;
    if (state.selected >= panelCount()) state.selected = 0;
    refreshPanelStrip();
    renderPreview();
  });
  bindChoice('gradeRow', 'grade', function (v) { state.grade = v; renderPreview(); });
  bindChoice('sizeRow', 'size', function (v) { state.size = v; });
  document.getElementById('captionInput').addEventListener('input', function (e) { state.caption = e.target.value; renderPreview(); });
  document.getElementById('subtitleInput').addEventListener('input', function (e) { state.subtitle = e.target.value; renderPreview(); });
  document.getElementById('badgeInput').addEventListener('input', function (e) { state.badge = e.target.value; renderPreview(); });
  document.getElementById('zoomInput').addEventListener('input', function (e) {
    panels[state.selected].zoom = Number(e.target.value) / 100;
    document.getElementById('zoomValue').textContent = e.target.value + '%';
    refreshThumbs();
    renderPreview();
  });
  document.getElementById('fillAllBtn').addEventListener('click', function () {
    var src = panels[state.selected].photo;
    panels.forEach(function (p) { p.photo = src; });
    refreshThumbs();
    renderPreview();
  });
  document.getElementById('nextPhotoBtn').addEventListener('click', function () {
    if (!photos.length) return;
    var p = panels[state.selected];
    p.photo = (p.photo + 1) % photos.length;
    refreshThumbs();
    renderPreview();
  });
  document.getElementById('resetPanelBtn').addEventListener('click', function () {
    var p = panels[state.selected];
    p.ox = 0; p.oy = 0; p.zoom = 1;
    document.getElementById('zoomInput').value = 100;
    document.getElementById('zoomValue').textContent = '100%';
    refreshThumbs();
    renderPreview();
  });
  document.getElementById('exportBtn').addEventListener('click', exportCover);

  // ---- shot mode (for screenshots) + startup --------------------------------
  function applyParams() {
    if (params.get('layout')) state.layout = params.get('layout');
    if (params.get('grade')) state.grade = params.get('grade');
    if (params.get('caption')) state.caption = params.get('caption');
    if (params.get('size')) state.size = params.get('size');
    var cap = document.getElementById('captionInput');
    if (cap) cap.value = state.caption;
    document.querySelectorAll('#layoutRow button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-layout') === state.layout); });
    document.querySelectorAll('#gradeRow button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-grade') === state.grade); });
    document.querySelectorAll('#sizeRow button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-size') === state.size); });
  }

  function markReady() { window.__shotReady = true; }

  function start() {
    applyParams();
    var shot = params.get('shot');
    var photo = params.get('photo') || 'pier';
    var samplePath = 'samples/' + photo + '.jpg';
    refreshPanelStrip();
    var drawOnce = function () {
      if (shot === 'cover') {
        document.body.classList.add('shot-cover');
        var parts = state.size.split('x');
        canvas.width = parseInt(parts[0], 10);
        canvas.height = parseInt(parts[1], 10);
        drawCover(ctx, canvas.width, canvas.height);
      } else {
        renderPreview();
      }
      markReady();
    };
    var afterFonts = function () {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { drawOnce(); });
      } else {
        drawOnce();
      }
    };
    if (shot) {
      loadSample(samplePath, photo).then(function () {
        // Stagger each panel's zoom a little in shot mode so the panels
        // read as distinct crops of the one sample photo, not clones.
        panels.forEach(function (p, i) { p.photo = i % photos.length; p.zoom = 1 + i * 0.18; });
        refreshThumbs();
        afterFonts();
      }).catch(function () { afterFonts(); });
    } else {
      loadSample('samples/pier.jpg', 'pier').then(function () {
        refreshThumbs();
        afterFonts();
      }).catch(afterFonts);
      renderPreview();
    }
  }

  start();
})();
