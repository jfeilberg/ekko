import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { withStatusLabel } from '../tools/registry';
import { env } from '../env';
import { log } from '../log';
import { bundleArtifact } from './artifact';
import { getSnapshotId, setSnapshotId, clearSnapshotId } from './snapshot';

// Minimal shape of the live Chat SDK thread (post a message with file uploads).
// Defined locally rather than imported from ./tools to avoid a circular import.
type ThreadPoster = {
  post: (message: {
    markdown?: string;
    files?: Array<{ data: Buffer; filename: string; mimeType?: string }>;
  }) => Promise<unknown>;
};

type RuntimeCtx = {
  slackUserId: string;
  teamId: string;
  channelId: string;
  threadTs: string;
  composioEntityId: string;
  thread?: ThreadPoster;
};

/** Pure gate: resolve whether PDF export should be offered. */
export function resolvePdfExport(mode: 'auto' | 'on' | 'off', hasCredentials: boolean): boolean {
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return hasCredentials; // 'auto'
}

/**
 * Vercel Sandbox authenticates via OIDC (auto-injected on Vercel) or a token.
 * On Vercel the request-scoped OIDC token isn't always visible in process.env at
 * tool-registration time, so treat "running on Vercel" as credentials-present —
 * export_pdf is then offered on any Vercel deploy, and an actual auth/render
 * failure degrades to HTML delivery (see exportPdfTool's catch). VERCEL_TOKEN
 * covers local / self-hosted runs.
 */
function sandboxCredentialsPresent(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL_TOKEN);
}

export function isPdfExportEnabled(): boolean {
  return resolvePdfExport(env().EKKO_PDF_EXPORT, sandboxCredentialsPresent());
}

// Minimal headless exporter run inside the sandbox. Mirrors the design-system
// skill's scripts/export.mjs: load the self-contained file, let fonts settle,
// then print to PDF honouring the artifact's own @page size.
const EXPORTER_MJS = `import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('file://' + resolve('artifact.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
  await page.pdf({ path: 'out.pdf', preferCSSPageSize: true, printBackground: true });
} finally {
  await browser.close();
}
`;

// Keep playwright's browser download inside the workspace so it is captured by
// the snapshot and found on subsequent (snapshot-based) runs.
const BROWSERS_PATH = '/vercel/sandbox/.playwright';
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;

type SandboxModule = typeof import('@vercel/sandbox');
type SandboxInstance = Awaited<ReturnType<SandboxModule['Sandbox']['create']>>;

async function installPlaywright(sandbox: SandboxInstance): Promise<void> {
  const steps: [string, string[]][] = [
    ['npm', ['init', '-y']],
    ['npm', ['install', 'playwright-core']],
    ['npx', ['--yes', 'playwright', 'install', 'chromium-headless-shell']],
  ];
  for (const [cmd, args] of steps) {
    const r = await sandbox.runCommand(cmd, args);
    if (r.exitCode !== 0) {
      throw new Error(`sandbox setup failed (${cmd} ${args.join(' ')}): ${await r.stderr()}`);
    }
  }
}

async function runExport(sandbox: SandboxInstance, html: string): Promise<Buffer> {
  await sandbox.writeFiles([
    { path: 'artifact.html', content: html },
    { path: 'export.mjs', content: EXPORTER_MJS },
  ]);
  const run = await sandbox.runCommand('node', ['export.mjs']);
  if (run.exitCode !== 0) throw new Error(`pdf export failed: ${await run.stderr()}`);
  const pdf = await sandbox.readFileToBuffer({ path: 'out.pdf' });
  if (!pdf) throw new Error('pdf export produced no output');
  return pdf;
}

/**
 * Render a self-contained artifact HTML to PDF inside a Vercel Sandbox
 * (ephemeral microVM running headless Chromium). Returns the PDF bytes.
 *
 * Fast path: boot from a prebuilt snapshot (chromium already installed). Cold
 * path (first run, or expired/invalid snapshot): install chromium, render, then
 * capture a snapshot so the next run is fast. Throws on failure.
 */
