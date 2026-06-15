import { describe, it, expect } from 'vitest';
import { bundleHtml } from './bundle';
import type { SkillResource } from './resources';

const resources: Record<string, SkillResource> = {
  'core/tokens.css': { mime: 'text/css', text: ':root{--c-fg:#111}' },
  'brands/base/brand.css': {
    mime: 'text/css',
    // url() is relative to this file's dir (brands/base) → brands/base/fonts/x.woff2
    text: "@font-face{font-family:Inter;src:url('fonts/x.woff2')}",
  },
  'brands/base/fonts/x.woff2': { mime: 'font/woff2', base64: 'QUJD' },
  'core/runtime.js': { mime: 'text/javascript', text: 'console.log("hi")' },
};

const HTML = `<!doctype html><html><head>
<link rel="stylesheet" href="core/tokens.css">
<link rel="stylesheet" href="brands/base/brand.css">
</head><body><script src="core/runtime.js"></script></body></html>`;

describe('bundleHtml', () => {
  it('inlines stylesheets and scripts and embeds fonts', () => {
    const out = bundleHtml(HTML, resources);
    expect(out.html).toContain('<style>');
    expect(out.html).toContain('--c-fg:#111');
    expect(out.html).toContain('console.log("hi")');
    // font url() resolved relative to brand.css dir and base64-embedded
    expect(out.html).toContain('data:font/woff2;base64,QUJD');
    expect(out.html).not.toContain('href="core/tokens.css"');
  });

  it('reports a self-contained result with no residual refs', () => {
    const out = bundleHtml(HTML, resources);
    expect(out.residual).toEqual([]);
    expect(out.missing).toEqual([]);
  });

  it('flags missing references instead of throwing', () => {
    const out = bundleHtml('<link rel="stylesheet" href="core/missing.css">', resources);
    expect(out.missing).toContain('core/missing.css');
  });

  it('leaves remote references untouched and reports them', () => {
    const out = bundleHtml('<link rel="stylesheet" href="https://cdn.example/x.css">', resources);
    expect(out.remote).toContain('https://cdn.example/x.css');
    expect(out.html).toContain('https://cdn.example/x.css');
  });

  it('tolerates ../ prefixes from raw templates', () => {
    const out = bundleHtml('<link rel="stylesheet" href="../core/tokens.css">', resources);
    expect(out.html).toContain('--c-fg:#111');
    expect(out.residual).toEqual([]);
  });
});
