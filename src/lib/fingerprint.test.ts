import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateLocalFingerprint } from './fingerprint';

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
});
