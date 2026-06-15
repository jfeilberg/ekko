import { z } from 'zod';

const toList = z.string().optional().transform((v) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [],
);

const toBool = z.string().optional().transform((v) => v === 'true');

const schema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  COMPOSIO_API_KEY: z.string().optional(),
  COMPOSIO_ENABLED_TOOLKITS: toList,
  DATABASE_URL: z.string().url().describe('Postgres connection string (Neon recommended; works with Supabase, local, etc.)'),
  AI_GATEWAY_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  // Default to a model the Vercel AI Gateway free tier allows so a fresh
  // `npx create-ekko-agent` install responds on the first message without the
  // user adding paid credits. Opus / Sonnet are paid-tier on AI Gateway and
  // return 403 with no credit — easy to upgrade to once the user has billing.
  // Vercel AI Gateway uses dot-separated versions (e.g. `claude-opus-4.8`),
  // NOT the hyphen form Anthropic's direct API uses (`claude-opus-4-8`).
  LLM_MODEL: z.string().default('anthropic/claude-haiku-4.5'),
  EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  SYSTEM_PROMPT_OVERRIDE: z.string().optional(),
  ALLOW_CROSS_CHANNEL_POST: toBool,
  MAX_AGENT_STEPS: z.coerce.number().int().positive().default(16),
  REDIS_URL: z.string().optional(),
  EKKO_ACCESS_MODE: z.enum(['open', 'allowlist']).default('open'),
  EKKO_ALLOWED_USERS: toList,
  EKKO_ALLOWED_CHANNELS: toList,
  // Optional opt-out filter for bundled skills. Empty/unset = all catalog
  // skills in lib/skills/catalog/ are available. Set to a comma-separated list
  // of skill names to restrict which ones the agent can use.
  EKKO_ENABLED_SKILLS: toList,
  // Max number of `always`/`keyword`-triggered skill bodies auto-injected into
  // the system prompt per turn. Model-loaded skills (via load_skill) are not
  // capped. 0 disables auto-injection entirely.
  EKKO_MAX_ACTIVE_SKILLS: z.coerce.number().int().nonnegative().default(3),
  // Server-side PDF export for design-system artifacts (runs headless Chromium
  // in a Vercel Sandbox). 'auto' = enable when Vercel Sandbox credentials are
  // present (VERCEL_OIDC_TOKEN, auto-injected on Vercel); 'on'/'off' to force.
  // When unavailable, delivered HTML still self-exports to PDF via the browser.
  EKKO_PDF_EXPORT: z.enum(['auto', 'on', 'off']).default('auto'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(raw: Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment: ${missing}`);
  }
  return result.data;
}

let cached: Env | undefined;
export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}
