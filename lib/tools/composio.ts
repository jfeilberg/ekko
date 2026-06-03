import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { Tool } from 'ai';
import { env } from '../env';
import { log } from '../log';
import { withStatusLabel } from './registry';

type VercelComposio = Composio<VercelProvider>;

let cached: VercelComposio | undefined;

export function composioClient(): VercelComposio | undefined {
  if (!env().COMPOSIO_API_KEY) return undefined;
  if (!cached)
    cached = new Composio({
      apiKey: env().COMPOSIO_API_KEY,
      provider: new VercelProvider(),
    }) as VercelComposio;
  return cached;
}

const LABEL_RULES: Array<{ prefix: string; label: string }> = [
  { prefix: 'gmail_', label: 'Checking email…' },
  { prefix: 'github_', label: 'Searching GitHub…' },
  { prefix: 'linear_', label: 'Looking up Linear…' },
  { prefix: 'gcal_', label: 'Checking calendar…' },
  { prefix: 'calendar_', label: 'Checking calendar…' },
  { prefix: 'notion_', label: 'Searching Notion…' },
  { prefix: 'slack_', label: 'Querying Slack…' },
  { prefix: 'googledrive_', label: 'Searching Drive…' },
  { prefix: 'drive_', label: 'Searching Drive…' },
  { prefix: 'googlesheets_', label: 'Reading sheets…' },
  { prefix: 'sheets_', label: 'Reading sheets…' },
  { prefix: 'figma_', label: 'Looking up Figma…' },
  { prefix: 'stripe_', label: 'Checking Stripe…' },
];

function labelFor(name: string): string {
  const lower = name.toLowerCase();
  for (const r of LABEL_RULES) if (lower.startsWith(r.prefix)) return r.label;
  return 'Working…';
}

export async function getComposioTools(entityId: string): Promise<Record<string, Tool>> {
  const c = composioClient();
  if (!c) return {};

  try {
    // Tool Router: create a per-user session and pull whatever the user has connected.
    const session = await c.create(entityId);
    const allTools = await session.tools();

    // Optional intersection filter from env: COMPOSIO_ENABLED_TOOLKITS, comma-separated toolkit slugs.
    // Empty/unset = all connected tools. Set = restrict to matching toolkit prefixes.
    const allowlist = env().COMPOSIO_ENABLED_TOOLKITS;
    const filtered: Record<string, Tool> = {};

    for (const [name, tool] of Object.entries(allTools)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiTool = tool as unknown as Tool;
      if (allowlist.length === 0) {
        filtered[name] = withStatusLabel(aiTool, labelFor(name));
        continue;
      }
      // Tool names are typically <toolkit>_<action>; check prefix against the allowlist.
      const matches = allowlist.some((slug) => name.toLowerCase().startsWith(`${slug.toLowerCase()}_`));
      if (matches) {
        filtered[name] = withStatusLabel(aiTool, labelFor(name));
      }
    }

    return filtered;
  } catch (err) {
    log.warn({ err, entityId }, 'composio_tools_fetch_failed');
    return {};
  }
}
