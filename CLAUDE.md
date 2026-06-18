# Ekko — AI Coding Guidance

This file gives AI assistants (Claude Code, Cursor, etc.) the context they need to safely edit this codebase.

## Stack

Next.js 16 App Router · TypeScript strict · Vercel AI SDK v6 · Vercel AI Gateway (Claude default) · `@slack/web-api` · `@composio/core` + `@composio/vercel` · `@modelcontextprotocol/sdk` · Postgres + pgvector (Neon recommended, any Postgres works) · zod · pino · vitest · pnpm.

## Architecture at a glance

- `app/api/webhooks/[platform]/route.ts`: thin proxy that delegates to the Chat SDK bot via `bot.webhooks[platform]`. Slack signature verification, URL verification, retry handling, and the 3-second ack are all handled by the SDK.
- `lib/bot.ts`: Chat SDK `Chat` instance + event handlers (`onNewMention`, `onSubscribedMessage`, `onSlashCommand`, `onAssistantThreadStarted`). All Slack I/O lives here.
- `lib/agent/run-turn.ts`: shared turn logic — loads tools + context, runs `ToolLoopAgent` from the AI SDK, pipes `textStream` into `thread.post(...)`, persists the turn to Postgres, emits per-tool progress via a Chat SDK `Plan`.
- `lib/agent/system-prompt.ts`: framework rules (formatting, disclaimer, tool-use guidance). `lib/agent/suggested-prompts.ts` — upstream-owned suggestion list.
- `lib/tools/`: composio (Tool Router, dynamic per user) + mcp (remote MCP servers auto-discovered from `agent/connections/`) + custom (forker-owned tools auto-discovered from `agent/tools/`) + builtin (Slack-native via bot token), merged in `registry.ts`.
- `lib/skills/`: Agent Skills runtime. Skills are authored in `agent/skills/<name>/SKILL.md`, compiled to `lib/skills/catalog.generated.ts` by `pnpm agent:build`. Progressive disclosure: L1 metadata always in the prompt, L2 body loaded on demand via the `load_skill` tool. See `lib/skills/README.md`.
- `lib/memory/`: pgvector recall for cross-thread context. Recent thread history comes from Slack via `thread.adapter.fetchMessages` in `run-turn.ts`.
- `lib/db.ts`: memoized Postgres.js client. Single `DATABASE_URL` env var works with Neon, Supabase, local Postgres.
- `lib/access.ts`: optional allowlist by user id or channel id, controlled by `EKKO_ACCESS_MODE` env var.
- `lib/framework/`: exposes the `ekko` import alias — `defineAgent`, `defineConnection`, `defineSandbox`, `withStatusLabel`, and their types.
- `vercel.ts`: project config, cron schedule, `maxDuration: 300` on the webhook route.
- `packages/create-ekko-agent/`: standalone npm package (`create-ekko-agent`) that scaffolds a new ekko-based bot. Calls degit + pnpm install + vercel link + pnpm bootstrap.
- **`agent/`**: the fork-owned extension directory. Everything here is auto-discovered at build time by `pnpm agent:build` (runs automatically on `dev`/`build`/`test`/`typecheck`). Subfolders: `tools/`, `connections/`, `skills/`. Top-level files: `agent.ts`, `persona.ts`, `instructions.md`, `sandbox.ts`.

## Where to make changes

- **Add a tool**: drop a file in `agent/tools/<name>.ts`. The filename is the model-facing tool name. `export default` a `tool()` (from `ai`), optionally wrapped in `withStatusLabel(...)` (imported from `ekko`). No barrel file needed — auto-discovered by `pnpm agent:build`.
- **Add an MCP server**: create `agent/connections/<name>.ts`. The filename becomes the tool prefix (`acme.ts` → `acme_<tool>`). `export default defineConnection({ type: 'mcp', url, authorization })` (imported from `ekko`). Auto-discovered; no other registration needed.
- **Add a skill**: create `agent/skills/<name>/SKILL.md` (dir name must match frontmatter `name`), then run `pnpm agent:build`. `EKKO_ENABLED_SKILLS` is an optional opt-out filter. See `lib/skills/README.md`.
- **Change personality**: edit the `persona` object in `agent/persona.ts` (name, role, tone preset, traits, focus). `lib/agent/system-prompt.ts` owns the framework rules; use `SYSTEM_PROMPT_OVERRIDE` env var only for short-term experimentation (it replaces the entire prompt, including formatting/safety rules).
- **Add freeform prompt text**: edit `agent/instructions.md` — its contents are appended to the system prompt as an extra persona layer, below the framework's safety/formatting rules.
- **Set model/maxSteps defaults**: edit `agent/agent.ts` (`defineAgent({ persona, model, maxSteps })`). Env vars `LLM_MODEL` and `MAX_AGENT_STEPS` override these at runtime.
- **Configure the PDF sandbox**: edit `agent/sandbox.ts` (`defineSandbox({ runtime, setup })`).
- **Connect Composio toolkits**: Connect new services via the Composio dashboard or via the connect URL the agent sends in DM. Tools become available automatically on the next turn. `COMPOSIO_ENABLED_TOOLKITS` is an optional opt-out filter — leave it empty to allow all connected toolkits.
- **Skip Composio entirely**: omit `COMPOSIO_API_KEY`; `getComposioTools()` returns `{}` and the thread-started handler skips connection enumeration. The bot still works with MCP, custom, and built-in tools.
- **Optional env vars**: `COMPOSIO_API_KEY`, `AI_GATEWAY_API_KEY`, `CRON_SECRET` are all optional. `AI_GATEWAY_API_KEY` is auto-injected by Vercel AI Gateway. `CRON_SECRET` absence causes `/api/cron/compact` to return 503 instead of running.
- **Handle a new Slack event**: register a handler on the Chat SDK bot in `lib/bot.ts` (`chat.onNewMention`, `chat.onSlashCommand`, `chat.onAssistantThreadStarted`, etc.) — see `node_modules/chat/dist/index.d.ts` for the full list.
- **Restrict who can use the bot**: set `EKKO_ACCESS_MODE=allowlist` and populate `EKKO_ALLOWED_USERS` / `EKKO_ALLOWED_CHANNELS` env vars.
- **Production idempotency**: set `REDIS_URL` to use Redis-backed state across Vercel Fluid Compute instances.
- **Update the setup flow**: the interactive CLI lives at `scripts/bootstrap.mjs` (invoked via `pnpm bootstrap`). It creates the Slack app, captures the OAuth bot token via a localhost listener, writes env vars to Vercel, and deploys. The web `/setup` route is a static landing page that points users at `pnpm bootstrap`.

