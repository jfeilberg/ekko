import { describe, it, expect } from 'vitest';
import { bundleHtml } from './bundle';
import { getSkillResources } from './resources';

/**
 * Integration check against the real vendored design-system assets: the worked
 * sample must bundle into a single self-contained file — every CSS/JS/font
 * reference resolved and embedded, nothing left pointing at disk. This is the
 * closest local proxy for a live "render a deck" run.
 */
describe('design-system render (integration)', () => {
  it('bundles the base sample into a self-contained, font-embedded file', async () => {
    const res = (await getSkillResources())['design-system'];
    expect(res, 'design-system resources should be generated').toBeTruthy();

    const sample = res!['samples/base-sample.html'];
    expect(sample?.text, 'sample deck should be present').toBeTruthy();

    const out = bundleHtml(sample!.text!, res!);

    expect(out.missing, `unresolved refs: ${out.missing.join(', ')}`).toEqual([]);
    expect(out.residual, `not self-contained: ${out.residual.join(', ')}`).toEqual([]);
    expect(out.html).toContain('data:font/woff2;base64,'); // fonts embedded
    expect(out.html).not.toContain('href="core/'); // stylesheets inlined
    expect(Buffer.byteLength(out.html, 'utf8')).toBeGreaterThan(50_000);
  });
});
