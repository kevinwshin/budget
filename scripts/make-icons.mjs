// Writes public/icon-192.png and public/icon-512.png without image dependencies:
// a green square with a white envelope outline, encoded as PNG with node:zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x1f, 0x6f, 0x5c];
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function icon(size) {
  // Envelope occupies the middle 50% so it survives the maskable safe zone.
  const l = size * 0.25, r = size * 0.75, t = size * 0.33, b = size * 0.67;
  const stroke = size * 0.035;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const inside = x >= l - stroke && x <= r + stroke && y >= t - stroke && y <= b + stroke;
      const border = inside && (x < l + stroke || x > r - stroke || y < t + stroke || y > b - stroke);
      const flap = Math.min(distToSegment(x, y, l, t, size / 2, size * 0.52), distToSegment(x, y, r, t, size / 2, size * 0.52)) < stroke;
      const c = border || (inside && flap) ? FG : BG;
      raw.set(c, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const s of [192, 512]) writeFileSync(`public/icon-${s}.png`, icon(s));
console.log('wrote public/icon-192.png and public/icon-512.png');