## Conventions

- ESM only (`"type": "module"`). Always `import`/`export`.
- TypeScript strict; do not loosen.
- Use `tool()` from `ai` for tool definitions — never define ad-hoc.
- Don't store Slack messages anywhere except `messages` (and only with embeddings on user/assistant rows).
- No PII in logs. Use IDs.
- Webhook routes must return 200 within 3s. Long work runs in `after()`.

## Testing

`pnpm test` runs vitest. Tests live next to source as `*.test.ts`. New logic should ship with a small unit test if possible.

## Do not

- Bypass HMAC verification.
- Commit secrets. `.env.local` is gitignored.
- Mismatch the Slack render path. Streamed agent output (`thread.post(result.fullStream)`) is sent as `markdown_text` (Slack's `markdown` block) and renders **standard Markdown** — that's what `lib/agent/system-prompt.ts` instructs the model to emit. Hand-written `thread.post("string")` / `chat.postMessage` copy is sent as `{ text }` and renders **legacy mrkdwn** (`*bold*`, `<url|label>`). Use the right syntax for the path; never tables (Slack renders none).
- Add an admin UI without first considering whether Slack is the right surface.

## Extension-point discipline (for personal forks)

The template is designed so personal forks can pull upstream improvements without merge conflicts. To keep that working:

### Safe to edit in your fork — won't conflict on upstream merges

Everything under `agent/` is fork-owned:

- `agent/tools/<name>.ts` — your custom tools (delete `example.ts`, add your own; filename = tool name)
- `agent/connections/<name>.ts` — remote MCP servers (filename = tool prefix)
- `agent/skills/<name>/SKILL.md` — your skills (run `pnpm agent:build` after editing)
- `agent/persona.ts` — assistant personality and voice
- `agent/instructions.md` — freeform prompt text appended below the framework rules
- `agent/agent.ts` — model and maxSteps defaults
- `agent/sandbox.ts` — Vercel Sandbox setup commands
- `.env.local` (gitignored) — your secrets

### Don't edit in your fork — open an upstream PR instead

If you find yourself wanting to edit any of these, the right move is to contribute the change upstream and then `git merge upstream/main` to pull it back into your fork:

- `lib/agent/system-prompt.ts` — formatting / disclaimer / tools rules (upstream-owned)
- `lib/agent/run-turn.ts`, `lib/agent/context.ts`, `lib/agent/suggested-prompts.ts`
- `lib/bot.ts`
- `lib/access.ts`
- `lib/memory/**`
- `lib/tools/{composio,mcp,builtin,registry}.ts`
- `lib/skills/{loader,parse,tools,types,resources,bundle,artifact,export,snapshot}.ts` and `scripts/build-agent.mjs` — the agent build + skills runtime (the `agent/` content is yours; the machinery is upstream-owned)
- `lib/framework/` — the `ekko` alias exports
- `app/api/**`
- `vercel.ts`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`
- `app/setup/**` — static landing page (upstream-owned)
- `scripts/bootstrap.mjs` — CLI setup script (upstream-owned)

### Sync workflow

`.github/workflows/sync-upstream.yml` opens a weekly PR with the latest upstream changes when the `UPSTREAM_REPO` repo variable is set (e.g., `you/ekko`). Conflicts open an issue instead.

To enable in your fork:
1. Go to your fork → Settings → Secrets and variables → Actions → Variables
2. Add a new repository variable `UPSTREAM_REPO` with value `<owner>/<repo>` of the template
3. Optionally trigger the workflow manually from the Actions tab to verify
