# Ekko

[![npm](https://img.shields.io/npm/v/create-ekko-agent.svg?label=create-ekko-agent)](https://www.npmjs.com/package/create-ekko-agent)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

A Slack-native AI agent template. Built on Vercel's Chat SDK + AI SDK, with Composio for 1000+ OAuth-brokered tools, MCP server support, custom tools as a first-class extension point, and Postgres pgvector memory. Deployable in minutes.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjfeilberg%2Fekko&env=COMPOSIO_API_KEY,SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET&envDescription=See%20.env.example%20for%20all%20variables.%20Neon%20%26%20Upstash%20can%20be%20added%20as%20Vercel%20integrations%20after%20first%20deploy.&envLink=https%3A%2F%2Fgithub.com%2Fjfeilberg%2Fekko%2Fblob%2Fmain%2F.env.example)

## First-time setup

One command from nothing to a working bot:

```bash
npx create-ekko-agent my-agent
```

That's it. The CLI walks you through:
1. Cloning the template into `./my-agent`
2. Installing dependencies
3. Linking to a Vercel project (sign in if needed)
4. Creating the Slack app + OAuth install
5. Writing env vars to Vercel + deploying
6. Updating the Slack manifest with your production URL

Total time: ~3 minutes. After it finishes, open Slack and DM Ekko.

**Already cloned the repo and just want to run setup?**

```bash
pnpm install && pnpm bootstrap
```

For deeper customization (persona, custom tools, MCP servers) see the rest of this README.

## Configuration

Defaults work. Override when you need to:

**Storage**
- `DATABASE_URL` is auto-injected by Vercel when you add Neon Postgres via Marketplace (recommended — auto-suspends on idle, cheap for Slack bots). Any standard Postgres connection string works — Neon, Supabase, Railway, local. Run `pnpm db:push` to apply migrations after.
- `REDIS_URL` is auto-injected by Upstash Marketplace. `pnpm bootstrap` provisions Upstash automatically alongside Neon. Without it, thread-follow silently breaks across Fluid Compute instances and event-dedup is per-instance only.

**Model**
- `LLM_MODEL` (default `anthropic/claude-haiku-4.5`) selects the agent's model through Vercel AI Gateway. The default is chosen so a fresh free-tier install responds out of the box; Opus / Sonnet require paid AI Gateway credits and will 403 every turn until you add billing. See [ai-gateway.vercel.sh/v1/models](https://ai-gateway.vercel.sh/v1/models) for the catalog. **Use dot-separated versions** (e.g. `claude-haiku-4.5`, `claude-opus-4.8`) — Gateway IDs differ from Anthropic's direct-API hyphen form (`claude-opus-4-8`).

**Composio (optional)**
- API key at [dashboard.composio.dev](https://dashboard.composio.dev) → set `COMPOSIO_API_KEY`. Without it, the agent runs on MCP + custom + built-in tools only.
- `COMPOSIO_ENABLED_TOOLKITS=gmail,linear` restricts the agent to a subset of your connected toolkits.

**Access control**
- Default: open to anyone the bot can see in your Slack workspace.
- To restrict: `EKKO_ACCESS_MODE=allowlist` plus `EKKO_ALLOWED_USERS` and/or `EKKO_ALLOWED_CHANNELS` (comma-separated Slack IDs).

## Working with Vercel env vars — footguns to know

A couple of Vercel CLI behaviors that bit early testers:

- **`vercel env add <KEY> production` via piped stdin silently writes an empty value.** Vercel CLI's TTY-style prompts don't reliably read piped input. Always use `--value <V> --force --yes` for non-interactive writes (the `bootstrap` script does this internally for Slack tokens, the Composio key, and `CRON_SECRET`). If you're scripting your own env writes — for example overriding `LLM_MODEL` — use the same pattern, the Vercel REST API, or the dashboard.
- **`vercel env pull .env.local` returns sensitive values as empty strings.** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `COMPOSIO_API_KEY` are marked Sensitive by Vercel (set by `bootstrap`), which means the dashboard and the CLI's pull command can never read them back — only your function code can decrypt them at runtime. This is expected Vercel behavior, but surprising for local debugging. If you need a sensitive value locally, copy it once from wherever you originally generated it (e.g. the Slack OAuth flow) and stash it in your own password manager.

## Slack access — what the bot can see vs. what you can see

Ekko has two channels of access to Slack data, with different semantics:

### Bot scopes (workspace install)

The Slack app's manifest scopes (`channels:history`, `groups:history`, `im:history`, `chat:write`, etc.) let Ekko act *as itself*: it can read messages in channels it's invited to, post messages, and listen to events directed at it. It **cannot** read your DMs with other people, your private channels you didn't invite it to, or your saved/starred items.

### Composio's `slack` toolkit (per-user OAuth)

For *personal* Slack access — your DMs with anyone, your private channels, your drafts and saved items — connect the **Slack toolkit via Composio** at https://dashboard.composio.dev. The agent then has tools to act *as you* with your permissions. With the Tool Router pattern, connected toolkits auto-appear on the next agent turn — no env var or redeploy needed.

**Use both**, not one or the other. They cover complementary surfaces.

## Adding custom tools

Drop a file in `lib/tools/custom/`:

```ts
// lib/tools/custom/sku-lookup.ts
import { tool } from 'ai';
import { z } from 'zod';
import { withStatusLabel } from '../registry';

export const skuLookup = withStatusLabel(
  tool({
    description: 'Look up internal product SKUs by name.',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }, opts: { experimental_context?: unknown } = {}) => {
      // experimental_context: { slackUserId, teamId, channelId, threadTs, composioEntityId }
      return await fetchSku(name);
    },
  }),
  'Looking up SKU…',
);
```

Register it in `lib/tools/custom/index.ts`:

```ts
import { skuLookup } from './sku-lookup';
export const customTools = { skuLookup };
```

It will be available to the agent on the next deploy.

## Adding remote MCP servers

Edit `lib/tools/custom/mcp-servers.ts`:

```ts
export const mcpServers: Record<string, MCPServerConfig> = {
  mycompany: {
    url: 'https://mcp.mycompany.com',
    authorization: () => `Bearer ${process.env.MYCOMPANY_TOKEN ?? ''}`,
  },
};
```

Tools auto-prefix with the server name (`mycompany_search`, etc.) and appear in the agent's tool surface.

## Customizing the system prompt

Edit `lib/agent/persona.ts` — your personality + task focus go there. The formatting/disclaimer/tools rules live in `lib/agent/system-prompt.ts` (upstream-owned). For quick experiments, set the `SYSTEM_PROMPT_OVERRIDE` env var.

## Adding Composio tools

Connect any Composio-supported service via the [Composio dashboard](https://dashboard.composio.dev) or by clicking the connect link the agent DMs you on first use. New tools become available automatically on the next agent turn — no env var or redeploy needed.

If you want to restrict the agent to a specific subset of your connected toolkits (e.g., for governance), set `COMPOSIO_ENABLED_TOOLKITS=gmail,linear` and only those will be exposed to the agent.

Composio is optional. If you skip it, the agent still works with MCP servers, custom tools, and built-in Slack tools.

## Memory

Conversation history is persisted to Postgres (`messages` table) with embeddings via pgvector. The agent recalls relevant prior conversations across threads using vector similarity. Recent thread context comes from Slack directly via the Chat SDK. Old messages are summarized nightly by the `/api/cron/compact` cron.

## Architecture

See `docs/superpowers/specs/2026-05-26-slack-agent-template-design.md` (original design) and `docs/superpowers/plans/2026-06-01-chat-sdk-migration.md` (latest refactor to Chat SDK).

## Forking for personal use

This template is designed to be forked: you maintain your fork, deploy it to your Slack, and pull upstream improvements over time. The customization points (`lib/tools/custom/`, `lib/agent/persona.ts`) are designed not to conflict on `git merge upstream/main`.

To enable automatic weekly sync PRs from upstream, set the `UPSTREAM_REPO` repo variable on your fork (e.g., `someone/ekko`). The workflow at `.github/workflows/sync-upstream.yml` handles the rest.

See `CLAUDE.md` for the extension-point discipline.
