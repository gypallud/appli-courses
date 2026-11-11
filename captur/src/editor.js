'use strict';
/* Éditeur de Captur : annotations sur la capture, bibliothèque, copie, enregistrement, OCR. */

const $ = (s) => document.querySelector(s);
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const stage = $('#stage');
const wrap = $('#canvasWrap');
const textEdit = $('#textEdit');
const videoWrap = $('#videoWrap');
const player = $('#player');
const emptyView = $('#empty');
const measureCtx = document.createElement('canvas').getContext('2d');
const blurCanvas = document.createElement('canvas');

// ------------------------------------------------------------------ icônes
const ICONS = {
  select: '<path d="M6 3l12 8.5-5.2 1.3L10 18z"/><path d="M13 13l4.5 6"/>',
  arrow: '<path d="M5 19L18 6"/><path d="M9.5 5H19v9.5"/>',
  line: '<path d="M5 19L19 5"/>',
  rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>',
  pen: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  highlight: '<path d="M4 21h9"/><path d="M8.5 16.5L6 19h4l1.5-1.5"/><path d="M8.5 16.5l2 2L20 9l-4-4z"/>',
  text: '<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  callout: '<path d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H11l-4.5 4v-4h-1A1.5 1.5 0 014 14.5z"/>',
  step: '<circle cx="12" cy="12" r="8.5"/><path d="M10.5 9.5L12.5 8v8"/>',
  blur: '<rect x="4" y="4" width="5" height="5" rx="1"/><rect x="15" y="4" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="4" y="15" width="5" height="5" rx="1"/><rect x="15" y="15" width="5" height="5" rx="1"/>',
  crop: '<path d="M7 3v14h14"/><path d="M3 7h14v14"/>',
  magnify: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20.5 20.5"/><path d="M8 10.5h5M10.5 8v5"/>',
  cut: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8.2 7.8L20 17M8.2 16.2L20 7"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8"/>',
  save: '<path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
  ocr: '<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16"/><path d="M8 9h8M8 12h8M8 15h5"/>',
  folder: '<path d="M3 7.5A2.5 2.5 0 015.5 5H9l2 2h7.5A2.5 2.5 0 0121 9.5v7a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5z"/>',
  capture: '<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16"/><circle cx="12" cy="12" r="3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5L21 7.5v9l-5-3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  width: '<path d="M4 6h16" stroke-width="1.2"/><path d="M4 12h16" stroke-width="2.4"/><path d="M4 18h16" stroke-width="4"/>',
  trash: '<path d="M5 7h14"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"/><path d="M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
function paintIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon); });
}

// ------------------------------------------------------------------ outils et style
const TOOLS = [
  { id: 'select', key: 'v', label: 'Sélectionner et déplacer' },
  { id: 'arrow', key: 'a', label: 'Flèche' },
  { id: 'line', key: 'l', label: 'Ligne' },
  { id: 'rect', key: 'r', label: 'Rectangle' },
  { id: 'ellipse', key: 'e', label: 'Ellipse' },
  { id: 'pen', key: 'p', label: 'Crayon' },
  { id: 'highlight', key: 'h', label: 'Surligneur' },
  { id: 'text', key: 't', label: 'Texte' },
  { id: 'callout', key: 'u', label: 'Bulle de texte' },
  { id: 'step', key: 'n', label: 'Étape numérotée' },
  { id: 'magnify', key: 'z', label: 'Loupe (bulle zoom)' },
  { id: 'blur', key: 'b', label: 'Flouter (masquer une info)' },
  { id: 'cut', key: 'd', label: 'Découper (retirer une bande horizontale ou verticale)' },
  { id: 'crop', key: 'c', label: 'Recadrer' },
];
const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#af52de', '#ffffff', '#1c1c1e'];
const TWO_POINT = ['arrow', 'line', 'rect', 'ellipse', 'highlight', 'blur'];
const BOXED = ['rect', 'ellipse', 'highlight', 'blur'];

let tool = 'arrow';
const style = { color: COLORS[0], width: 5, size: 28, zoom: 2, mshape: 'circle', cutDir: 'h', cutEdge: 'zigzag' };
let cutHover = null;

// ------------------------------------------------------------------ document courant
let doc = null; // { info, img, state: { crop, shapes }, history, idx }
let videoInfo = null;
let library = [];
let zoom = 1;
let fitMode = true;
let selectedId = null;
let action = null;
let editing = null;
let nextId = 1;
let saveTimer = null;
let appInfo = null;

const shapes = () => doc.state.shapes;
const getSelected = () => (doc && selectedId != null ? shapes().find((s) => s.id === selectedId) : null);

// ------------------------------------------------------------------ outils géométriques
function norm(s) {
  return {
    x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2),
    w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1),
  };
}
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
// ------------------------------------------------------------------ image de base (original moins les bandes découpées)
let baseCache = { doc: null, key: null, canvas: null };
function base() {
  const cuts = doc.state.cuts || [];
  if (!cuts.length) return { src: doc.img, w: doc.img.naturalWidth, h: doc.img.naturalHeight };
  const key = JSON.stringify(cuts);
  if (baseCache.doc !== doc || baseCache.key !== key) {
    let cur = { src: doc.img, w: doc.img.naturalWidth, h: doc.img.naturalHeight };
    for (const c of cuts) cur = applyCutTo(cur, c);
    baseCache = { doc, key, canvas: cur.src };
  }
  const c = baseCache.canvas;
  return { src: c, w: c.width, h: c.height };
}

// Points du bord de raccord : [position le long du bord, décalage]
function edgePoints(len, amp, period, edge) {
  const pts = [];
  if (edge === 'zigzag') {
    for (let t = 0, i = 0; t <= len + period; t += period / 2, i++) pts.push([t, i % 2 ? amp : -amp]);
  } else {
    for (let t = 0; t <= len + 3; t += 3) pts.push([t, amp * Math.sin((2 * Math.PI * t) / period)]);
  }
  return pts;
}

