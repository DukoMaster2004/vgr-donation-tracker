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
  const ridges: string[] = [];
  const background = '#f3f3f1';
  const rotation = ((seed >> 3) % 360) * (Math.PI / 180);

  for (let i = 0; i < 24; i += 1) {
    const coords: string[] = [];
    const rx = 26 + i * 7.2;
    const ry = 30 + i * 7.5;
    const twist = 0.7 + (i % 5) * 0.25;

    for (let step = 0; step <= 360; step += 2) {
      const angle = (step / 360) * Math.PI * 2;
      const waveX = Math.sin(angle * (2.2 + (i % 4) * 0.25) + seed / 7000) * (8 + i * 0.2);
      const waveY = Math.cos(angle * (2.4 + (i % 3) * 0.2) + seed / 6500) * (7 + i * 0.18);
      const x = 256 + (rx + waveX) * Math.cos(angle + rotation) * (1 + (i % 3) * 0.08);
      const y = 256 + (ry + waveY) * Math.sin(angle + rotation) * (1 + (i % 4) * 0.06);
      const swirlX = Math.cos(angle * twist + seed / 1000) * 6;
      const swirlY = Math.sin(angle * twist + seed / 900) * 5;
      coords.push(`${(x + swirlX).toFixed(2)},${(y + swirlY).toFixed(2)}`);
    }

    ridges.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="#111111" stroke-width="${(1.2 + (i % 5) * 0.18).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.95 - i * 0.015).toFixed(3)}"/>`,
    );
  }

  const whorl: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const coords: string[] = [];
    const radius = 10 + i * 8;
    for (let step = 0; step <= 360; step += 3) {
      const angle = (step / 360) * Math.PI * 2;
      const x = 256 + Math.cos(angle + i * 0.38 + seed / 12000) * (radius + Math.sin(angle * 8 + seed / 8000) * 10);
      const y = 256 + Math.sin(angle + i * 0.38 + seed / 12000) * (radius * 0.8 + Math.cos(angle * 8 + seed / 9000) * 8);
      coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    whorl.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="#111111" stroke-width="${(1.4 + (i % 4) * 0.35).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`,
    );
  }

  const minutiae: string[] = [];
  for (let i = 0; i < 20; i += 1) {
    const cx = 256 + ((seed >> ((i * 3 + 1) % 16)) & 0x1f) - 15 + Math.cos(i * 1.9) * (22 + (i % 7));
    const cy = 256 + ((seed >> ((i * 5 + 3) % 16)) & 0x1f) - 15 + Math.sin(i * 1.7) * (18 + (i % 5));
    const radius = 1.7 + (i % 4) * 0.6;
    minutiae.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="#111111" opacity="0.8"/>`);
  }

  return `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'><rect width='512' height='512' fill='${background}'/>${ridges.join('')}${whorl.join('')}${minutiae.join('')}</svg>`;
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
