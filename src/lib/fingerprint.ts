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
  const background = '#f4f1ed';
  const cx = 256;
  const cy = 256;
  const ridges: string[] = [];
  const loops: string[] = [];
  const minutiae: string[] = [];

  for (let i = 0; i < 18; i += 1) {
    const startingRadius = 26 + i * 11.5;
    const ridgeShift = 10 + i * 1.8;
    const twist = 0.8 + (i % 6) * 0.25;
    const coords: string[] = [];

    for (let step = 0; step <= 360; step += 2) {
      const angle = (step / 360) * Math.PI * 2;
      const wave = Math.sin(angle * (2.2 + (i % 5) * 0.28) + seed / 7000) * (8 + i * 0.5);
      const radius = startingRadius + wave;
      const x = cx + Math.cos(angle + twist + seed / 50000) * (radius + Math.sin(angle * 3.5 + seed / 9000) * ridgeShift);
      const y = cy + Math.sin(angle + twist + seed / 50000) * (radius * 0.72 + Math.cos(angle * 3.5 + seed / 9000) * ridgeShift * 0.9);
      coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }

    ridges.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="#111111" stroke-width="${(1.1 + (i % 4) * 0.35).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.9 - i * 0.018).toFixed(3)}"/>`,
    );
  }

  for (let i = 0; i < 14; i += 1) {
    const radius = 30 + i * 14;
    const coords: string[] = [];

    for (let step = 0; step <= 360; step += 3) {
      const angle = (step / 360) * Math.PI * 2;
      const x = cx + Math.cos(angle + i * 0.23 + seed / 14000) * (radius + Math.sin(angle * 7 + seed / 8000) * 12);
      const y = cy + Math.sin(angle + i * 0.23 + seed / 14000) * (radius * 0.78 + Math.cos(angle * 7 + seed / 9000) * 9);
      coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }

    loops.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="#111111" stroke-width="${(0.9 + (i % 5) * 0.22).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.82"/>`,
    );
  }

  for (let i = 0; i < 36; i += 1) {
    const drift = ((seed >> ((i * 5 + 1) % 16)) & 0x1f) - 15;
    const x = cx + Math.cos(i * 0.57) * (26 + (i % 7) * 10) + drift * 0.7;
    const y = cy + Math.sin(i * 0.81) * (18 + (i % 5) * 9) + drift * 0.45;
    const radius = 1.8 + (i % 4) * 0.55;
    minutiae.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="#111111" opacity="0.84"/>`);
  }

  return `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'><rect width='512' height='512' fill='${background}'/>${ridges.join('')}${loops.join('')}${minutiae.join('')}</svg>`;
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
