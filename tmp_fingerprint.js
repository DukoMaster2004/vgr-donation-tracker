const crypto = require('crypto');
const s = '{image_data}';
let sourceBytes = Buffer.from(s, 'utf8');
let sourceKind = 'literal';
try {
  const decoded = Buffer.from(s, 'base64');
  const normalized = decoded.toString('base64').replace(/=+$/, '');
  if (normalized === s.replace(/=+$/, '')) {
    sourceBytes = decoded;
    sourceKind = 'base64';
  }
} catch (e) {}
const vals = Array.from(sourceBytes);
const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
const std = vals.length ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) : 0;
const bright = vals.length ? mean / 255 : 0;
const contrast = vals.length ? std / 255 : 0;
const bins = Array(8).fill(0);
for (const v of vals) bins[Math.min(7, Math.floor(v * 8 / 256))]++;
const freq = bins.map((b) => (vals.length ? b / vals.length : 0));
const hash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const seed = parseInt(hash.slice(0, 16), 16);
const poly = [];
for (let i = 0; i < 12; i++) {
  const y0 = 30 + i * 38;
  const coords = [];
  for (let x = 0; x <= 512; x += 18) {
    const jitter = ((seed >> (((i + x / 18) % 16))) & 0x1F) - 16;
    const y = y0 + jitter + 18 * Math.sin((x / 512) * (2 * Math.PI) * ((i % 5) + 1) + seed / 1000);
    coords.push(x + ',' + y.toFixed(2));
  }
  const r = (seed >> ((i * 5) % 16)) & 0xFF;
  const g = (seed >> ((i * 7 + 3) % 16)) & 0xFF;
  const b = (seed >> ((i * 9 + 5) % 16)) & 0xFF;
  const stroke = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  poly.push('<polyline points="' + coords.join(' ') + '" fill="none" stroke="' + stroke + '" stroke-width="' + (1.5 + (i % 4) * 0.6).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>');
}
const rings = [];
for (let j = 0; j < 6; j++) {
  const rr = (seed >> ((j * 5 + 2) % 16)) & 0xFF;
  const gg = (seed >> ((j * 7 + 4) % 16)) & 0xFF;
  const bb = (seed >> ((j * 9 + 6) % 16)) & 0xFF;
  const stroke2 = '#' + [rr, gg, bb].map((v) => v.toString(16).padStart(2, '0')).join('');
  const r = 48 + j * 22 + (seed % 9);
  rings.push('<circle cx="256" cy="256" r="' + r + '" fill="none" stroke="' + stroke2 + '" stroke-width="1.2" opacity="0.55" stroke-dasharray="' + (((seed >> (j % 8)) % 15) + 8) + ' ' + (9 + (j * 3) % 7) + '"/>');
}
const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'><rect width='512' height='512' fill='#050816'/>" + poly.join('') + "<circle cx='256' cy='256' r='" + (34 + (seed % 20)) + "' fill='none' stroke='#" + ((seed >> 8) & 0xFF).toString(16).padStart(2, '0') + ((seed >> 16) & 0xFF).toString(16).padStart(2, '0') + ((seed >> 24) & 0xFF).toString(16).padStart(2, '0') + "' stroke-width='2' opacity='0.7'/>" + rings.join('') + '</svg>';
const hist = {};
for (const v of vals) hist[v] = (hist[v] || 0) + 1;
const entropy = vals.length ? -Object.values(hist).reduce((acc, c) => acc + (c / vals.length) * Math.log2(c / vals.length), 0) : 0;
const out = {
  visual_fingerprint: svg,
  hash,
  analysis: {
    source_bytes: sourceBytes.length,
    input_mode: sourceKind,
    brightness_average: Number(bright.toFixed(6)),
    contrast: Number(contrast.toFixed(6)),
    pixel_distribution: Object.fromEntries(bins.map((_, i) => [`bucket_${i}`, Number(freq[i].toFixed(6))])),
    mean_luma: Number((mean / 255).toFixed(6)),
    stddev_luma: Number((std / 255).toFixed(6)),
    entropy_bits_per_byte: Number(entropy.toFixed(6))
  }
};
console.log(JSON.stringify(out));