function applyCutTo(cur, cut) {
  const { src, w, h } = cur;
  const horiz = cut.dir === 'h';
  const len = horiz ? h : w;
  const s = cut.start, e = cut.end, d = e - s;
  const out = document.createElement('canvas');
  out.width = horiz ? w : w - d;
  out.height = horiz ? h - d : h;
  const c = out.getContext('2d');
  if (cut.edge === 'straight') {
    if (horiz) {
      if (s > 0) c.drawImage(src, 0, 0, w, s, 0, 0, w, s);
      if (h - e > 0) c.drawImage(src, 0, e, w, h - e, 0, s, w, h - e);
    } else {
      if (s > 0) c.drawImage(src, 0, 0, s, h, 0, 0, s, h);
      if (w - e > 0) c.drawImage(src, e, 0, w - e, h, s, 0, w - e, h);
    }
    return { src: out, w: out.width, h: out.height };
  }
  const other = horiz ? w : h;
  const amp = Math.max(4, Math.min(9, Math.round(other / 140)));
  const pts = edgePoints(other, amp, amp * 4, cut.edge);
  const trace = () => {
    c.beginPath();
    pts.forEach(([t, o], i) => {
      const x = horiz ? t : s + o, y = horiz ? s + o : t;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    });
  };
  // Première partie (un peu plus longue pour remplir les creux du bord)
  const firstLen = Math.min(len, s + amp);
  if (firstLen > 0) {
    if (horiz) c.drawImage(src, 0, 0, w, firstLen, 0, 0, w, firstLen);
    else c.drawImage(src, 0, 0, firstLen, h, 0, 0, firstLen, h);
  }
  // Seconde partie, découpée selon le bord
  const srcStart = Math.max(0, e - amp);
  const destStart = s - (e - srcStart);
  const secLen = len - srcStart;
  c.save();
  trace();
  if (horiz) { c.lineTo(w, out.height); c.lineTo(0, out.height); } else { c.lineTo(out.width, h); c.lineTo(out.width, 0); }
  c.closePath();
  c.clip();
  if (secLen > 0) {
    if (horiz) c.drawImage(src, 0, srcStart, w, secLen, 0, destStart, w, secLen);
    else c.drawImage(src, srcStart, 0, secLen, h, destStart, 0, secLen, h);
  }
  c.restore();
  return { src: out, w: out.width, h: out.height };
}

// Une coordonnée après le retrait de la bande [s, e]
function mapAfterCut(v, s, e) { return v >= e ? v - (e - s) : v > s ? s : v; }
function shiftForCut(cut) {
  const ax = cut.dir === 'v' ? 'x' : 'y';
  const size = ax === 'x' ? 'w' : 'h';
  const m = (v) => mapAfterCut(v, cut.start, cut.end);
  // Les annotations entièrement dans la bande retirée disparaissent avec elle
  doc.state.shapes = shapes().filter((s) => {
    const b = bbox(s);
    const lo = ax === 'x' ? b.x : b.y, hi = lo + (ax === 'x' ? b.w : b.h);
    const tol = (s.width || 0) + 2; // l'épaisseur du trait ne compte pas
    return !(lo >= cut.start - tol && hi <= cut.end + tol);
  });
  if (!shapes().some((s) => s.id === selectedId)) selectedId = null;
  for (const s of shapes()) {
    for (const k of [ax + '1', ax + '2', 'b' + ax]) if (typeof s[k] === 'number') s[k] = m(s[k]);
    if (s.points) s.points = s.points.map((p) => (ax === 'x' ? [m(p[0]), p[1]] : [p[0], m(p[1])]));
  }
  const cr = doc.state.crop;
  if (cr) {
    const a0 = m(cr[ax]), a1 = m(cr[ax] + cr[size]);
    cr[ax] = a0;
    cr[size] = a1 - a0;
    if (cr[size] < 8) doc.state.crop = null;
  }
}

function view() {
  if (doc.state.crop) return doc.state.crop;
  const b = base();
  return { x: 0, y: 0, w: b.w, h: b.h };
}
function fontOf(s) { return `600 ${s.size}px "Segoe UI", system-ui, sans-serif`; }
function isDark(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}
function contrast(hex) { return isDark(hex) ? '#ffffff' : '#1c1c1e'; }

function textBox(s) {
  measureCtx.font = fontOf(s);
  const lines = (s.text || ' ').split('\n');
  const w = Math.max(s.size * 0.6, ...lines.map((l) => measureCtx.measureText(l || ' ').width));
  const lh = s.size * 1.25;
  const pad = s.type === 'callout' ? s.size * 0.5 : 0;
  return { lines, w, lh, pad, bw: w + pad * 2, bh: lines.length * lh + pad * 2 };
}
function stepRadius(s) { return Math.max(12, s.size * 0.75); }

// Loupe : zone source (x1,y1 → x2,y2) et bulle agrandie centrée en (bx, by)
function magGeo(s) {
  const src = norm(s);
  const bw = src.w * s.zoom, bh = src.h * s.zoom;
  return { src, bub: { x: s.bx - bw / 2, y: s.by - bh / 2, w: bw, h: bh } };
}
function inRect(p, r, t = 0) { return p.x >= r.x - t && p.x <= r.x + r.w + t && p.y >= r.y - t && p.y <= r.y + r.h + t; }
function magPart(s, p) {
  const { bub } = magGeo(s);
  return inRect(p, bub, 4 / zoom) ? 'bubble' : 'source';
}
function placeBubble(s) {
  const v = view();
  const r = norm(s);
  const bw = r.w * s.zoom, bh = r.h * s.zoom;
  const gap = Math.max(24, r.w * 0.4);
  let bx = r.x + r.w + gap + bw / 2;
  if (bx + bw / 2 > v.x + v.w) bx = r.x - gap - bw / 2;
  if (bx - bw / 2 < v.x) bx = Math.min(v.x + v.w - bw / 2, Math.max(v.x + bw / 2, bx));
  let by = r.y + r.h / 2 - r.h * 0.5;
  by = Math.min(v.y + v.h - bh / 2, Math.max(v.y + bh / 2, by));
  s.bx = bx;
  s.by = by;
}

function bbox(s) {
  if (s.type === 'magnify') {
    const { src, bub } = magGeo(s);
    const x = Math.min(src.x, bub.x), y = Math.min(src.y, bub.y);
    return { x, y, w: Math.max(src.x + src.w, bub.x + bub.w) - x, h: Math.max(src.y + src.h, bub.y + bub.h) - y };
  }
  if (TWO_POINT.includes(s.type)) {
    const r = norm(s);
    const m = s.type === 'blur' || s.type === 'highlight' ? 0 : s.width / 2;
    return { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
  }
  if (s.type === 'pen') {
    const xs = s.points.map((p) => p[0]), ys = s.points.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x: x - s.width / 2, y: y - s.width / 2, w: Math.max(...xs) - x + s.width, h: Math.max(...ys) - y + s.width };
  }
  if (s.type === 'text' || s.type === 'callout') {
    const m = textBox(s);
    return { x: s.x1, y: s.y1, w: m.bw, h: m.bh };
  }
  if (s.type === 'step') {
    const r = stepRadius(s);
    return { x: s.x1 - r, y: s.y1 - r, w: 2 * r, h: 2 * r };
  }
  return { x: s.x1, y: s.y1, w: 0, h: 0 };
}

function hitTest(s, p) {
  const tol = Math.max(6 / zoom, s.width / 2 + 3 / zoom);
  if (s.type === 'line' || s.type === 'arrow') {
    return distToSegment(p, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) <= tol;
  }
  if (s.type === 'pen') {
    for (let i = 1; i < s.points.length; i++) {
      const a = { x: s.points[i - 1][0], y: s.points[i - 1][1] };
      const b = { x: s.points[i][0], y: s.points[i][1] };
      if (distToSegment(p, a, b) <= tol) return true;
    }
    return false;
  }
  if (s.type === 'magnify') {
    const { src, bub } = magGeo(s);
    return inRect(p, src, 4 / zoom) || inRect(p, bub, 4 / zoom);
  }
  const b = bbox(s);
  const t = 4 / zoom;
  return p.x >= b.x - t && p.x <= b.x + b.w + t && p.y >= b.y - t && p.y <= b.y + b.h + t;
}
function topHit(p) {
  const list = shapes();
  for (let i = list.length - 1; i >= 0; i--) if (hitTest(list[i], p)) return list[i];
  return null;
}

