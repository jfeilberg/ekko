import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { Tool } from 'ai';
import { env } from '../env';
import { log } from '../log';
import { withStatusLabel } from './registry';

type VercelComposio = Composio<VercelProvider>;
type ComposioSession = Awaited<ReturnType<VercelComposio['create']>>;

let cachedClient: VercelComposio | undefined;

// Per-entity Tool Router session cache. Promise-valued so concurrent requests
// for the same entity share the in-flight creation. Cache lives for the
// lifetime of the Fluid Compute instance; on a cold start it's empty.
// Active users get ~100–300ms shaved off subsequent turns by skipping the
// session-establishment round-trip to Composio.
const sessionCache = new Map<string, Promise<ComposioSession>>();

export function composioClient(): VercelComposio | undefined {
  if (!env().COMPOSIO_API_KEY) return undefined;
  if (!cachedClient)
    cachedClient = new Composio({
      apiKey: env().COMPOSIO_API_KEY,
      provider: new VercelProvider(),
    }) as VercelComposio;
  return cachedClient;
}

/**
 * Get or create a Tool Router session for an entity. Cached per Fluid Compute
 * instance — repeated calls for the same entity return the same session.
 * On creation failure the entry is evicted so the next call retries fresh.
 */
export async function getComposioSession(entityId: string): Promise<ComposioSession | undefined> {
  const c = composioClient();
  if (!c) return undefined;
  let pending = sessionCache.get(entityId);
  if (!pending) {
    pending = c.create(entityId);
    sessionCache.set(entityId, pending);
    pending.catch(() => sessionCache.delete(entityId));
  }
  return pending;
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
  const session = await getComposioSession(entityId);
  if (!session) return {};

  try {
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
