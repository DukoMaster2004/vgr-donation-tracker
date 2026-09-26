const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const width = 120;
const height = 160;
const centerX = width / 2;
const centerY = height / 2;
const outputPath = path.join(process.cwd(), 'public', 'assets', 'fingerprint-profesional.png');

const pixels = Buffer.alloc(width * height * 4);

function setPixel(x, y, rgba) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) * 4;
  pixels[idx] = rgba[0];
  pixels[idx + 1] = rgba[1];
  pixels[idx + 2] = rgba[2];
  pixels[idx + 3] = rgba[3];
}

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    setPixel(x, y, [255, 255, 255, 255]);
  }
}

for (const radius of [10, 20, 30, 40, 50, 60]) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dist - radius) < 1.5) {
        setPixel(x, y, [0, 0, 0, 255]);
      }
    }
  }
}

for (let angle = 0; angle < 360; angle += 10) {
  const rad = (angle * Math.PI) / 180;
  const x1 = centerX + Math.cos(rad) * 4;
  const y1 = centerY + Math.sin(rad) * 4;
  const x2 = centerX + Math.cos(rad) * 60;
  const y2 = centerY + Math.sin(rad) * 60;
  const steps = Math.max(Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))), 1);

  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x1 + ((x2 - x1) * step) / steps);
    const y = Math.round(y1 + ((y2 - y1) * step) / steps);
    setPixel(x, y, [0, 0, 0, 255]);
  }
}

for (let y = Math.max(0, Math.round(centerY) - 2); y < Math.min(height, Math.round(centerY) + 3); y += 1) {
  for (let x = Math.max(0, Math.round(centerX) - 2); x < Math.min(width, Math.round(centerX) + 3); x += 1) {
    setPixel(x, y, [0, 0, 0, 255]);
  }
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(data) >>> 0, 0);
  return Buffer.concat([length, Buffer.from(type), data, crc]);
}

const rows = [];
for (let y = 0; y < height; y += 1) {
  const row = Buffer.alloc(width * 4 + 1);
  row[0] = 0;
  for (let x = 0; x < width; x += 1) {
    const idx = (y * width + x) * 4;
    row[x * 4 + 1] = pixels[idx];
    row[x * 4 + 2] = pixels[idx + 1];
    row[x * 4 + 3] = pixels[idx + 2];
    row[x * 4 + 4] = pixels[idx + 3];
  }
  rows.push(row);
}

const raw = Buffer.concat(rows);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const idat = zlib.deflateSync(raw);
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, png);
console.log(`PNG generado: ${outputPath}`);