function handlesOf(s) {
  if (s.type === 'magnify') {
    const { bub } = magGeo(s);
    const k = s.shape !== 'square' ? Math.SQRT1_2 : 1;
    const corners = [
      { x: s.x1, y: s.y1, set: (sh, p) => { sh.x1 = p.x; sh.y1 = p.y; } },
      { x: s.x2, y: s.y1, set: (sh, p) => { sh.x2 = p.x; sh.y1 = p.y; } },
      { x: s.x1, y: s.y2, set: (sh, p) => { sh.x1 = p.x; sh.y2 = p.y; } },
      { x: s.x2, y: s.y2, set: (sh, p) => { sh.x2 = p.x; sh.y2 = p.y; } },
    ];
    // Poignée de la bulle : la tirer change le grossissement
    corners.push({
      x: s.bx + (bub.w / 2) * k,
      y: s.by + (bub.h / 2) * k,
      set: (sh, p) => {
        const r = norm(sh);
        const ref = Math.hypot(r.w / 2 * k, r.h / 2 * k) || 1;
        sh.zoom = Math.round(Math.max(1, Math.min(8, Math.hypot(p.x - sh.bx, p.y - sh.by) / ref)) * 10) / 10;
      },
    });
    return corners;
  }
  if (s.type === 'line' || s.type === 'arrow') {
    return [
      { x: s.x1, y: s.y1, set: (sh, p) => { sh.x1 = p.x; sh.y1 = p.y; } },
      { x: s.x2, y: s.y2, set: (sh, p) => { sh.x2 = p.x; sh.y2 = p.y; } },
    ];
  }
  if (BOXED.includes(s.type)) {
    return [
      { x: s.x1, y: s.y1, set: (sh, p) => { sh.x1 = p.x; sh.y1 = p.y; } },
      { x: s.x2, y: s.y1, set: (sh, p) => { sh.x2 = p.x; sh.y1 = p.y; } },
      { x: s.x1, y: s.y2, set: (sh, p) => { sh.x1 = p.x; sh.y2 = p.y; } },
      { x: s.x2, y: s.y2, set: (sh, p) => { sh.x2 = p.x; sh.y2 = p.y; } },
    ];
  }
  return [];
}
function translate(s, dx, dy, part) {
  if (s.type === 'magnify') {
    if (part !== 'source') { s.bx += dx; s.by += dy; }
    if (part !== 'bubble') { s.x1 += dx; s.y1 += dy; s.x2 += dx; s.y2 += dy; }
    return;
  }
  s.x1 += dx; s.y1 += dy;
  if ('x2' in s) { s.x2 += dx; s.y2 += dy; }
  if (s.points) s.points = s.points.map(([x, y]) => [x + dx, y + dy]);
}

// ------------------------------------------------------------------ dessin
function shadow(c, s, strength = 1) {
  c.shadowColor = 'rgba(0,0,0,0.38)';
  c.shadowBlur = Math.max(3, s.width * 0.9) * strength;
  c.shadowOffsetY = Math.max(1, s.width * 0.3) * strength;
}