async function renderPdfInSandbox(html: string): Promise<Buffer> {
  const { Sandbox } = await import('@vercel/sandbox');
  const env = { PLAYWRIGHT_BROWSERS_PATH: BROWSERS_PATH };

  // Fast path — reuse the prebuilt snapshot.
  const snapshotId = await getSnapshotId();
  if (snapshotId) {
    let sandbox: SandboxInstance | undefined;
    try {
      sandbox = await Sandbox.create({
        source: { type: 'snapshot', snapshotId },
        timeout: SANDBOX_TIMEOUT_MS,
        env,
      });
    } catch (err) {
      log.warn({ err }, 'pdf_snapshot_boot_failed_rebuilding');
      await clearSnapshotId();
    }
    if (sandbox) {
      try {
        return await runExport(sandbox, html);
      } finally {
        await sandbox.stop().catch(() => {});
      }
    }
  }

  // Cold path — install, render, then capture a snapshot for next time.
  const sandbox = await Sandbox.create({ runtime: 'node22', timeout: SANDBOX_TIMEOUT_MS, env });
  let snapshotted = false;
  try {
    await installPlaywright(sandbox);
    const pdf = await runExport(sandbox, html);
    try {
      const snap = await sandbox.snapshot({ expiration: 0 });
      snapshotted = true; // snapshot() shuts the sandbox down automatically
      await setSnapshotId(snap.snapshotId);
    } catch (err) {
      log.warn({ err }, 'pdf_snapshot_capture_failed');
    }
    return pdf;
  } finally {
    if (!snapshotted) await sandbox.stop().catch(() => {});
  }
}

/**
 * `export_pdf` tool — offered only when Vercel Sandbox is available. Bundles the
 * authored artifact to a self-contained file, renders it to PDF in a sandbox,
 * and posts the PDF to the Slack thread. Use only when the user explicitly wants
 * a server-rendered PDF; otherwise `render_artifact` delivers HTML that exports
 * to PDF from the browser print dialog with no sandbox.
 */
export function exportPdfTool(): Record<string, Tool> {
  if (!isPdfExportEnabled()) return {};

  return {
    export_pdf: withStatusLabel(
      tool({
        description:
          'Deliver an authored design-system artifact (deck or document) to the Slack thread as a ' +
          'PDF — the preferred, most readable delivery, since PDFs preview inline in Slack. Renders ' +
          'server-side (headless Chromium) and, if that ever fails, automatically falls back to ' +
          'delivering the self-contained HTML, so it is always safe to call. Reference skill assets ' +
          'with skill-root-relative paths; they are inlined and fonts embedded. The first render may ' +
          'take ~30–60s (it builds a reusable sandbox snapshot); later ones are fast. Prefer this ' +
          'over render_artifact for decks and documents; use render_artifact when the user wants an ' +
          'HTML/editable file or a social carousel.',
        inputSchema: z.object({
          filename: z.string().describe('File name ending in .pdf, e.g. "pitch-deck.pdf".'),
          html: z.string().describe('The full HTML document, with assets referenced by skill-relative path.'),
          comment: z.string().optional().describe('Optional message to post with the file.'),
        }),
        execute: async (
          { filename, html, comment }: { filename: string; html: string; comment?: string },
          opts: { experimental_context?: unknown } = {},
        ) => {
          const ctx = opts.experimental_context as RuntimeCtx | undefined;
          if (!ctx?.thread) return { ok: false, error: 'No Slack thread available to deliver into.' };

          const bundled = await bundleArtifact(html);
          if (bundled.missing.length) {
            // Don't burn a slow sandbox run on an artifact with broken asset paths.
            return { ok: false, error: 'Unresolved asset references — fix these and retry.', missingRefs: bundled.missing };
          }

          const pdfName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
          const htmlName = pdfName.replace(/\.pdf$/, '.html');

          let pdf: Buffer;
          try {
            pdf = await renderPdfInSandbox(bundled.html);
          } catch (err) {
            // Server-side render failed (sandbox unavailable, OIDC, timeout, …).
            // Still deliver the self-contained HTML so the user gets the artifact —
            // it exports to PDF from the browser print dialog (press P in a deck).
            // export_pdf is therefore always safe to call: worst case → HTML.
            log.warn({ err }, 'pdf_export_failed_html_fallback');
            await ctx.thread.post({
              markdown:
                comment ??
                `📎 ${htmlName} — couldn't render a server-side PDF, so here's the HTML. Open it and press P (or the browser print dialog) to save as PDF.`,
              files: [{ data: Buffer.from(bundled.html, 'utf8'), filename: htmlName, mimeType: 'text/html' }],
            });
            return {
              ok: true,
              deliveredAs: 'html',
              note: 'Server-side PDF render unavailable; delivered self-contained HTML (exports to PDF from the browser).',
            };
          }

          // Deliver through the Chat SDK thread (correct channel + thread_ts).
          await ctx.thread.post({
            markdown: comment ?? `📎 ${pdfName}`,
            files: [{ data: pdf, filename: pdfName, mimeType: 'application/pdf' }],
          });
          return { ok: true, deliveredAs: 'pdf', sizeKb: Math.round(pdf.byteLength / 1024) };
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as Tool,
      'Exporting PDF…',
    ),
  };
}
