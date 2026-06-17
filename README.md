# Ekko

[![npm](https://img.shields.io/npm/v/create-ekko-agent.svg?label=create-ekko-agent)](https://www.npmjs.com/package/create-ekko-agent)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

A Slack-native AI agent template. Built on Vercel's Chat SDK + AI SDK v6, with three tool layers (Composio's 1000+ OAuth-brokered apps, remote MCP servers, and your own first-class custom tools), pgvector long-term memory, and packaged **Agent Skills** — including one that turns a request into an on-brand PDF deck, document, or social card, delivered right in the thread. One command from nothing to a deployed bot.

## Quickstart

One command, ~3 minutes, from nothing to a working bot:

```bash
npx create-ekko-agent my-agent
```

The CLI handles the whole path:

1. Clones the template into `./my-agent`
2. Installs dependencies
3. Links a Vercel project (sign in if needed)
4. Creates the Slack app + OAuth install
5. Writes env vars to Vercel and deploys
6. Patches the Slack manifest with your production URL

When it finishes, open Slack and DM Ekko.

**Prerequisites:** Node 22+, [pnpm](https://pnpm.io/installation), the Vercel CLI (`npm i -g vercel && vercel login`), and a Slack workspace where you can install apps.

Already cloned the repo and just want setup?

```bash
pnpm install && pnpm bootstrap
```

## What you get

- **Three tool layers, one surface.** [Composio](https://composio.dev) Tool Router (1000+ OAuth apps — Gmail, Linear, Notion, …) brokered per Slack user; remote **MCP servers** you list in a single file; and **custom tools** as a first-class extension point. Newly connected Composio toolkits appear on the next turn — no env var, no redeploy.
- **Agent Skills.** Packaged, on-demand task instructions following the open `SKILL.md` standard, with progressive disclosure (L1 metadata always in the prompt, L2 body loaded on demand, L3 bundled assets). Ships with three: `design-system` (turn notes into a branded deck / A4 document / social card, rendered server-side to a **PDF** in the thread), `email-triage`, and `meeting-notes`.
- **Long-term memory.** Postgres + pgvector embeds past conversations and recalls relevant context across threads automatically. Recent thread history comes straight from Slack.
- **Streaming with live progress.** Replies stream into Slack as Markdown; a collapsible task card shows the tool/reasoning chain as it runs.
- **Production-ready plumbing.** Slack signature verification, the 3-second ack, event de-dup, an allowlist access mode, and nightly memory compaction are all handled.

## Architecture

- `app/api/webhooks/[platform]/route.ts` — thin webhook that delegates to the Chat SDK (signature verification, URL verification, the 3s ack, and retries are handled for you).
- `lib/bot.ts` — the `Chat` instance and Slack event handlers (mentions, follow-ups, slash, assistant-thread).
- `lib/agent/run-turn.ts` — the turn loop: load tools + context, run the AI SDK `ToolLoopAgent`, stream into the thread, persist, emit progress.
- `lib/agent/{persona,system-prompt}.ts` — `persona.ts` is the forker-owned voice; `system-prompt.ts` owns the framework rules.
- `lib/tools/` — `composio` + `mcp` + `custom` + `builtin`, merged in `registry.ts`.
- `lib/skills/` — the Agent Skills runtime; author skills in `catalog/<name>/SKILL.md`, compile with `pnpm skills:build`.
- `lib/memory/` — pgvector recall. `lib/db.ts` — one `DATABASE_URL`, any Postgres.

Stack: Next.js (App Router) · TypeScript strict · Vercel AI SDK v6 + AI Gateway · `@slack/web-api` · `@composio/core` · MCP SDK · Postgres/pgvector · pnpm. See **[`CLAUDE.md`](CLAUDE.md)** for the full architecture map and a "where to make changes" index — it's written for AI coding assistants and humans alike.

## Configuration

Defaults work. Override when you need to:

**Storage**
- `DATABASE_URL` is auto-injected by Vercel when you add Neon Postgres via Marketplace (recommended — auto-suspends on idle, cheap for Slack bots). Any standard Postgres connection string works — Neon, Supabase, Railway, local. Run `pnpm db:push` to apply migrations after.
- `REDIS_URL` is auto-injected by Upstash Marketplace, and `pnpm bootstrap` provisions it alongside Neon. Without it, thread-follow silently breaks across Fluid Compute instances and event de-dup is per-instance only.

**Model**
- `LLM_MODEL` (default `anthropic/claude-haiku-4.5`) selects the agent's model through Vercel AI Gateway. The default is chosen so a fresh free-tier install responds out of the box; Opus / Sonnet require paid AI Gateway credits and will 403 every turn until you add billing. See [ai-gateway.vercel.sh/v1/models](https://ai-gateway.vercel.sh/v1/models) for the catalog. **Use dot-separated versions** (e.g. `claude-haiku-4.5`, `claude-opus-4.8`) — Gateway IDs differ from Anthropic's direct-API hyphen form (`claude-opus-4-8`).

**Composio (optional)**
- API key at [dashboard.composio.dev](https://dashboard.composio.dev) → set `COMPOSIO_API_KEY`. Without it, the agent runs on MCP + custom + built-in tools only.
- `COMPOSIO_ENABLED_TOOLKITS=gmail,linear` restricts the agent to a subset of your connected toolkits.

**Skills & PDF export (optional)**
- `EKKO_ENABLED_SKILLS` is an opt-out filter (empty = all catalog skills available). `EKKO_MAX_ACTIVE_SKILLS` (default 3) caps auto-injected skill bodies per turn.
- `EKKO_PDF_EXPORT=auto` renders design-system artifacts to PDF via Vercel Sandbox when sandbox credentials are present (auto on Vercel). When off/unavailable, the delivered HTML still exports to PDF from the browser print dialog.

**Access control**
- Default: open to anyone the bot can see in your Slack workspace.
- To restrict: `EKKO_ACCESS_MODE=allowlist` plus `EKKO_ALLOWED_USERS` and/or `EKKO_ALLOWED_CHANNELS` (comma-separated Slack IDs).

See [`.env.example`](.env.example) for the full list.

## Extending

### Custom tools

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
      // experimental_context: { slackUserId, teamId, channelId, threadTs, composioEntityId, thread }
      // `thread` is the live Chat SDK thread — use thread.post({ files }) to deliver files.
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

Available to the agent on the next deploy. (Delete the bundled `example.ts` once you have your own.)

### Remote MCP servers

Edit `lib/tools/custom/mcp-servers.ts`:

```ts
export const mcpServers: Record<string, MCPServerConfig> = {
  mycompany: {
    url: 'https://mcp.mycompany.com',
    authorization: () => `Bearer ${process.env.MYCOMPANY_TOKEN ?? ''}`,
  },
};
```

Tools auto-prefix with the server name (`mycompany_search`, …) and appear in the agent's tool surface.

### Composio toolkits

Connect any Composio-supported service via the [dashboard](https://dashboard.composio.dev) or the connect link the agent DMs you on first use. New tools become available automatically on the next agent turn — no env var or redeploy. Set `COMPOSIO_ENABLED_TOOLKITS` to restrict the exposed subset. Composio is optional; skip it and the agent still runs on MCP, custom, and built-in tools.

### Skills

Create `lib/skills/catalog/<name>/SKILL.md` (the directory name must match the frontmatter `name`), then run `pnpm skills:build`. L1 metadata is always in the prompt; the model pulls the full body on demand via the `load_skill` tool. See `lib/skills/README.md`.

### Persona & system prompt

Edit `lib/agent/persona.ts` — name, voice, and task focus live there. The formatting / disclaimer / tool rules are framework-owned in `lib/agent/system-prompt.ts`. For quick experiments, set `SYSTEM_PROMPT_OVERRIDE`.

## Slack access: what the bot sees vs. what you see

Ekko has two channels of access to Slack data, with different semantics — use both, they cover complementary surfaces.

- **Bot scopes (workspace install).** The app's manifest scopes (`channels:history`, `im:history`, `chat:write`, …) let Ekko act *as itself*: read messages in channels it's invited to, post, and listen to events directed at it. It **cannot** read your DMs with other people, private channels it wasn't invited to, or your saved items.
- **Composio's `slack` toolkit (per-user OAuth).** For *personal* access — your DMs, your private channels, your drafts and saved items — connect the Slack toolkit via Composio. The agent then has tools to act *as you*, with your permissions.

## Vercel env vars: footguns to know

Two Vercel CLI behaviors that bit early testers:

- **`vercel env add <KEY> production` via piped stdin silently writes an empty value.** The CLI's TTY-style prompts don't reliably read piped input. Use `--value <V> --force --yes` for non-interactive writes (the `bootstrap` script does this for Slack tokens, the Composio key, and `CRON_SECRET`). Scripting your own writes — e.g. overriding `LLM_MODEL` — use the same pattern, the REST API, or the dashboard.
- **`vercel env pull .env.local` returns sensitive values as empty strings.** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `COMPOSIO_API_KEY` are marked Sensitive (by `bootstrap`), so the dashboard and CLI can never read them back — only your function code decrypts them at runtime. Expected Vercel behavior, but surprising locally: keep a copy of any sensitive value from where you first generated it.

## Memory

Conversation history is persisted to Postgres (`messages` table) with pgvector embeddings. The agent recalls relevant prior conversations across threads via vector similarity; recent thread context comes from Slack directly. Old messages are summarized nightly by the `/api/cron/compact` cron.

## Forking for personal use

This template is built to be forked: maintain your fork, deploy it to your Slack, and pull upstream improvements over time. The customization points (`lib/tools/custom/`, `lib/skills/catalog/`, `lib/agent/persona.ts`) are designed not to conflict on `git merge upstream/main`. To enable automatic weekly sync PRs, set the `UPSTREAM_REPO` repo variable on your fork; `.github/workflows/sync-upstream.yml` handles the rest. See [`CLAUDE.md`](CLAUDE.md) for the extension-point discipline.

## License

MIT — see [`LICENSE`](LICENSE).
