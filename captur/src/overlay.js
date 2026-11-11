'use strict';
// Écran de sélection : l'image figée de l'écran, assombrie, avec la zone choisie en clair.
const img = document.getElementById('shot');
const layer = document.getElementById('layer');
const ctx = layer.getContext('2d');
const hint = document.getElementById('hint');

let displayId = null;
let mode = 'image';
let wins = [];
let scale = 1; // pixels réels par pixel affiché
let mouse = null;
let drag = null;
let hover = null;
let finished = false;
let frame = 0;

const W = () => window.innerWidth;
const H = () => window.innerHeight;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  layer.width = Math.round(W() * dpr);
  layer.height = Math.round(H() * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function normRect(d) {
  const x0 = Math.max(0, Math.min(d.x0, d.x1));
  const y0 = Math.max(0, Math.min(d.y0, d.y1));
  const x1 = Math.min(W(), Math.max(d.x0, d.x1));
  const y1 = Math.min(H(), Math.max(d.y0, d.y1));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function updateHover() {
  hover = null;
  if (!mouse) return;
  hover = wins.find((r) => mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h)
    || { x: 0, y: 0, w: W(), h: H() };
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; draw(); });
}

function label(text, x, y) {
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  const h = 22;
  let lx = x, ly = y - h - 6;
  if (ly < 4) ly = y + 6;
  if (lx + w > W() - 4) lx = W() - w - 4;
  ctx.fillStyle = 'rgba(20,22,30,0.9)';
  ctx.beginPath();
  ctx.roundRect(lx, ly, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, lx + 7, ly + h / 2 + 0.5);
}

function drawMagnifier() {
  if (!mouse || !img.naturalWidth) return;
  const size = 132, cells = 15;
  let bx = mouse.x + 24, by = mouse.y + 24;
  if (bx + size > W() - 8) bx = mouse.x - 24 - size;
  if (by + size + 26 > H() - 8) by = mouse.y - 24 - size - 26;
  const sx = mouse.x * scale - cells / 2;
  const sy = mouse.y * scale - cells / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, by, size, size, 10);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(bx, by, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, cells, cells, bx, by, size, size);
  const cell = size / cells;
  ctx.strokeStyle = 'rgba(80,170,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx + cell * Math.floor(cells / 2), by + cell * Math.floor(cells / 2), cell, cell);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, size, size, 10);
  ctx.stroke();
  const text = `${Math.round(mouse.x * scale)}, ${Math.round(mouse.y * scale)}`;
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(20,22,30,0.9)';
  ctx.beginPath();
  ctx.roundRect(bx, by + size + 4, size, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + size / 2, by + size + 15.5);
  ctx.textAlign = 'left';
}

function draw() {
  ctx.clearRect(0, 0, W(), H());
  ctx.fillStyle = 'rgba(8,10,18,0.5)';
  ctx.fillRect(0, 0, W(), H());

  const dragging = drag && drag.moved;
  const sel = dragging ? normRect(drag) : hover;
  if (sel && sel.w > 0 && sel.h > 0) {
    ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
    const color = mode === 'video' ? '#ff4d5e' : '#3b9eff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dragging ? [] : [6, 4]);
    ctx.strokeRect(sel.x + 1, sel.y + 1, Math.max(0, sel.w - 2), Math.max(0, sel.h - 2));
    ctx.setLineDash([]);
    label(`${Math.round(sel.w * scale)} × ${Math.round(sel.h * scale)}`, sel.x, sel.y);
  }

  if (mouse && !dragging) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(mouse.y) + 0.5); ctx.lineTo(W(), Math.round(mouse.y) + 0.5);
    ctx.moveTo(Math.round(mouse.x) + 0.5, 0); ctx.lineTo(Math.round(mouse.x) + 0.5, H());
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (mouse) drawMagnifier();
}

function finish(r) {
  if (finished) return;
  finished = true;
  api.overlaySelect({ displayId, x: r.x / W(), y: r.y / H(), w: r.w / W(), h: r.h / H() });
}
function cancel() {
  if (finished) return;
  finished = true;
  api.overlayCancel();
}

window.addEventListener('mousedown', (e) => {
  if (e.button === 2) return cancel();
  if (e.button !== 0) return;
  drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, moved: false };
  hint.classList.add('faded');
});
window.addEventListener('mousemove', (e) => {
  mouse = { x: e.clientX, y: e.clientY };
  if (drag) {
    drag.x1 = e.clientX;
    drag.y1 = e.clientY;
    if (Math.abs(drag.x1 - drag.x0) > 4 || Math.abs(drag.y1 - drag.y0) > 4) drag.moved = true;
  } else {
    updateHover();
  }
  schedule();
});
window.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !drag) return;
  const r = drag.moved ? normRect(drag) : (hover || { x: 0, y: 0, w: W(), h: H() });
  drag = null;
  if (r.w < 4 || r.h < 4) { hint.classList.remove('faded'); schedule(); return; }
  finish(r);
});
window.addEventListener('mouseleave', () => { if (!drag) { mouse = null; hover = null; schedule(); } });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cancel();
  else if (e.key === 'Enter' || e.key.toLowerCase() === 'f') finish({ x: 0, y: 0, w: W(), h: H() });
});
window.addEventListener('resize', () => { resize(); schedule(); });

api.onOverlayInit(async (d) => {
  displayId = d.displayId;
  mode = d.mode;
  wins = d.windows || [];
  img.src = d.image;
  try { await img.decode(); } catch (_) { /* affichage quand même */ }
  scale = d.imageWidth / W();
  resize();
  hint.innerHTML = mode === 'video'
    ? '<span class="rec">●</span> <b>Vidéo</b> — glissez pour choisir la zone à filmer · clic : fenêtre ou écran entier · Échap : annuler'
    : '<b>Capture</b> — glissez pour choisir une zone · clic : fenêtre ou écran entier · Échap : annuler';
  hint.hidden = false;
  if (d.cursor) { mouse = d.cursor; updateHover(); }
  draw();
  api.overlayReady();
});
