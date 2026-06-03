# Slack-Native AI Agent Template — Design

- **Date:** 2026-05-26
- **Status:** Draft (pending implementation plan)
- **Inspiration:** [ComposioHQ/trustclaw](https://github.com/ComposioHQ/trustclaw) (Telegram → Slack, dashboard → Slack-as-UI, Better Auth → Slack-workspace tenancy)

## 1. Summary

A forkable, Vercel-deployable template for building Slack-first AI agents. The agent uses Slack's *Agents & AI Apps* surface (Assistant container, streaming, suggested prompts, auto-titled threads) and operates inside a single Slack workspace per deployment. It accesses Composio's 1000+ OAuth-brokered tools via per-Slack-user entities, plus first-class custom tools dropped into `lib/tools/custom/`. The agent runtime is the Vercel AI SDK over the Vercel AI Gateway (Claude default). Memory is in Supabase Postgres with pgvector, using a 3-layer model (recent verbatim, summaries, vector recall) ported from trustclaw.

## 2. Goals

- **Slack as the primary channel.** Fully leverage the Assistant container UX — streaming, status, suggested prompts, auto-titled threads, `assistant.search.context`.
- **Composio + custom tools as peers.** Both surface through the same registry handed to the agent loop. Adding a custom tool is one file + one export.
- **Easily deployable.** A forker should go from `Use this template` to a running agent in their Slack in under 30 minutes.
- **Easily customizable.** System prompt, suggested prompts, custom tools, toolkit allowlist — all in obvious files, all with sensible defaults.
- **Cleanly extensible.** Architecture should accommodate additional channels (Discord, Telegram, Teams) as a future extension without re-shaping the agent loop.

## 3. Non-goals (v1)

- Multi-workspace OAuth distribution (single-workspace by default; documented as future extension).
- Admin UI / dashboard. Slack is the UI; Supabase Studio inspects memory; Composio dashboard manages tool catalogs.
- Multi-modal inputs (files, images, audio).
- Reaction-based feedback (`reaction_added`).
- Interactive Block Kit beyond message rendering (no buttons / modals / workflow steps).
- Redis-backed resumable streams.
- Slack workflow steps / shortcuts.

## 4. Stack

| Layer | Choice |
|---|---|
| Runtime | Node 24 LTS on Vercel Fluid Compute |
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| LLM | Claude (`anthropic/claude-opus-4-7`) via Vercel AI Gateway |
| Agent loop | Vercel AI SDK v6 (`streamText` with tool loop) |
| Tools | Composio (per-Slack-user entities) + custom AI SDK `tool()` defs |
| Slack | Vercel Chat SDK (Slack adapter) + direct `@slack/web-api` for `assistant.*` endpoints |
| Database | Supabase Postgres + pgvector |
| Embeddings | AI Gateway embedding endpoint (1536-dim) |
| Project config | `vercel.ts` (latest API) |
| Package manager | pnpm |
| Validation | zod (env + tool input schemas) |
| Logging | pino |
| Tests | vitest (native TS via `--experimental-strip-types`) |

## 5. Architecture

```
                 Slack
                   │
                   ▼ (events, signed)
       ┌───────────────────────────┐
       │ /api/slack/events         │  HMAC verify → ack <3s
       └────────────┬──────────────┘
                    │ after()
                    ▼
       ┌───────────────────────────┐
       │ event router              │  routes by type
       └────────────┬──────────────┘
                    ▼
       ┌───────────────────────────┐
       │ handlers/{message-im,…}   │
       └────────────┬──────────────┘
                    ▼
       ┌───────────────────────────┐
       │ agent loop (AI SDK)       │  streamText + tool loop
       └─┬──────────┬──────────┬───┘
         │          │          │
         ▼          ▼          ▼
   tools         memory      slack web API
   registry      (pgvector)  (stream, status,
   (composio +               suggested prompts,
   custom)                   title, search.context)
                    │
                    ▼ embeddings + final turn
              Supabase (messages, summaries)
```

## 6. Component layout

```
slack-agent-template/
├── app/
│   ├── api/
│   │   ├── slack/
│   │   │   ├── events/route.ts          ← HMAC, ack, route
│   │   │   └── interactions/route.ts    ← Block Kit actions (minimal)
│   │   ├── composio/callback/route.ts   ← OAuth return for tool connect
│   │   └── cron/compact/route.ts        ← daily memory summarization
│   └── layout.tsx
├── lib/
│   ├── agent/
│   │   ├── loop.ts                      ← streamText tool loop
│   │   ├── context.ts                   ← 3-layer recall (verbatim/summary/vector)
│   │   ├── system-prompt.ts             ← getSystemPrompt(ctx)
│   │   ├── suggested-prompts.ts         ← getSuggestedPrompts(ctx)
│   │   └── prepare.ts                   ← assemble run inputs
│   ├── slack/
│   │   ├── verify.ts                    ← HMAC + replay guard
│   │   ├── client.ts                    ← @slack/web-api wrapper
│   │   ├── handlers/
│   │   │   ├── index.ts                 ← dispatch table
│   │   │   ├── assistant-thread-started.ts
│   │   │   ├── assistant-thread-context-changed.ts
│   │   │   ├── message-im.ts
│   │   │   └── app-mention.ts
│   │   ├── streaming.ts                 ← AI SDK stream → chat.appendStream
│   │   ├── blocks.ts                    ← Block Kit builders
│   │   └── mrkdwn.ts                    ← Markdown → mrkdwn safety net
│   ├── tools/
│   │   ├── composio.ts                  ← Composio → AI SDK tools[] adapter
│   │   ├── custom/
│   │   │   ├── index.ts                 ← export const customTools = { … }
│   │   │   └── example.ts               ← reference custom tool
│   │   ├── builtin.ts                   ← Slack-native tools (search.context, etc.)
│   │   └── registry.ts                  ← merge → unified tools map
│   ├── memory/
│   │   ├── store.ts                     ← persist messages + embeddings
│   │   └── summarize.ts                 ← compaction job
│   ├── supabase/
│   │   ├── server.ts                    ← service-role client
│   │   └── client.ts                    ← anon (currently unused; future admin UI)
│   ├── env.ts                           ← zod-validated config
│   └── log.ts                           ← pino
├── supabase/
│   └── migrations/0001_init.sql
├── scripts/
│   └── setup.mjs                        ← interactive env + deploy walkthrough
├── slack-manifest.yaml                  ← pre-configured Slack app manifest
├── vercel.ts                            ← project config
├── package.json
├── tsconfig.json
├── .env.example
├── README.md                            ← fork-and-deploy guide
└── CLAUDE.md                            ← AI dev guidance for forkers
```

## 7. Turn lifecycle

1. User DMs the bot → Slack delivers `message.im` to `/api/slack/events`.
2. Handler reads raw body, verifies HMAC against `SLACK_SIGNING_SECRET`, checks `X-Slack-Request-Timestamp` (reject >5 min).
3. If `event.type === 'url_verification'`, return `{ challenge }`. Otherwise return HTTP 200 immediately and call `after(() => handleEvent(event))`.
4. Drop self-messages (bot user id resolved once via `auth.test` and cached in `app_state`).
5. Resolve `slack_user_id → composio_entity_id` (insert row in `slack_users` on first contact, entity id = `slack:{team_id}:{user_id}`).
6. `assistant.threads.setStatus(channel, thread_ts, 'Thinking…')`.
7. Build context (`lib/agent/context.ts`):
   - **Recent verbatim**: last 12 messages of current thread (`conversations.replies` if persisted state lags, otherwise DB).
   - **Summaries**: rows from `summaries` for `(slack_user_id, thread_ts)`, oldest first.
   - **Vector recall**: embed current user text, top-5 nearest from `messages` scoped to `slack_user_id`, excluding current thread.
8. Build tools (`lib/tools/registry.ts`): `composio.getTools({ entityId, toolkits })` ∪ `customTools` ∪ `builtinSlackTools`. Each tool optionally carries `experimental_meta.slackStatusLabel` for friendly status text.
9. `chat.startStream(channel, thread_ts)` opens the Slack stream.
10. `streamText({ model, system, messages, tools })` runs the tool loop. As tokens arrive: `chat.appendStream(text_chunk)`. On tool-call start: `setStatus(toolLabelFor(name))` and an `appendStream` task event with `task_display_mode: 'task'`. On tool result: append.
11. If a Composio tool returns `connection_required`: agent loop intercepts, calls `composio.createConnectionLink({ entityId, toolkit })`, posts the connect URL in-thread via the existing stream, `chat.stopStream` with an "I need access to your X — click here" final message, marks the turn incomplete, returns.
12. On final answer: `chat.stopStream` with full Block Kit message — section for body (mrkdwn), context block for sources/disclaimer ("Generated by AI — verify before acting").
13. Persist turn to `messages` (user + assistant rows with embeddings; tool rows without embeddings).
14. If this is the first message in the thread, `assistant.threads.setTitle(channel, thread_ts, <generated short title>)`.
15. On any error: `chat.stopStream` with a graceful "I hit an error after doing X — you can retry or rephrase" message, `setStatus('')`, log structured error.

## 8. Slack integration

### 8.1 Events handled

| Event | Purpose |
|---|---|
| `assistant_thread_started` | Send welcome (rich text block), call `setSuggestedPrompts`, set initial title placeholder |
| `assistant_thread_context_changed` | Stash new `channel_id` in per-thread state for `assistant.search.context` scoping |
| `message.im` | Primary turn handler (DMs to the bot) |
| `app_mention` | Same handler shape, anchored on the channel thread (`thread_ts ?? event.ts`) |

### 8.2 Required Slack scopes (manifest)

`assistant:write`, `chat:write`, `chat:write.public`, `im:history`, `im:read`, `im:write`, `app_mentions:read`, `channels:history`, `groups:history`, `users:read`, `search:read.public`.

### 8.3 Streaming pattern

`chat.startStream` → repeated `chat.appendStream` (text chunks + optional task events with `task_display_mode: 'task'`) → `chat.stopStream` (final Block Kit `blocks`). Constraints (per Slack docs): blocks can only appear in `stopStream`. Streaming disables unfurling.

### 8.4 Status lifecycle

- Set immediately on receiving a message ("Thinking…").
- On each tool call start: tool-specific label.
- On final response: clear (empty string).
- On error: clear, then post error message via `stopStream`.

### 8.5 Formatting

Slack mrkdwn (not standard Markdown) in section blocks. The system prompt instructs the LLM to emit mrkdwn directly. As a safety net, `lib/slack/mrkdwn.ts` converts common drifts (`**bold**` → `*bold*`, `[label](url)` → `<url|label>`, fenced code preserved as triple-backtick). For headings or tables (which mrkdwn doesn't support natively), fall back to a `markdown` block element.

### 8.6 Disclaimer

Every final message includes a small context block: *"Generated by AI — please verify before acting on it."* Per Slack agent guidelines.

## 9. Composio integration

### 9.1 Per-user entity model

- `slack_users.composio_entity_id` is the Composio entity for that Slack user.
- Created lazily on first interaction; entity id format: `slack:{team_id}:{user_id}`.
- Tools resolved per turn: `composio.getTools({ entityId, toolkits: enabledToolkits })`.

### 9.2 Connect-on-demand flow

When a tool call requires an account the user hasn't connected:

1. Composio returns `connection_required` (or similar; exact API per current Composio SDK).
2. Agent loop calls `composio.createConnectionLink({ entityId, toolkit })`.
3. The link is posted in-thread (within the active stream) with a brief explanation.
4. The turn ends (stopStream) marked incomplete.
5. `/api/composio/callback` confirms the connection. The route posts a small follow-up DM "✓ Connected — try your question again."

### 9.3 Toolkit allowlist

- `COMPOSIO_ENABLED_TOOLKITS` env var: comma-separated list (e.g., `gmail,github,linear,calendar`).
- Default: unset → all available toolkits.
- Forkers can scope the agent to a curated set for a more focused use case.

### 9.4 Status labels for Composio tools

The Composio adapter (`lib/tools/composio.ts`) maps tool names to status labels heuristically (e.g., `gmail_*` → "Checking email…", `github_*` → "Searching GitHub…"). The mapping is a small table that forkers can extend.

## 10. Custom tools

### 10.1 Authoring

```ts
// lib/tools/custom/sku-lookup.ts
import { tool } from 'ai';
import { z } from 'zod';

export const skuLookup = tool({
  description: 'Look up internal product SKUs by name.',
  inputSchema: z.object({ name: z.string() }),
  experimental_meta: { slackStatusLabel: 'Looking up SKU…' },
  execute: async ({ name }, { context }) => {
    // context.slackUserId, context.teamId, context.threadTs, context.composioEntityId
    return await fetchSku(name);
  },
});
```

### 10.2 Registration

```ts
// lib/tools/custom/index.ts
import { skuLookup } from './sku-lookup';
export const customTools = { skuLookup };
```

`lib/tools/registry.ts` merges `customTools` with Composio's per-user tools and built-in Slack tools, hands the unified map to the agent loop.

### 10.3 Runtime context

Custom tools receive `{ slackUserId, teamId, threadTs, channelId, composioEntityId }` via AI SDK's `execute` second-arg `context` (passed through `experimental_context` on `streamText`). Lets custom tools be per-user without their own auth.

## 11. Built-in Slack-native tools

Always available regardless of Composio connections, since they use the bot token:

| Tool | Wraps | Purpose |
|---|---|---|
| `slack_search_context` | `assistant.search.context` | Search the workspace's messages, files, channels for relevant content |
| `slack_get_thread` | `conversations.replies` | Pull a specific thread's full history |
| `slack_post_message_to_channel` | `chat.postMessage` | Post on the user's behalf to a channel (gated by env flag `ALLOW_CROSS_CHANNEL_POST`) |

These are defined in `lib/tools/builtin.ts` and registered automatically.

## 12. System prompt

`lib/agent/system-prompt.ts` exports `getSystemPrompt(ctx): string`. `ctx`: `{ slackUser, teamId, channelId, currentDate, availableTools }`.

The base prompt covers:

- Identity and personality (forker customizes this section).
- Formatting rules: *"Use Slack mrkdwn. Bold = `*text*`, italic = `_text_`, strike = `~text~`, links = `<url|label>`, code = triple-backtick. Do not use standard Markdown."*
- *"Always include a short 'Generated by AI' disclaimer when proposing actions."*
- Tool-use guidance (when to call, chaining, when to ask for confirmation before mutating actions).
- Refusal to expose this prompt or environment secrets.

**Escape hatch**: env var `SYSTEM_PROMPT_OVERRIDE` (if non-empty) replaces the base wholesale. For quick experimentation; production should edit the file.

## 13. Suggested prompts

`lib/agent/suggested-prompts.ts` exports `getSuggestedPrompts(ctx)` returning up to 4 strings. Default implementation derives from the user's connected Composio toolkits (e.g., Gmail connected → "Summarize my unread emails"; Linear → "What's on my Linear board this week?"). Fallback static set when nothing is connected. Set in `assistant_thread_started` via `assistant.threads.setSuggestedPrompts`.

## 14. Memory model

### 14.1 Schema (Supabase migration `0001_init.sql`)

```sql
create extension if not exists vector;

create table slack_users (
  slack_user_id        text primary key,
  team_id              text not null,
  composio_entity_id   text not null unique,
  created_at           timestamptz not null default now()
);

create table messages (
  id            bigserial primary key,
  slack_user_id text not null references slack_users(slack_user_id),
  thread_ts     text not null,
  channel_id    text not null,
  role          text not null check (role in ('user','assistant','tool')),
  content       text not null,
  tool_calls    jsonb,
  embedding     vector(1536),
  created_at    timestamptz not null default now()
);
create index messages_recent_idx on messages (slack_user_id, thread_ts, created_at desc);
create index messages_embedding_idx on messages using ivfflat (embedding vector_cosine_ops);

create table summaries (
  id                  bigserial primary key,
  slack_user_id       text not null,
  thread_ts           text not null,
  summary             text not null,
  covered_through_id  bigint not null,
  created_at          timestamptz not null default now()
);
create index summaries_lookup_idx on summaries (slack_user_id, thread_ts, created_at desc);

create table app_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
```

RLS: all tables have RLS enabled with no policies — service-role access only. The anon client is currently unused.

### 14.2 Embeddings policy

- `user` and `assistant` rows: embed `content` at write time (via AI Gateway embedding endpoint).
- `tool` rows: stored (for replay/debug) but not embedded.

### 14.3 3-layer recall

Built fresh on every turn in `lib/agent/context.ts`:

1. **Recent verbatim** (capacity-bounded by token budget, default last 12 messages).
2. **Summaries** for this `(slack_user_id, thread_ts)`, oldest first.
3. **Vector recall**: top-5 nearest neighbors over `messages.embedding`, scoped to `slack_user_id`, excluding the current `thread_ts`.

The three layers are concatenated into the prompt with clear section headers ("Recent thread", "Earlier summary", "Other relevant context") so the LLM can weight them correctly.

### 14.4 Compaction

`/api/cron/compact` runs daily at 03:00 UTC (`vercel.ts` cron). For each `(slack_user_id, thread_ts)` where `count(messages) > 40` or oldest unsummarized message is older than 7 days: summarize via LLM, insert `summaries` row with `covered_through_id` set to the last summarized message id. Raw rows remain for embeddings; context builder uses `covered_through_id` to know which rows to skip in the verbatim layer.

## 15. Deployment

### 15.1 README walkthrough (target: <30 min)

1. Click **Use this template** on GitHub → clone locally.
2. `pnpm install`.
3. `pnpm dlx vercel link`.
4. Create Supabase project. Copy `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
5. `pnpm supabase db push` to apply `supabase/migrations/0001_init.sql`.
6. At https://api.slack.com/apps → **Create New App → From manifest**, paste `slack-manifest.yaml` (after substituting the URL placeholder). Install to your workspace. Copy bot token (`xoxb-…`) and signing secret.
7. Generate `COMPOSIO_API_KEY` (Composio dashboard) and `AI_GATEWAY_API_KEY` (Vercel dashboard).
8. `vercel env add` for each required var (or use `.env.local` + `vercel env pull` once linked).
9. `pnpm dlx vercel deploy --prod`.
10. Update the Slack app's event subscription URL to `<deploy-url>/api/slack/events`. Verify shows green.
11. DM the bot in Slack — it should respond.

### 15.2 Helper script

`scripts/setup.mjs`: interactive node script (using native `readline`) that prompts for each env var, writes `.env.local`, runs `vercel env add` calls, prints the manifest URL substitution, and reminds about post-deploy URL setup. No magic — just orchestration.

### 15.3 Slack manifest

`slack-manifest.yaml` pre-configured with all scopes from §8.2, subscribed events from §8.1, `assistant:write` feature enabled, app home Messages tab on, event URL placeholder `https://YOUR-VERCEL-URL/api/slack/events`.

## 16. `vercel.ts`

```ts
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    { path: '/api/cron/compact', schedule: '0 3 * * *' },
  ],
  functions: {
    'app/api/slack/events/route.ts': { maxDuration: 300 },
    'app/api/cron/compact/route.ts': { maxDuration: 800 },
  },
};
```

## 17. Environment variables

All loaded and validated at boot in `lib/env.ts` (zod, fail-fast):

| Var | Required | Purpose |
|---|---|---|
| `SLACK_BOT_TOKEN` | yes | `xoxb-…` |
| `SLACK_SIGNING_SECRET` | yes | HMAC verification |
| `COMPOSIO_API_KEY` | yes | Composio control plane |
| `SUPABASE_URL` | yes | DB endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side DB access |
| `AI_GATEWAY_API_KEY` | yes | LLM + embeddings |
| `CRON_SECRET` | yes | Auto-injected by Vercel; verified in cron route |
| `LLM_MODEL` | no | Default `anthropic/claude-opus-4-7` |
| `EMBEDDING_MODEL` | no | Default `openai/text-embedding-3-small` (1536-dim) |
| `COMPOSIO_ENABLED_TOOLKITS` | no | CSV allowlist |
| `SYSTEM_PROMPT_OVERRIDE` | no | Replaces base prompt |
| `ALLOW_CROSS_CHANNEL_POST` | no | Enables `slack_post_message_to_channel` built-in tool |

## 18. Async-ack pattern

Slack requires HTTP 200 within 3 s. Strategy:

```ts
// app/api/slack/events/route.ts (sketch)
import { after } from 'next/server';
import { verifySlackSignature } from '@/lib/slack/verify';
import { dispatch } from '@/lib/slack/handlers';

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifySlackSignature(req.headers, body)) {
    return new Response('bad signature', { status: 401 });
  }
  const event = JSON.parse(body);
  if (event.type === 'url_verification') {
    return Response.json({ challenge: event.challenge });
  }
  after(() => dispatch(event));
  return new Response(null, { status: 200 });
}
```

`after()` (stable in Next.js 16) runs the handler after the response is sent. The handler has up to `maxDuration` (300s) to complete the agent turn, including tool calls.

## 19. Error handling

- Each event handler wraps the agent loop in try/catch.
- On caught error: `chat.stopStream` with a graceful "I hit an error after doing X — you can retry or rephrase" message, `setStatus('')`, structured log via pino.
- No PII in logs — only IDs.
- Signature verification failures return 401 without logging the body.
- Composio `connection_required` is **not** an error — it's a normal turn outcome (see §9.2).

## 20. Testing strategy

Lightweight — full coverage is the forker's responsibility:

- Unit: `lib/slack/verify.ts` (signature, timestamp replay)
- Unit: `lib/slack/mrkdwn.ts` (Markdown→mrkdwn conversion)
- Unit: `lib/tools/registry.ts` (merge order, status-label resolution, name collision handling)
- Unit: `lib/agent/context.ts` (3-layer assembly, token budgets)
- Integration: one happy-path turn test with mocked Slack Web API and mocked AI Gateway
- Run via `vitest`; Node 22+ native TS stripping (no build step for tests)

## 21. Open questions / future work

- **Multi-workspace OAuth distribution.** Schema: `slack_installations` table keyed by `team_id`. Routes: `/api/slack/install`, `/api/slack/oauth`. Token rotation if enabled. "Add to Slack" button. Document as `docs/extensions/multi-workspace.md` when first needed.
- **File / image input.** Slack delivers a `files` array. Future: download, transcribe / vision-describe via the gateway, inject into context.
- **Reaction-based feedback.** Subscribe `reaction_added` → store on `messages.feedback` JSONB column → use for prompt tuning over time.
- **Resumable streams via Redis.** Useful for long tool sequences that survive cold starts. Defer until a forker hits the wall.
- **Multi-channel via Chat SDK adapters.** Telegram, Discord, Teams. Natural extension once Slack-first is solid — Chat SDK was chosen partly to make this cheap.
- **Composio identity switch UI.** Let a Slack user act as different Composio entities (e.g., work vs. personal Gmail). Probably needs a small admin tab; defer.
- **Built-in `slack_search_context` tuning.** Surface scope (channel/all) controls; weighting heuristics. Tune once real users surface failure modes.

---

**Next step:** invoke the `superpowers:writing-plans` skill to produce an implementation plan from this spec, in subagent-driven slices.
