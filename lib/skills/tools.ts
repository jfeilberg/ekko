import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { WebClient } from '@slack/web-api';
import { withStatusLabel } from '../tools/registry';
import { env } from '../env';
import { getAvailableSkills, getSkillByName } from './loader';
import { getResourcesFor } from './resources';
import { bundleArtifact } from './artifact';
import { exportPdfTool } from './export';

type RuntimeCtx = {
  slackUserId: string;
  teamId: string;
  channelId: string;
  threadTs: string;
  composioEntityId: string;
};

let cachedClient: WebClient | undefined;
function slackClient(): WebClient {
  if (!cachedClient) cachedClient = new WebClient(env().SLACK_BOT_TOKEN);
  return cachedClient;
}

/**
 * Tools that implement progressive disclosure for skills.
 *
 * - `load_skill`     — pull a skill's full instructions (L2) on demand.
 * - `read_skill_file`— read a skill's bundled resource files (L3): references,
 *                      CSS tokens, templates, component docs.
 * - `render_artifact`— collapse an authored multi-file HTML artifact into one
 *                      self-contained file (fonts/CSS inlined) and deliver it to
 *                      the Slack thread. Runs entirely in-process — no sandbox.
 *
 * The model always sees L1 metadata (name + description) of every skill in the
 * system prompt; it calls these tools as needed (same pattern as Claude Code /
 * opencode) — no brittle keyword/intent classification.
 */
export function skillTools(): Record<string, Tool> {
  const available = getAvailableSkills();
  if (!available.length) return {};

  const names = available.map((s) => s.name);
  const withResources = available.filter((s) => s.hasResources).map((s) => s.name);

  const tools: Record<string, Tool> = {
    load_skill: withStatusLabel(
      tool({
        description:
          'Load the full instructions for one of the available skills listed in your system ' +
          'prompt. Call this when a skill is relevant to the request before acting. ' +
          `Available skills: ${names.join(', ')}.`,
        inputSchema: z.object({
          name: z.enum(names as [string, ...string[]]).describe('The skill name to load.'),
        }),
        execute: async ({ name }: { name: string }) => {
          const skill = getSkillByName(name);
          if (!skill) return { error: `Unknown skill "${name}". Available: ${names.join(', ')}.` };
          return { name: skill.name, instructions: skill.body };
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as Tool,
      'Loading skill…',
    ),
  };

  if (!withResources.length) return tools;

  tools.read_skill_file = withStatusLabel(
    tool({
      description:
        'Read a bundled resource file from a skill (its references, CSS tokens, component docs, ' +
        'or templates). Call with no path to list the available files for a skill. Use this to ' +
        'follow file references inside a loaded skill before authoring an artifact.',
      inputSchema: z.object({
        skill: z.enum(withResources as [string, ...string[]]).describe('Skill that owns the file.'),
        path: z
          .string()
          .optional()
          .describe('Skill-relative path, e.g. "reference/COMPONENTS.md". Omit to list all files.'),
      }),
      execute: async ({ skill, path }: { skill: string; path?: string }) => {
        const res = await getResourcesFor(skill);
        const paths = Object.keys(res).sort();
        if (!path) return { skill, files: paths };
        const entry = res[path];
        if (!entry) return { error: `No file "${path}" in skill "${skill}".`, files: paths };
        if (entry.text === undefined) {
          return {
            path,
            note: `Binary asset (${entry.mime}). It is embedded automatically when you render — you do not need its contents.`,
          };
        }
        return { path, content: entry.text };
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as Tool,
    'Reading skill file…',
  );

  tools.render_artifact = withStatusLabel(
    tool({
      description:
        'Deliver an authored HTML artifact (deck, document, or social card from the design-system ' +
        'skill) to the Slack thread as ONE self-contained file. Reference skill assets with ' +
        'skill-root-relative paths (e.g. "core/tokens.css", "brands/base/brand.css", ' +
        '"core/deck-runtime.js"); they are inlined and fonts are embedded automatically. The ' +
        'delivered HTML opens in any browser and exports to PDF from the browser print dialog.',
      inputSchema: z.object({
        filename: z.string().describe('File name ending in .html, e.g. "pitch-deck.html".'),
        html: z.string().describe('The full HTML document, with <link>/<script>/url() referencing skill assets.'),
        comment: z.string().optional().describe('Optional message to post with the file.'),
      }),
      execute: async (
        { filename, html, comment }: { filename: string; html: string; comment?: string },
        opts: { experimental_context?: unknown } = {},
      ) => {
        const ctx = opts.experimental_context as RuntimeCtx | undefined;
        if (!ctx?.channelId) return { ok: false, error: 'No channel context available to upload into.' };

        const result = await bundleArtifact(html);

        const name = filename.endsWith('.html') ? filename : `${filename}.html`;
        const uploadArgs = {
          channel_id: ctx.channelId,
          filename: name,
          content: result.html,
          title: name,
          ...(ctx.threadTs ? { thread_ts: ctx.threadTs } : {}),
          ...(comment ? { initial_comment: comment } : {}),
        } as Parameters<WebClient['filesUploadV2']>[0];
        await slackClient().filesUploadV2(uploadArgs);

        return {
          ok: true,
          sizeKb: Math.round(Buffer.byteLength(result.html, 'utf8') / 1024),
          selfContained: result.residual.length === 0,
          // Surface problems so you can fix asset paths and re-render.
          ...(result.missing.length ? { missingRefs: result.missing } : {}),
          ...(result.residual.length ? { unresolvedRefs: result.residual } : {}),
          ...(result.remote.length ? { remoteRefs: result.remote } : {}),
        };
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as Tool,
    'Rendering artifact…',
  );

  // Optional server-side PDF export (only when Vercel Sandbox is available).
  Object.assign(tools, exportPdfTool());

  return tools;
}
