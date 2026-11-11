'use strict';
// Dessine l'icône de Captur (assets/icon.png, 256 × 256) sans aucune dépendance.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 256;
const SS = 4; // sur-échantillonnage pour l'anticrénelage

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function inRect(x, y, x0, y0, w, h) { return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h; }

// Coins de viseur blancs
const T = 18, L = 62, I = 50;
const corners = [
  [I, I, L, T], [I, I, T, L],
  [S - I - L, I, L, T], [S - I - T, I, T, L],
  [I, S - I - T, L, T], [I, S - I - L, T, L],
  [S - I - L, S - I - T, L, T], [S - I - T, S - I - L, T, L],
];

function sample(x, y) {
  if (!inRoundRect(x, y, 8, 8, S - 8, S - 8, 58)) return null;
  const c = S / 2;
  const d = Math.hypot(x - c, y - c);
  if (d <= 20) return [255, 90, 110];
  if (d <= 30) return [255, 255, 255];
  for (const [x0, y0, w, h] of corners) {
    if (inRoundRect(x, y, x0, y0, x0 + w, y0 + h, T / 2)) return [255, 255, 255];
  }
  const t = (x + y) / (2 * S);
  return [Math.round(40 + 80 * t), Math.round(110 - 40 * t), 255];
}

const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  for (let x = 0; x < S; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const col = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
      if (col) { r += col[0]; g += col[1]; b += col[2]; a++; }
    }
    const o = y * (S * 4 + 1) + 1 + x * 4;
    raw[o] = a ? Math.round(r / a) : 0;
    raw[o + 1] = a ? Math.round(g / a) : 0;
    raw[o + 2] = a ? Math.round(b / a) : 0;
    raw[o + 3] = Math.round((a / (SS * SS)) * 255);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, 'assets', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log('Icône écrite :', out);