function drawArrow(c, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const head = Math.min(len * 0.7, Math.max(16, s.width * 3.8));
  const half = head * 0.58;
  const bx = s.x2 - ux * head, by = s.y2 - uy * head;
  c.beginPath();
  c.moveTo(s.x1, s.y1);
  c.lineTo(bx + ux * 2, by + uy * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(s.x2, s.y2);
  c.lineTo(bx - uy * half, by + ux * half);
  c.lineTo(bx + ux * head * 0.12, by + uy * head * 0.12);
  c.lineTo(bx + uy * half, by - ux * half);
  c.closePath();
  c.lineWidth = Math.max(1, s.width * 0.4);
  c.fill();
  c.stroke();
}

function drawPen(c, s) {
  const pts = s.points;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) c.lineTo(pts[0][0] + 0.01, pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  if (pts.length > 1) c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  c.stroke();
}

function drawText(c, s) {
  const m = textBox(s);
  c.font = fontOf(s);
  c.textBaseline = 'top';
  const top = s.size * 0.1;
  if (s.type === 'callout') {
    shadow(c, { width: 4 });
    c.fillStyle = s.color;
    c.beginPath();
    c.roundRect(s.x1, s.y1, m.bw, m.bh, Math.min(s.size * 0.4, m.bh / 2));
    c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = contrast(s.color);
    m.lines.forEach((l, i) => c.fillText(l, s.x1 + m.pad, s.y1 + m.pad + i * m.lh + top));
  } else {
    c.lineJoin = 'round';
    c.lineWidth = Math.max(2, s.size / 6);
    c.strokeStyle = isDark(s.color) ? 'rgba(255,255,255,0.95)' : 'rgba(20,20,22,0.9)';
    c.fillStyle = s.color;
    m.lines.forEach((l, i) => {
      c.strokeText(l, s.x1, s.y1 + i * m.lh + top);
      c.fillText(l, s.x1, s.y1 + i * m.lh + top);
    });
  }
}

function drawStep(c, s) {
  const r = stepRadius(s);
  shadow(c, { width: 4 });
  c.fillStyle = s.color;
  c.beginPath();
  c.arc(s.x1, s.y1, r, 0, Math.PI * 2);
  c.fill();
  c.shadowColor = 'transparent';
  c.lineWidth = Math.max(2, r * 0.12);
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.stroke();
  c.fillStyle = contrast(s.color);
  c.font = `700 ${Math.round(r * 1.15)}px "Segoe UI", system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(s.n), s.x1, s.y1 + r * 0.06);
}

function drawBlur(c, s) {
  const b = base();
  const iw = b.w, ih = b.h;
  const r = norm(s);
  const x = Math.max(0, r.x), y = Math.max(0, r.y);
  const w = Math.min(iw, r.x + r.w) - x, h = Math.min(ih, r.y + r.h) - y;
  if (w < 2 || h < 2) return;
  const block = Math.max(7, Math.round(Math.max(w, h) / 28));
  const sw = Math.max(1, Math.round(w / block)), sh = Math.max(1, Math.round(h / block));
  blurCanvas.width = sw;
  blurCanvas.height = sh;
  const t = blurCanvas.getContext('2d');
  t.imageSmoothingEnabled = true;
  t.imageSmoothingQuality = 'high';
  t.drawImage(b.src, x, y, w, h, 0, 0, sw, sh);
  c.save();
  c.imageSmoothingEnabled = false;
  c.drawImage(blurCanvas, 0, 0, sw, sh, x, y, w, h);
  c.restore();
}

// Image de base avec les flous appliqués : la loupe ne doit jamais révéler une zone floutée.
let blurredCache = { key: null, canvas: null };
function blurredBase() {
  const b = base();
  const blurs = shapes().filter((s) => s.type === 'blur');
  if (!blurs.length) return b.src;
  const key = JSON.stringify([doc.state.cuts, blurs, doc.info.path]);
  if (blurredCache.key !== key) {
    const c = document.createElement('canvas');
    c.width = b.w;
    c.height = b.h;
    const g = c.getContext('2d');
    g.drawImage(b.src, 0, 0);
    for (const s of blurs) drawBlur(g, s);
    blurredCache = { key, canvas: c };
  }
  return blurredCache.canvas;
}

function drawMagnify(c, s) {
  const { src, bub } = magGeo(s);
  if (src.w < 2 || src.h < 2) return;
  const round = s.shape !== 'square';
  const lw = Math.max(2, s.width * 0.6);
  const path = (r) => {
    c.beginPath();
    if (round) c.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
    else c.roundRect(r.x, r.y, r.w, r.h, Math.min(10, r.w / 8, r.h / 8));
  };
  c.save();
  c.strokeStyle = s.color;
  c.lineCap = 'round';
  // Trait qui relie la zone à la bulle
  const scx = src.x + src.w / 2, scy = src.y + src.h / 2;
  const dx = s.bx - scx, dy = s.by - scy, dist = Math.hypot(dx, dy);
  const r1 = Math.min(src.w, src.h) / 2;
  if (dist > r1 + Math.min(bub.w, bub.h) / 2) {
    c.lineWidth = lw * 0.8;
    c.beginPath();
    c.moveTo(scx + (dx / dist) * r1, scy + (dy / dist) * r1);
    c.lineTo(s.bx, s.by);
    c.stroke();
  }
  c.lineWidth = lw;
  path(src);
  c.stroke();
  // Bulle agrandie
  c.save();
  shadow(c, { width: 6 });
  c.fillStyle = '#ffffff';
  path(bub);
  c.fill();
  c.restore();
  c.save();
  path(bub);
  c.clip();
  c.imageSmoothingQuality = 'high';
  c.drawImage(blurredBase(), src.x, src.y, src.w, src.h, bub.x, bub.y, bub.w, bub.h);
  c.restore();
  c.lineWidth = lw * 1.6;
  path(bub);
  c.stroke();
  c.restore();
}

function drawShape(c, s) {
  if (s.type === 'magnify') { drawMagnify(c, s); return; }
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = s.color;
  c.fillStyle = s.color;
  c.lineWidth = s.width;
  switch (s.type) {
    case 'line':
      shadow(c, s);
      c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
      break;
    case 'arrow':
      shadow(c, s);
      drawArrow(c, s);
      break;
    case 'rect': {
      shadow(c, s);
      const r = norm(s);
      c.beginPath();
      c.roundRect(r.x, r.y, r.w, r.h, Math.min(s.width * 1.2, r.w / 2, r.h / 2));
      c.stroke();
      break;
    }
    case 'ellipse': {
      shadow(c, s);
      const r = norm(s);
      c.beginPath();
      c.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
      c.stroke();
      break;
    }
    case 'pen':
      shadow(c, s, 0.6);
      drawPen(c, s);
      break;
    case 'highlight': {
      const r = norm(s);
      c.globalCompositeOperation = 'multiply';
      c.globalAlpha = 0.5;
      c.fillRect(r.x, r.y, r.w, r.h);
      break;
    }
    case 'text':
    case 'callout':
      drawText(c, s);
      break;
    case 'step':
      drawStep(c, s);
      break;
    default:
      break;
  }
  c.restore();
}

function drawScene(c, v, withUi) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  c.scale(c.canvas.width / v.w, c.canvas.height / v.h);
  c.translate(-v.x, -v.y);
  c.drawImage(base().src, 0, 0);
  for (const s of shapes()) if (s.type === 'blur') drawBlur(c, s);
  for (const s of shapes()) if (s.type !== 'blur' && !s.editing) drawShape(c, s);
  if (withUi) drawUi(c, v);
  c.restore();
}

function drawUi(c, v) {
  const px = 1 / zoom;
  const sel = getSelected();
  if (sel && !sel.editing) {
    const b = bbox(sel);
    c.save();
    c.strokeStyle = '#3b8cff';
    c.lineWidth = 1.5 * px;
    c.setLineDash([5 * px, 4 * px]);
    c.strokeRect(b.x - 4 * px, b.y - 4 * px, b.w + 8 * px, b.h + 8 * px);
    c.setLineDash([]);
    for (const h of handlesOf(sel)) {
      c.fillStyle = '#fff';
      c.strokeStyle = '#3b8cff';
      c.lineWidth = 2 * px;
      c.beginPath();
      c.arc(h.x, h.y, 5.5 * px, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.restore();
  }
  if (tool === 'cut' && (action ? action.kind === 'cut' : cutHover != null)) {
    const horiz = (action ? action.dir : style.cutDir) === 'h';
    const lo = action ? Math.min(action.a, action.b) : cutHover;
    const hi = action ? Math.max(action.a, action.b) : cutHover;
    c.save();
    if (hi > lo) {
      c.fillStyle = 'rgba(255,59,48,0.3)';
      if (horiz) c.fillRect(v.x, lo, v.w, hi - lo); else c.fillRect(lo, v.y, hi - lo, v.h);
    }
    c.strokeStyle = '#ff3b30';
    c.lineWidth = 2 * px;
    c.setLineDash([7 * px, 5 * px]);
    c.beginPath();
    for (const pos of hi > lo ? [lo, hi] : [lo]) {
      if (horiz) { c.moveTo(v.x, pos); c.lineTo(v.x + v.w, pos); } else { c.moveTo(pos, v.y); c.lineTo(pos, v.y + v.h); }
    }
    c.stroke();
    c.restore();
  }
  if (action && action.kind === 'crop') {
    const r = norm(action);
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath();
    c.rect(v.x, v.y, v.w, v.h);
    c.rect(r.x, r.y, r.w, r.h);
    c.fill('evenodd');
    c.strokeStyle = '#fff';
    c.lineWidth = 1.5 * px;
    c.setLineDash([6 * px, 4 * px]);
    c.strokeRect(r.x, r.y, r.w, r.h);
    c.restore();
  }
}

function render() {
  if (!doc) return;
  const v = view();
  if (canvas.width !== v.w || canvas.height !== v.h) {
    canvas.width = v.w;
    canvas.height = v.h;
  }
  canvas.style.width = `${v.w * zoom}px`;
  canvas.style.height = `${v.h * zoom}px`;
  drawScene(ctx, v, true);
  if (editing) placeTextEditor();
}

function flatten(scale = 1) {
  const v = view();
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(v.w * scale));
  c.height = Math.max(1, Math.round(v.h * scale));
  drawScene(c.getContext('2d'), v, false);
  return c;
}

// ------------------------------------------------------------------ historique et sauvegarde
function snapshot() {
  return JSON.stringify(doc.state, (k, val) => (k === 'editing' ? undefined : val));
}
function resetHistory() {
  doc.history = [snapshot()];
  doc.idx = 0;
}
function commit() {
  if (!doc) return;
  const snap = snapshot();
  if (snap === doc.history[doc.idx]) { render(); return; }
  doc.history = doc.history.slice(0, doc.idx + 1);
  doc.history.push(snap);
  if (doc.history.length > 200) doc.history.shift();
  doc.idx = doc.history.length - 1;
  changed();
}
function restore(idx) {
  const frame = () => JSON.stringify([doc.state.crop, doc.state.cuts]);
  const before = frame();
  doc.idx = idx;
  doc.state = JSON.parse(doc.history[idx]);
  if (!doc.state.cuts) doc.state.cuts = [];
  if (!shapes().some((s) => s.id === selectedId)) selectedId = null;
  if (frame() !== before) fit();
  changed();
}
function undo() { if (doc && doc.idx > 0) { finishText(); restore(doc.idx - 1); } }
function redo() { if (doc && doc.idx < doc.history.length - 1) { finishText(); restore(doc.idx + 1); } }

function changed() {
  render();
  updateUi();
  clearTimeout(saveTimer);
  const target = doc;
  saveTimer = setTimeout(() => saveMeta(target), 500);
}
async function saveMeta(target) {
  if (!target) return;
  const meta = JSON.parse(JSON.stringify(target.state, (k, v) => (k === 'editing' ? undefined : v)));
  let thumb = null;
  if (target === doc && (meta.crop || meta.shapes.length || (meta.cuts && meta.cuts.length))) {
    const v = view();
    const sc = Math.min(1, 320 / v.w, 200 / v.h);
    thumb = flatten(sc).toDataURL('image/png');
  }
  await api.saveMeta(target.info.path, meta, thumb);
  refreshLibrary();
}

// ------------------------------------------------------------------ zoom
function fit() {
  if (!doc) return;
  const v = view();
  const sw = stage.clientWidth - 56, sh = stage.clientHeight - 56;
  zoom = Math.max(0.05, Math.min(1, sw / v.w, sh / v.h));
  fitMode = true;
  render();
  updateZoomLabel();
}
function setZoom(z) {
  if (!doc) return;
  zoom = Math.max(0.05, Math.min(8, z));
  fitMode = false;
  render();
  updateZoomLabel();
}
function updateZoomLabel() { $('#zoomLabel').textContent = `${Math.round(zoom * 100)} %`; }

// ------------------------------------------------------------------ texte
function placeTextEditor() {
  const s = editing.s;
  const v = view();
  const m = textBox({ ...s, text: textEdit.value });
  const pad = m.pad * zoom;
  textEdit.style.left = `${24 + (s.x1 - v.x) * zoom - 2}px`;
  textEdit.style.top = `${24 + (s.y1 - v.y) * zoom - 2}px`;
  textEdit.style.font = `600 ${s.size * zoom}px "Segoe UI", system-ui, sans-serif`;
  textEdit.style.lineHeight = '1.25';
  textEdit.style.padding = `${pad}px`;
  textEdit.style.width = `${m.w * zoom + pad * 2 + s.size * zoom * 0.8 + 4}px`;
  textEdit.style.height = `${m.lines.length * m.lh * zoom + pad * 2 + 4}px`;
  if (s.type === 'callout') {
    textEdit.style.background = s.color;
    textEdit.style.color = contrast(s.color);
    textEdit.style.borderRadius = `${Math.min(s.size * 0.4 * zoom, 12)}px`;
  } else {
    textEdit.style.background = 'rgba(255,255,255,0.08)';
    textEdit.style.color = s.color;
    textEdit.style.borderRadius = '3px';
  }
}
function startText(s, isNew) {
  finishText();
  editing = { s, isNew, before: s.text };
  s.editing = true;
  selectedId = s.id;
  textEdit.value = s.text;
  textEdit.hidden = false;
  render();
  requestAnimationFrame(() => { textEdit.focus(); textEdit.select(); });
}
function finishText() {
  if (!editing) return;
  const { s, isNew, before } = editing;
  editing = null;
  s.editing = false;
  s.text = textEdit.value.replace(/\s+$/, '');
  textEdit.hidden = true;
  if (!s.text.trim()) {
    doc.state.shapes = shapes().filter((x) => x !== s);
    selectedId = null;
    if (isNew) { render(); return; }
  }
  if (isNew || s.text !== before) commit();
  else render();
}
textEdit.addEventListener('input', () => placeTextEditor());
textEdit.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault();
    finishText();
  }
});
textEdit.addEventListener('blur', () => finishText());

// ------------------------------------------------------------------ souris sur l'image
function toImage(e) {
  const r = canvas.getBoundingClientRect();
  const v = view();
  return { x: (e.clientX - r.left) / zoom + v.x, y: (e.clientY - r.top) / zoom + v.y };
}
function makeShape(type, p) {
  return {
    id: nextId++, type, color: style.color, width: style.width, size: style.size,
    x1: p.x, y1: p.y, x2: p.x, y2: p.y,
  };
}
function constrain(s, p, shift) {
  if (!shift) return p;
  const dx = p.x - s.x1, dy = p.y - s.y1;
  if (s.type === 'line' || s.type === 'arrow') {
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(dx, dy);
    return { x: s.x1 + Math.cos(ang) * len, y: s.y1 + Math.sin(ang) * len };
  }
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: s.x1 + Math.sign(dx || 1) * m, y: s.y1 + Math.sign(dy || 1) * m };
}

canvas.addEventListener('pointerdown', (e) => {
  if (!doc || e.button !== 0) return;
  if (editing) { finishText(); return; }
  const p = toImage(e);
  canvas.setPointerCapture(e.pointerId);

  if (tool === 'select') {
    const sel = getSelected();
    if (sel) {
      const h = handlesOf(sel).find((hd) => Math.hypot(hd.x - p.x, hd.y - p.y) <= 9 / zoom);
      if (h) { action = { kind: 'handle', s: sel, h }; return; }
    }
    const hit = topHit(p);
    selectedId = hit ? hit.id : null;
    if (hit) action = { kind: 'move', s: hit, last: p, moved: false, part: hit.type === 'magnify' ? magPart(hit, p) : undefined };
    render();
    updateUi();
    return;
  }
  if (tool === 'text' || tool === 'callout') {
    const hit = topHit(p);
    if (hit && (hit.type === 'text' || hit.type === 'callout')) { startText(hit, false); return; }
    const s = makeShape(tool, p);
    s.text = '';
    s.y1 -= s.size * 0.6;
    if (tool === 'callout') { s.x1 -= s.size * 0.5; s.y1 -= s.size * 0.2; }
    shapes().push(s);
    startText(s, true);
    return;
  }
  if (tool === 'step') {
    const s = makeShape('step', p);
    s.n = shapes().filter((x) => x.type === 'step').reduce((m, x) => Math.max(m, x.n), 0) + 1;
    shapes().push(s);
    selectedId = s.id;
    commit();
    return;
  }
  if (tool === 'crop') {
    action = { kind: 'crop', x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    return;
  }
  if (tool === 'cut') {
    const pos = style.cutDir === 'h' ? p.y : p.x;
    action = { kind: 'cut', dir: style.cutDir, a: pos, b: pos };
    return;
  }
  const s = makeShape(tool, p);
  if (tool === 'pen') s.points = [[p.x, p.y]];
  if (tool === 'magnify') {
    s.zoom = style.zoom;
    s.shape = style.mshape;
    placeBubble(s);
  }
  shapes().push(s);
  selectedId = s.id;
  action = { kind: 'draw', s };
});

canvas.addEventListener('pointermove', (e) => {
  if (!doc) return;
  const p = toImage(e);
  if (!action) {
    if (tool === 'cut') {
      cutHover = style.cutDir === 'h' ? p.y : p.x;
      render();
      return;
    }
    if (tool === 'select') {
      const sel = getSelected();
      const onHandle = sel && handlesOf(sel).some((hd) => Math.hypot(hd.x - p.x, hd.y - p.y) <= 9 / zoom);
      canvas.style.cursor = onHandle ? 'pointer' : topHit(p) ? 'move' : 'default';
    }
    return;
  }
  if (action.kind === 'draw') {
    const s = action.s;
    if (s.type === 'pen') {
      const last = s.points[s.points.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) >= 1.5 / zoom) s.points.push([p.x, p.y]);
    } else {
      const q = constrain(s, p, e.shiftKey || s.type === 'magnify');
      s.x2 = q.x;
      s.y2 = q.y;
      if (s.type === 'magnify') placeBubble(s);
    }
  } else if (action.kind === 'cut') {
    action.b = action.dir === 'h' ? p.y : p.x;
  } else if (action.kind === 'move') {
    translate(action.s, p.x - action.last.x, p.y - action.last.y, action.part);
    action.last = p;
    action.moved = true;
  } else if (action.kind === 'handle') {
    action.h.set(action.s, p);
  } else if (action.kind === 'crop') {
    action.x2 = p.x;
    action.y2 = p.y;
  }
  render();
});

function endPointer() {
  if (!action) return;
  const a = action;
  action = null;
  if (a.kind === 'draw') {
    const s = a.s;
    const tiny = s.type === 'pen' ? s.points.length < 2 : Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 4 / zoom;
    if (tiny) {
      doc.state.shapes = shapes().filter((x) => x !== s);
      selectedId = null;
      render();
      return;
    }
    commit();
  } else if (a.kind === 'move') {
    if (a.moved) commit();
  } else if (a.kind === 'handle') {
    commit();
  } else if (a.kind === 'cut') {
    applyCut(a);
  } else if (a.kind === 'crop') {
    const v = view();
    const r = norm(a);
    const x = Math.round(Math.max(v.x, r.x)), y = Math.round(Math.max(v.y, r.y));
    const w = Math.round(Math.min(v.x + v.w, r.x + r.w)) - x;
    const h = Math.round(Math.min(v.y + v.h, r.y + r.h)) - y;
    if (w >= 8 && h >= 8) {
      doc.state.crop = { x, y, w, h };
      commit();
      fit();
      setTool('select');
      toast('Image recadrée — Ctrl+Z pour revenir en arrière');
    } else {
      render();
    }
  }
}
function applyCut(a) {
  const b = base();
  const horiz = a.dir === 'h';
  const len = horiz ? b.h : b.w;
  const s = Math.round(Math.max(0, Math.min(a.a, a.b)));
  const e = Math.round(Math.min(len, Math.max(a.a, a.b)));
  if (e - s < 3) { render(); return; }
  if (len - (e - s) < 10) { toast('Il doit rester une partie de l\'image', true); render(); return; }
  const cut = { dir: a.dir, start: s, end: e, edge: style.cutEdge };
  doc.state.cuts = [...(doc.state.cuts || []), cut];
  shiftForCut(cut);
  cutHover = null;
  commit();
  fit();
  toast(`Bande de ${e - s} px retirée — Ctrl+Z pour revenir en arrière`);
}

canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointerleave', () => { if (cutHover != null && !action) { cutHover = null; render(); } });
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('dblclick', (e) => {
  if (!doc) return;
  const hit = topHit(toImage(e));
  if (hit && (hit.type === 'text' || hit.type === 'callout')) startText(hit, false);
});

stage.addEventListener('wheel', (e) => {
  if (!doc || !e.ctrlKey) return;
  e.preventDefault();
  setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
}, { passive: false });
stage.addEventListener('pointerdown', (e) => {
  if (e.target === stage || e.target === wrap) {
    if (editing) finishText();
    if (selectedId != null) { selectedId = null; render(); updateUi(); }
  }
});
window.addEventListener('resize', () => { if (fitMode) fit(); });

// ------------------------------------------------------------------ actions
function setTool(id) {
  finishText();
  tool = id;
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
  canvas.style.cursor = cursorFor(id);
  cutHover = null;
  if (id !== 'select' && selectedId != null) { selectedId = null; render(); }
  updateHint();
  updateToolOptions();
}
function cursorFor(id) {
  if (id === 'select') return 'default';
  if (id === 'text' || id === 'callout') return 'text';
  if (id === 'cut') return style.cutDir === 'h' ? 'row-resize' : 'col-resize';
  return 'crosshair';
}

function seg(name, options, value) {
  const buttons = options.map(([v, label]) => `<button data-opt="${name}" data-val="${v}" class="${String(v) === String(value) ? 'on' : ''}">${label}</button>`);
  return `<span class="seg">${buttons.join('')}</span>`;
}
function updateToolOptions() {
  const box = $('#toolOptions');
  const sel = getSelected();
  const mag = sel && sel.type === 'magnify' ? sel : null;
  if (doc && tool === 'cut') {
    box.innerHTML = '<span class="opt-label">Découper</span>'
      + seg('cutDir', [['h', 'Bande horizontale'], ['v', 'Bande verticale']], style.cutDir)
      + '<span class="opt-sep"></span><span class="opt-label">Bord</span>'
      + seg('cutEdge', [['straight', 'Droit'], ['zigzag', 'Zigzag'], ['wave', 'Vague']], style.cutEdge);
    box.hidden = false;
  } else if (doc && (tool === 'magnify' || mag)) {
    box.innerHTML = '<span class="opt-label">Loupe</span>'
      + seg('zoom', [[1.5, '×1,5'], [2, '×2'], [3, '×3'], [4, '×4']], mag ? mag.zoom : style.zoom)
      + '<span class="opt-sep"></span>'
      + seg('mshape', [['circle', 'Ronde'], ['square', 'Carrée']], mag ? mag.shape : style.mshape);
    box.hidden = false;
  } else {
    box.hidden = true;
  }
}
$('#toolOptions').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-opt]');
  if (!b) return;
  const key = b.dataset.opt;
  const val = key === 'zoom' ? Number(b.dataset.val) : b.dataset.val;
  style[key] = val;
  const sel = getSelected();
  if (sel && sel.type === 'magnify' && (key === 'zoom' || key === 'mshape')) {
    sel[key === 'zoom' ? 'zoom' : 'shape'] = val;
    commit();
  }
  if (key === 'cutDir') { canvas.style.cursor = cursorFor(tool); cutHover = null; render(); }
  updateToolOptions();
  updateHint();
});
function updateHint() {
  const hints = {
    select: 'Cliquez un élément pour le choisir, glissez pour le déplacer, Suppr pour l\'effacer. Double-clic sur un texte pour le modifier.',
    arrow: 'Glissez pour tracer une flèche. Maj : angle droit ou 45°.',
    line: 'Glissez pour tracer une ligne. Maj : angle droit ou 45°.',
    rect: 'Glissez pour tracer un rectangle. Maj : carré.',
    ellipse: 'Glissez pour tracer une ellipse. Maj : cercle.',
    pen: 'Dessinez à main levée.',
    highlight: 'Glissez sur la zone à surligner.',
    text: 'Cliquez pour écrire. Ctrl+Entrée ou Échap pour valider.',
    callout: 'Cliquez pour écrire dans une bulle. Ctrl+Entrée ou Échap pour valider.',
    step: 'Cliquez pour poser une étape numérotée (1, 2, 3…).',
    blur: 'Glissez sur l\'information à masquer.',
    magnify: 'Glissez sur la zone à agrandir : une bulle zoomée apparaît à côté. Déplacez la bulle ou tirez sa poignée pour changer le grossissement.',
    cut: style.cutDir === 'h'
      ? 'Glissez de haut en bas sur la bande à retirer : le haut et le bas de l\'image seront recollés.'
      : 'Glissez de gauche à droite sur la bande à retirer : la gauche et la droite de l\'image seront recollées.',
    crop: 'Glissez pour garder seulement une partie de l\'image.',
  };
  $('#statusHint').textContent = doc ? hints[tool] || '' : '';
}
function setColor(c) {
  style.color = c;
  $('#colorInput').value = c;
  document.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === c));
  const s = getSelected();
  if (s && s.type !== 'blur' && s.color !== c) { s.color = c; commit(); }
  if (editing) placeTextEditor();
}
function deleteSelected() {
  const s = getSelected();
  if (!s) return;
  doc.state.shapes = shapes().filter((x) => x !== s);
  selectedId = null;
  commit();
}

async function copyImage() {
  if (!doc) return;
  finishText();
  await api.copyImage(flatten().toDataURL('image/png'));
  toast('Image copiée — collez-la où vous voulez (Ctrl+V)');
}
async function saveAs() {
  if (!doc) return;
  finishText();
  const name = doc.info.name.replace(/\.[^.]+$/, '') + '.png';
  try {
    const out = await api.saveAs(flatten().toDataURL('image/png'), name);
    if (out) toast('Image enregistrée');
  } catch (err) {
    toast(cleanError(err), true);
  }
}
async function readText() {
  if (!doc) return;
  finishText();
  const v = view();
  const scale = Math.max(v.w, v.h) < 1600 ? 2 : 1;
  toast('Lecture du texte…');
  try {
    const text = await api.ocr(flatten(scale).toDataURL('image/png'));
    if (!text) { toast('Aucun texte trouvé dans l\'image', true); return; }
    $('#ocrText').value = text;
    $('#ocrDialog').showModal();
  } catch (err) {
    toast('Impossible de lire le texte : ' + cleanError(err), true);
  }
}
function cleanError(err) {
  return String(err && err.message ? err.message : err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

// ------------------------------------------------------------------ clavier
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
  if ($('#ocrDialog').open) return;
  const k = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
  if (mod && k === 'c') { e.preventDefault(); copyImage(); return; }
  if (mod && k === 's') { e.preventDefault(); saveAs(); return; }
  if (mod && k === 't') { e.preventDefault(); readText(); return; }
  if (mod && k === 'v') { e.preventDefault(); pasteImage(); return; }
  if (mod && k === '0') { e.preventDefault(); fit(); return; }
  if (mod && k === '1') { e.preventDefault(); setZoom(1); return; }
  if (mod && (k === '+' || k === '=')) { e.preventDefault(); setZoom(zoom * 1.2); return; }
  if (mod && k === '-') { e.preventDefault(); setZoom(zoom / 1.2); return; }
  if (mod) return;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelected(); return; }
  if (k === 'escape') {
    if (!$('#settingsPanel').hidden) { $('#settingsPanel').hidden = true; return; }
    if (action && action.kind === 'crop') { action = null; render(); return; }
    selectedId = null; render(); updateUi(); return;
  }
  if (k.startsWith('arrow') && getSelected()) {
    e.preventDefault();
    const step = (e.shiftKey ? 10 : 1);
    const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[k];
    translate(getSelected(), d[0], d[1]);
    commit();
    return;
  }
  const t = TOOLS.find((x) => x.key === k);
  if (t && doc) setTool(t.id);
});

document.addEventListener('paste', (e) => {
  if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
  e.preventDefault();
});
async function pasteImage() {
  const ok = await api.pasteImage();
  if (!ok) toast('Le presse-papier ne contient pas d\'image', true);
}

// ------------------------------------------------------------------ bibliothèque
function formatDate(ms) {
  const d = new Date(ms);
  const now = new Date();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString() === d.toDateString();
  if (sameDay) return `Aujourd'hui ${time}`;
  if (yesterday) return `Hier ${time}`;
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`;
}
async function refreshLibrary() {
  library = await api.listLibrary();
  const list = $('#libList');
  list.innerHTML = '';
  if (!library.length) {
    list.innerHTML = '<div class="lib-empty">Vos captures apparaîtront ici.</div>';
    return;
  }
  const current = doc ? doc.info.path : videoInfo ? videoInfo.path : null;
  for (const it of library) {
    const el = document.createElement('div');
    el.className = 'item' + (it.path === current ? ' current' : '');
    el.title = it.name;
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (it.kind === 'video') {
      const v = document.createElement('video');
      v.src = it.url + '#t=0.5';
      v.muted = true;
      v.preload = 'metadata';
      thumb.appendChild(v);
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = '▶ Vidéo';
      thumb.appendChild(badge);
    } else {
      const im = document.createElement('img');
      im.loading = 'lazy';
      im.src = it.thumbUrl || it.url;
      thumb.appendChild(im);
    }
    const del = document.createElement('button');
    del.className = 'del';
    del.title = 'Mettre à la corbeille';
    del.innerHTML = svg('close');
    del.addEventListener('click', (ev) => { ev.stopPropagation(); removeItem(it); });
    thumb.appendChild(del);
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = formatDate(it.mtime);
    el.append(thumb, name);
    el.addEventListener('click', () => openItem(it));
    list.appendChild(el);
  }
}
async function removeItem(it) {
  if (!confirm(`Mettre « ${it.name} » à la corbeille ?`)) return;
  try {
    await api.deleteItem(it.path);
  } catch (err) {
    toast('Suppression impossible : ' + cleanError(err), true);
    return;
  }
  if ((doc && doc.info.path === it.path) || (videoInfo && videoInfo.path === it.path)) showEmpty();
  refreshLibrary();
}

async function openItem(info) {
  finishText();
  if (info.kind === 'video') return showVideo(info);
  return openImage(info);
}
async function openImage(info) {
  const img = new Image();
  img.src = info.url;
  try { await img.decode(); } catch (_) { toast('Impossible d\'ouvrir cette image', true); return; }
  const meta = await api.loadMeta(info.path);
  player.pause();
  videoInfo = null;
  doc = {
    info,
    img,
    state: meta && Array.isArray(meta.shapes)
      ? { crop: meta.crop || null, cuts: meta.cuts || [], shapes: meta.shapes }
      : { crop: null, cuts: [], shapes: [] },
  };
  nextId = shapes().reduce((m, s) => Math.max(m, s.id || 0), 0) + 1;
  resetHistory();
  selectedId = null;
  action = null;
  emptyView.hidden = true;
  videoWrap.hidden = true;
  wrap.hidden = false;
  fit();
  updateUi();
  markCurrent();
}
function showVideo(info) {
  doc = null;
  videoInfo = info;
  wrap.hidden = true;
  emptyView.hidden = true;
  videoWrap.hidden = false;
  player.src = info.url;
  updateUi();
  markCurrent();
}
function showEmpty() {
  doc = null;
  videoInfo = null;
  player.pause();
  player.removeAttribute('src');
  wrap.hidden = true;
  videoWrap.hidden = true;
  emptyView.hidden = false;
  updateUi();
}
function markCurrent() {
  const current = doc ? doc.info.path : videoInfo ? videoInfo.path : null;
  const items = $('#libList').querySelectorAll('.item');
  items.forEach((el, i) => el.classList.toggle('current', library[i] && library[i].path === current));
}

// ------------------------------------------------------------------ interface
function updateUi() {
  const has = !!doc;
  ['#btnCopy', '#btnSave', '#btnOcr'].forEach((id) => { $(id).disabled = !has; });
  $('#btnUndo').disabled = !has || doc.idx <= 0;
  $('#btnRedo').disabled = !has || doc.idx >= doc.history.length - 1;
  document.querySelectorAll('.tool').forEach((b) => { b.disabled = !has; });
  if (has) {
    const v = view();
    $('#statusLeft').textContent = `${doc.info.name} — ${v.w} × ${v.h} px`;
    $('#zoomLabel').hidden = false;
  } else {
    $('#statusLeft').textContent = videoInfo ? videoInfo.name : '';
    $('#zoomLabel').hidden = true;
  }
  const s = getSelected();
  if (s) {
    if (s.color && s.type !== 'blur') {
      style.color = s.color;
      $('#colorInput').value = s.color;
      document.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === s.color));
    }
    if (s.width) $('#widthInput').value = s.width;
    if (s.size) $('#fontInput').value = String(s.size);
  }
  updateHint();
  updateToolOptions();
}

let toastTimer = null;
function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function renderShortcuts(info) {
  const html = info.shortcuts.map((s) => `<li class="${s.ok ? '' : 'ko'}"><span>${s.what}</span><span><kbd>${s.label}</kbd>${s.ok ? '' : ' <small>(déjà pris par Windows)</small>'}</span></li>`).join('');
  $('#shortcutList').innerHTML = html;
  $('#shortcutList2').innerHTML = html;
}

function buildToolbar() {
  const tools = $('#tools');
  for (const t of TOOLS) {
    const b = document.createElement('button');
    b.className = 'tool';
    b.dataset.tool = t.id;
    b.title = `${t.label} (${t.key.toUpperCase()})`;
    b.innerHTML = svg(t.id);
    b.addEventListener('click', () => setTool(t.id));
    tools.appendChild(b);
  }
  const sw = $('#swatches');
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.color = c;
    b.style.background = c;
    b.title = c;
    b.addEventListener('click', () => setColor(c));
    sw.appendChild(b);
  }
}

function bindButtons() {
  $('#btnCapture').addEventListener('click', () => api.startCapture('image'));
  $('#btnVideo').addEventListener('click', () => api.startCapture('video'));
  document.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => api.startCapture(b.dataset.start)));
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);
  $('#btnCopy').addEventListener('click', copyImage);
  $('#btnSave').addEventListener('click', saveAs);
  $('#btnOcr').addEventListener('click', readText);
  $('#btnFolder').addEventListener('click', () => api.openFolder());
  $('#zoomLabel').addEventListener('click', fit);
  $('#btnVideoOpen').addEventListener('click', () => videoInfo && api.openExternal(videoInfo.path));
  $('#btnVideoReveal').addEventListener('click', () => videoInfo && api.reveal(videoInfo.path));

  $('#colorInput').addEventListener('input', (e) => setColor(e.target.value));
  $('#widthInput').addEventListener('input', (e) => {
    style.width = Number(e.target.value);
    const s = getSelected();
    if (s && s.type !== 'text' && s.type !== 'callout' && s.type !== 'step') { s.width = style.width; render(); }
  });
  $('#widthInput').addEventListener('change', () => { if (getSelected()) commit(); });
  $('#fontInput').addEventListener('change', (e) => {
    style.size = Number(e.target.value);
    const s = getSelected();
    if (s && (s.type === 'text' || s.type === 'callout' || s.type === 'step')) { s.size = style.size; commit(); }
    if (editing) { editing.s.size = style.size; placeTextEditor(); textEdit.focus(); }
  });

  const panel = $('#settingsPanel');
  $('#btnSettings').addEventListener('click', (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; });
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !$('#btnSettings').contains(e.target)) panel.hidden = true;
  });
  const bindSetting = (id, key) => $(id).addEventListener('change', async (e) => {
    appInfo.settings = await api.setSettings({ [key]: e.target.checked });
  });
  bindSetting('#setAutoCopy', 'autoCopy');
  bindSetting('#setSystemAudio', 'systemAudio');
  bindSetting('#setMic', 'mic');

  $('#ocrCopy').addEventListener('click', async () => {
    await api.copyText($('#ocrText').value);
    $('#ocrDialog').close();
    toast('Texte copié');
  });
  $('#ocrClose').addEventListener('click', () => $('#ocrDialog').close());
}

// ------------------------------------------------------------------ démarrage
async function init() {
  paintIcons();
  buildToolbar();
  bindButtons();
  setTool('arrow');
  setColor(COLORS[0]);
  appInfo = await api.appInfo();
  renderShortcuts(appInfo);
  $('#setAutoCopy').checked = appInfo.settings.autoCopy;
  $('#setSystemAudio').checked = appInfo.settings.systemAudio;
  $('#setMic').checked = appInfo.settings.mic;
  $('#libPath').textContent = appInfo.library;
  showEmpty();
  await refreshLibrary();
  api.onOpen(async (info) => {
    await refreshLibrary();
    await openItem(info);
    if (info.kind === 'image' && appInfo.settings.autoCopy) toast('Capture copiée dans le presse-papier');
  });
}
init();
