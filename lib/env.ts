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
  // Vercel AI Gateway uses dot-separated versions (e.g. `claude-opus-4.8`),
  // NOT the hyphen form Anthropic's direct API uses (`claude-opus-4-8`).
  LLM_MODEL: z.string().default('anthropic/claude-opus-4.8'),
  EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  SYSTEM_PROMPT_OVERRIDE: z.string().optional(),
  ALLOW_CROSS_CHANNEL_POST: toBool,
  MAX_AGENT_STEPS: z.coerce.number().int().positive().default(16),
  REDIS_URL: z.string().optional(),
  EKKO_ACCESS_MODE: z.enum(['open', 'allowlist']).default('open'),
  EKKO_ALLOWED_USERS: toList,
  EKKO_ALLOWED_CHANNELS: toList,
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
