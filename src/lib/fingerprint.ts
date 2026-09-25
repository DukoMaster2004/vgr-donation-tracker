export type FingerprintAnalysis = {
  source_bytes: number;
  input_mode: 'base64' | 'literal';
  brightness_average: number;
  contrast: number;
  pixel_distribution: Record<string, number>;
  mean_luma: number;
  stddev_luma: number;
  entropy_bits_per_byte: number;
};

export type FingerprintResult = {
  visual_fingerprint: string;
  hash: string;
  analysis: FingerprintAnalysis;
};

function decodeBase64DataUrl(dataUrl: string): Uint8Array {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('The supplied value is not a valid data:image URL.');
  }

  const encoded = match[2];
  if (!encoded) {
    throw new Error('The supplied data URL does not contain any image payload.');
  }

  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  throw new Error('Web Crypto API is not available in this environment.');
}

function buildVisualFingerprint(seed: number): string {
  const polylineBands: string[] = [];

  for (let i = 0; i < 12; i += 1) {
    const yBase = 30 + i * 38;
    const coords: string[] = [];

    for (let x = 0; x <= 512; x += 18) {
      const jitter = ((seed >> ((i + x / 18) % 16)) & 0x1f) - 16;
      const y = yBase + jitter + 18 * Math.sin((x / 512) * (2 * Math.PI) * ((i % 5) + 1) + seed / 1000);
      coords.push(`${x},${y.toFixed(2)}`);
    }

    const r = (seed >> ((i * 5) % 16)) & 0xff;
    const g = (seed >> ((i * 7 + 3) % 16)) & 0xff;
    const b = (seed >> ((i * 9 + 5) % 16)) & 0xff;
    const stroke = `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;

    polylineBands.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${(1.5 + (i % 4) * 0.6).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }

  const rings: string[] = [];

  for (let j = 0; j < 6; j += 1) {
    const rr = (seed >> ((j * 5 + 2) % 16)) & 0xff;
    const gg = (seed >> ((j * 7 + 4) % 16)) & 0xff;
    const bb = (seed >> ((j * 9 + 6) % 16)) & 0xff;
    const stroke = `#${[rr, gg, bb].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    const radius = 48 + j * 22 + (seed % 9);
    rings.push(
      `<circle cx="256" cy="256" r="${radius}" fill="none" stroke="${stroke}" stroke-width="1.2" opacity="0.55" stroke-dasharray="${((seed >> (j % 8)) % 15) + 8} ${9 + (j * 3) % 7}"/>`,
    );
  }

  const centerStroke = `#${[(seed >> 8) & 0xff, (seed >> 16) & 0xff, (seed >> 24) & 0xff]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;

  return `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'><rect width='512' height='512' fill='#050816'/>${polylineBands.join('')}<circle cx='256' cy='256' r='${34 + (seed % 20)}' fill='none' stroke='${centerStroke}' stroke-width='2' opacity='0.7'/>${rings.join('')}</svg>`;
}

export async function generateLocalFingerprint(dataUrl: string): Promise<FingerprintResult> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('The image should be a valid data URL.');
  }

  const bytes = decodeBase64DataUrl(dataUrl);
  const values = Array.from(bytes);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const std = values.length
    ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length)
    : 0;

  const brightnessAverage = values.length ? mean / 255 : 0;
  const contrast = values.length ? std / 255 : 0;
  const bins = Array(8).fill(0);

  for (const value of values) {
    bins[Math.min(7, Math.floor((value * 8) / 256))] += 1;
  }

  const histogram = Object.fromEntries(
    bins.map((_, index) => [`bucket_${index}`, values.length ? Number((bins[index] / values.length).toFixed(6)) : 0]),
  );

  const hash = await sha256Hex(bytes);
  const seed = parseInt(hash.slice(0, 16), 16);
  const visual_fingerprint = buildVisualFingerprint(seed);

  const entropyMap: Record<number, number> = {};
  for (const value of values) {
    entropyMap[value] = (entropyMap[value] ?? 0) + 1;
  }

  const entropy = values.length
    ? -Object.values(entropyMap).reduce((sum, count) => sum + (count / values.length) * Math.log2(count / values.length), 0)
    : 0;

  return {
    visual_fingerprint,
    hash,
    analysis: {
      source_bytes: bytes.length,
      input_mode: 'base64',
      brightness_average: Number(brightnessAverage.toFixed(6)),
      contrast: Number(contrast.toFixed(6)),
      pixel_distribution: histogram,
      mean_luma: Number((mean / 255).toFixed(6)),
      stddev_luma: Number((std / 255).toFixed(6)),
      entropy_bits_per_byte: Number(entropy.toFixed(6)),
    },
  };
}
