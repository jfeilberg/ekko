import type { SkillResource } from './resources';

/**
 * In-process port of the design-system skill's `scripts/bundle.mjs`.
 *
 * Collapses a multi-file HTML artifact into ONE self-contained file: inlines
 * linked stylesheets (recursively following local @import), local scripts,
 * base64-embeds fonts/images referenced via url(...) and <img>, and inlines
 * url(...) inside inline style="..." attributes. Operates over an in-memory
 * resource map (skill-relative path -> resource) instead of the filesystem, so
 * it runs in the serverless runtime with no dependencies and no fs access.
 *
 * The authored HTML is treated as if it lives at the skill root, so references
 * should be skill-root-relative (e.g. `core/tokens.css`, `brands/base/brand.css`).
 * Leading `./` and `../` segments are tolerated and normalized.
 */

export type BundleResult = {
  html: string;
  /** Local references that could not be resolved in the resource map. */
  missing: string[];
  /** Local references still present after bundling (means not self-contained). */
  residual: string[];
  /** Remote (http/https/protocol-relative) references left untouched. */
  remote: string[];
};

type ResMap = Record<string, SkillResource>;

function posixDirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

/** Resolve `ref` against `baseDir`, normalizing `.`/`..`, stripping query/hash. */
function resolvePath(baseDir: string, ref: string): string {
  const clean = ref.split(/[?#]/)[0] ?? '';
  const fromRoot = clean.startsWith('/');
  const parts = (fromRoot ? clean.slice(1) : (baseDir ? baseDir + '/' : '') + clean).split('/');
  const stack: string[] = [];
  for (const seg of parts) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') stack.pop();
    else stack.push(seg);
  }
  return stack.join('/');
}

const isRemote = (ref: string) => /^https?:|^\/\//.test(ref);

export function bundleHtml(input: string, resources: ResMap): BundleResult {
  let html = input;
  const missing: string[] = [];
  const remote = new Set<string>();

  const get = (path: string): SkillResource | undefined => resources[path];

  const dataUri = (res: SkillResource): string => {
    if (res.base64) return `data:${res.mime};base64,${res.base64}`;
    const b64 = Buffer.from(res.text ?? '', 'utf8').toString('base64');
    return `data:${res.mime};base64,${b64}`;
  };

  const inlineCssUrls = (css: string, baseDir: string): string =>
    css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, _q, ref: string) => {
      if (ref.startsWith('data:')) return m;
      if (isRemote(ref)) { remote.add(ref); return m; }
      const res = get(resolvePath(baseDir, ref));
      if (!res) { missing.push(ref); return m; }
      return `url("${dataUri(res)}")`;
    });

  const loadCss = (cssPath: string, seen: Set<string>): string => {
    if (seen.has(cssPath)) return '';
    seen.add(cssPath);
    const res = get(cssPath);
    if (!res?.text) { missing.push(cssPath); return ''; }
    const withImports = res.text.replace(
      /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?\s*;/g,
      (m, ref: string) => {
        if (isRemote(ref)) { remote.add(ref); return m; }
        return loadCss(resolvePath(posixDirname(cssPath), ref), seen);
      },
    );
    return inlineCssUrls(withImports, posixDirname(cssPath));
  };

  // 1) Inline <link rel="stylesheet">
  html = html.replace(/<link\b[^>]*>/gi, (m) => {
    if (!/rel=["']stylesheet["']/i.test(m)) return m;
    const href = (/href=["']([^"']+)["']/i.exec(m) ?? [])[1];
    if (!href) return m;
    if (isRemote(href)) { remote.add(href); return m; }
    return `<style>\n${loadCss(resolvePath('', href), new Set())}\n</style>`;
  });

  // 2) Inline <script src="...">
  html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (m, src: string) => {
    if (isRemote(src)) { remote.add(src); return m; }
    const res = get(resolvePath('', src));
    if (!res?.text) { missing.push(src); return m; }
    return `<script>\n${res.text}\n</script>`;
  });

  // 3) Inline local <img src="...">
  html = html.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (m, a: string, src: string, b: string) => {
    if (src.startsWith('data:')) return m;
    if (isRemote(src)) { remote.add(src); return m; }
    const res = get(resolvePath('', src));
    if (!res) { missing.push(src); return m; }
    return `<img${a}src="${dataUri(res)}"${b}>`;
  });

  // 4) Inline url(...) inside inline style="..." attributes
  html = html.replace(/style="([^"]*url\([^"]*)"/gi, (_m, styleVal: string) => {
    const inlined = inlineCssUrls(styleVal.replace(/&quot;/g, "'"), '');
    return `style="${inlined}"`;
  });

  // 5) Verify: no local relative refs may remain
  const residual: string[] = [];
  for (const m of html.matchAll(/<(?:link|script|img)\b[^>]*?(?:href|src)=["']([^"']+)["']/gi)) {
    const r = m[1]!;
    if (!/^data:|^https?:|^\/\/|^#|^mailto:/.test(r)) residual.push(r);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) {
    const r = m[1]!;
    if (!/^data:|^https?:|^\/\/|^#/.test(r)) residual.push(r);
  }

  return {
    html,
    missing: [...new Set(missing)],
    residual: [...new Set(residual)],
    remote: [...remote],
  };
}
