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

  for (let i = 0; i < 28; i += 1) {
    const coords: string[] = [];
    const baseRx = 18 + i * 7.2;
    const baseRy = 26 + i * 7.6;
    const rotation = 12 + i * 2.6 + ((seed >> ((i % 8) * 4)) & 0xf);

    for (let step = 0; step <= 720; step += 2) {
      const angle = (step / 720) * Math.PI * 2;
      const wobble = 8 * Math.sin(angle * (3.5 + (i % 4) * 0.3) + seed / 5000 + i * 0.9);
      const x = 256 + (baseRx + wobble) * Math.cos(angle + rotation * (Math.PI / 180));
      const y = 256 + (baseRy + wobble * 0.35) * Math.sin(angle + rotation * (Math.PI / 180));
      coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }

    ridges.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="#111111" stroke-width="${(1.1 + (i % 5) * 0.2).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.92 - i * 0.012).toFixed(3)}"/>`,
    );
  }

  const centralWhorl: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const coords: string[] = [];
    const radius = 14 + i * 9;
    for (let step = 0; step <= 240; step += 2) {
      const angle = (step / 240) * Math.PI + i * 0.45;
      const offsetX = Math.cos(angle + seed / 9000) * (radius + (i % 2 === 0 ? 10 : 0));
      const offsetY = Math.sin(angle + seed / 9000) * (radius * 0.7 + 5);
      coords.push(`${(256 + offsetX).toFixed(2)},${(256 + offsetY).toFixed(2)}`);
    }
    centralWhorl.push(
      `<polyline points="${coords.join(' ')}" fill="none" stroke="#111111" stroke-width="${(1.6 + (i % 3) * 0.4).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`,
    );
  }

  const minutiae: string[] = [];
  for (let i = 0; i < 18; i += 1) {
    const cx = 256 + ((seed >> ((i * 3) % 16)) & 0x1f) - 15 + Math.cos(i * 1.7) * (15 + (i % 6));
    const cy = 256 + ((seed >> ((i * 5 + 2) % 16)) & 0x1f) - 15 + Math.sin(i * 1.3) * (18 + (i % 5));
    const r = 1.8 + (i % 4) * 0.7;
    minutiae.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="#111111" opacity="0.75"/>`);
  }

  return `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'><rect width='512' height='512' fill='${background}'/>${ridges.join('')}${centralWhorl.join('')}${minutiae.join('')}</svg>`;
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
