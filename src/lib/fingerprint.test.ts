import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateFingerprint, generateLocalFingerprint, svgToPngDataUrl } from './fingerprint.ts';

describe('generateLocalFingerprint', () => {
  it('produces a deterministic hash and SVG for a base64 image', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAF';
    const first = await generateLocalFingerprint(dataUrl);
    const second = await generateLocalFingerprint(dataUrl);

    assert.equal(first.hash, second.hash);
    assert.match(first.visual_fingerprint, /<svg/i);
    assert.ok(first.analysis.brightness_average >= 0);
    assert.ok(first.analysis.contrast >= 0);
  });

  it('converts the generated SVG fingerprint to a PNG data URL', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAF';
    const result = await generateLocalFingerprint(dataUrl);
    const png = await svgToPngDataUrl(result.visual_fingerprint);

    assert.match(png, /^data:image\/png;base64,/);
  });

  it('generates a deterministic PNG fingerprint buffer for PDFs', async () => {
    const first = await generateFingerprint();
    const second = await generateFingerprint();

    assert.ok(Buffer.isBuffer(first));
    assert.ok(first.length > 1000);
    assert.deepEqual(first.equals(second), true);
    assert.match(first.toString('hex').slice(0, 8), /^89504e47/);
  });
});
