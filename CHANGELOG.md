# Changelog

All notable changes to Ekko (and the `create-ekko-agent` scaffolding CLI) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/), and the project uses [semantic versioning](https://semver.org/).

## [0.1.18] — 2026-06-15

Terminal UX overhaul. Both CLIs (`create-ekko-agent` and `pnpm bootstrap`) now render with [`@clack/prompts`](https://github.com/bombshell-dev/clack) + `picocolors`, matching the clean gutter-rail aesthetic of vercel-labs/skills.

- **The left-rail gutter** ties the whole flow into one visual thread, with distinct symbols for headers (`◇`), prompts (`◆`), success/warn/error, and the intro/outro caps. It is now obvious at a glance what is a section header vs a step vs a selection.
- **Intro badge** (`┌ ekko setup `), section headers via `p.log.step`, dim secondary detail via `p.log.message`, and a boxed `p.note` summary at the end.
- **Real arrow-key menus** replace typed y/n prompts. The Composio step in particular collapsed from two sequential confirms into one clean three-way `select`: "Create a Composio account for me" / "I have a Composio API key" / "Skip for now."
- **Spinners** (`p.spinner`) with rail-aligned start/stop for every long step (provisioning, deploy, migrations, env writes, welcome DM). Noisy non-interactive child processes (`vercel env pull`, `db:push`) now run under spinners with captured output, so the rail stays unbroken.
- **Graceful Ctrl-C everywhere** via `p.isCancel` — every prompt cancels cleanly instead of leaving a half-rendered line.
- Pure presentation change: all Slack manifest/OAuth/env/Composio/deploy/migration logic is byte-for-byte identical. Adds two small, ubiquitous deps (`@clack/prompts`, `picocolors`) to the template and to `create-ekko-agent`.

## [0.1.17] — 2026-06-15

Tone-of-voice + Slack formatting overhaul of the system prompt.

- **Fix (formatting, important)**: the formatting rules were backwards for the streaming path. Agent replies are posted via `thread.post(result.fullStream)`, which the Chat SDK wraps as `{ markdown }` → Slack's `markdown_text` block → **standard Markdown** rendering. The old rules told the model to emit *legacy mrkdwn* (`*single-asterisk bold*`, `<url|label>` links, `~strike~`), which on that path renders as italic, literal text, etc. Rewrote `FORMATTING_RULES` to instruct standard Markdown (`**bold**`, `[label](url)`, `-`/`1.` lists, `>` quotes), with two Slack-specific rules: never use Markdown tables (Slack renders none — use a bulleted list with bold labels), and skip headings in favor of a short bold line. Hand-written `chat.postMessage` copy stays on the mrkdwn path and is unchanged.
- **New**: `VOICE_RULES` in the system prompt, synthesized from a GTM "humanizer" voice guide. Lead with the answer; short sentences, plain words; no em dashes; no AI throat-clearing ("I hope this helps", "Great question", "As an AI"); no hype words (seamless, leverage, unlock, elevate, …); one point per message; match length to the ask; emoji only when it carries meaning. Format lightly — most replies need no formatting at all.
- **Polish**: removed em dashes from the disclaimer rule and from the agent-sent welcome / onboarding copy (the no-tools-connected hint and the install welcome DM), so the product's own voice matches what it asks the agent to do. Refined the default persona to "a direct, competent teammate" rather than "a helpful assistant."
- Added `lib/agent/system-prompt.test.ts` to guard the new rules (standard-Markdown instruction, no-tables rule, voice rules, tool-list assembly) against regressions.
- `CLAUDE.md` "Do not" note corrected to explain the two Slack render paths precisely.

## [0.1.16] — 2026-06-13

- **Docs**: new README section "Working with Vercel env vars — footguns to know" documenting (a) `vercel env add` via piped stdin silently writes empty (use `--value --force --yes`), and (b) Sensitive env vars come back empty from `vercel env pull` by design (expected Vercel behavior, surprising for local debug).
- Tightened the storage section to reflect that Upstash is now provisioned automatically by `pnpm bootstrap` rather than "optional, recommended for prod."

## [0.1.15] — 2026-06-13

- **UX**: bootstrap now auto-provisions Upstash Redis via Vercel Marketplace immediately after Neon (the same `vercel integration add` CLI path we use for Neon, slug `upstash/upstash-kv`). Same fallback to the browser flow if the CLI path doesn't work. Cures the silent thread-follow bug that v0.1.14's warning surfaced: a fresh `npx create-ekko-agent` now ships with Redis already configured, so `thread.subscribe()` survives across Fluid Compute instances and `onSubscribedMessage` actually fires.
- The Upstash free tier (10k commands/day, 256MB) is more than enough for personal-use Slack bots. Users can decline the prompt if they want to skip it — the warning from v0.1.14 still fires at boot.

## [0.1.14] — 2026-06-13

- **Visibility**: log a startup warning when `REDIS_URL` is unset. The default `createMemoryState()` adapter doesn't survive across Fluid Compute instances, so `thread.subscribe()` set on instance A is lost when the user's reply lands on instance B — `onSubscribedMessage` silently never fires, the user sees Ekko respond to the first message and then go quiet. The warning makes the failure mode visible in Vercel runtime logs instead of buried in user confusion. (Real fix is to add Upstash Redis via Vercel Marketplace; this changelog entry is the breadcrumb that points there.)

## [0.1.13] — 2026-06-13

- **Fix**: empty-text content no longer crashes the turn. Anthropic (and other strict providers) reject messages with `text content blocks must be non-empty`, which is exactly what `chat-sdk` produces when a Slack file is uploaded with no caption — a multipart user message whose text part is `""`. Bootstrap now sanitizes every assembled message before sending: empty string content gets a `[attached content / no caption]` placeholder, and empty `{ type: 'text', text: '' }` parts inside multipart content get the same. File uploads without captions no longer surface "I hit an error pulling that together."
- Note: this is a defensive guard. Forwarding the file *content* itself to the model (PDFs, etc.) is a separate concern — `chat-sdk`'s `attachmentToPart` currently only passes images + text MIME types through. Multimodal beyond images needs a chat-sdk upstream change.

## [0.1.12] — 2026-06-13

- **UX**: Composio onboarding no longer requires a manual API-key paste. After "Connect Composio? (Y/n)" the bootstrap asks "Already have a Composio account?" If no (the common new-user case), it `POST`s to `agents.composio.dev/api/signup` (Composio's agent self-signup endpoint), captures the returned `api_key`, writes it to Vercel env, and saves the full credentials payload (including the `agent_key`) to `~/.composio/anonymous_user_data.json` so the user can later run `composio claim` from a human Composio login to take the account over. If signup fails for any reason, the script falls back to the manual paste path. Reference: [docs.composio.dev/docs/signing-up-as-an-agent](https://docs.composio.dev/docs/signing-up-as-an-agent).

## [0.1.11] — 2026-06-13

Emergency batch from end-to-end user feedback. The bootstrap was failing or producing a broken-looking agent on fresh free-tier installs; this round makes the out-of-the-box experience actually work.

- **Fix (critical)**: `vercel.ts` shipped the compact cron with `maxDuration: 800`. Vercel Hobby plan caps function timeout at 300s, so a fresh `npx create-ekko-agent` aborted at the deploy step with `The value for maxDuration must be between 1 second and 300 seconds`. Capped at 300; users on paid plans can raise it manually.
- **Fix (critical)**: `LLM_MODEL` default changed from `anthropic/claude-opus-4.8` → `anthropic/claude-haiku-4.5`. Opus and Sonnet are paid-tier on the Vercel AI Gateway free tier and return 403 on every turn — a fresh install looked completely broken until the user added paid credits. Haiku 4.5 is allowed on the free tier and the bot responds out of the box. Upgrade by setting `LLM_MODEL` env var when you've added billing.
- **Fix**: `slack-manifest.yaml` now subscribes to `message.channels` + `message.groups` events and requests `files:read` + `files:write` scopes. Without these the bot couldn't follow channel threads or interact with uploaded/shared files at all. Existing installs need to reinstall to grant the new scopes.
- **Fix**: bootstrap now generates a 32-byte hex `CRON_SECRET` and writes it to Vercel env. Without this, the `/api/cron/compact` route returned 503 and nightly memory compaction silently never ran.
- **Fix (system prompt)**: agent now knows it has persistent pgvector memory and tells users so when asked — instead of confidently claiming it has no memory and offering to build a database. Also explicitly told not to suggest connecting infrastructure (Neon, Postgres, Supabase, etc.) via Composio toolkits, since that infrastructure is already running.
- **Polish**: `package.json` `engines.node` pinned to `22.x` (was `>=22`). Stops Vercel from emitting "will auto-upgrade Node major" warning on every deploy.

## [0.1.10] — 2026-06-03

- **Performance**: Tool Router sessions are now cached per entity within a Fluid Compute instance. Previously every agent turn (and every `onAssistantThreadStarted`) called `c.create(entityId)` from scratch — paid the full session-establishment round-trip to Composio every time. Now a `getComposioSession(entityId)` helper memoizes the promise per entity, with cache eviction on creation failure so a transient error doesn't poison subsequent attempts. Saves ~100–300ms per repeat turn for active users. Cold-start cost is unchanged.

## [0.1.9] — 2026-06-03

Tier 2 chat-sdk + Composio skill polish.

- **Composio**: `onAssistantThreadStarted` now derives connected toolkits via Tool Router's `session.toolkits()` (filtered by `connection.isActive`) instead of `connectedAccounts.list({ userIds: [...] })`. Cleaner toolkit-shaped data — the exact API the composio skill's `tr-toolkit-query` documents for this use case. Surfaces toolkits the user can actually use, not raw connection rows that need toolkit-slug deduplication on the consumer side.
- **Observability**: every tool execution (Composio + MCP + custom + built-in, uniformly) now emits a structured pino log line with `{ tool, ok, latencyMs }` on success or `{ tool, err, latencyMs }` on failure. Added inside the existing per-tool wrapper in `run-turn.ts`, so it covers all four tool sources without touching the Composio modifier API — single instrumentation point.

## [0.1.8] — 2026-06-03

Streaming + dedup polish guided by the [chat-sdk skill](https://github.com/vercel-labs/chat-sdk) recommendations. All bot-side; new deployers and existing forks pick these up on next sync.

- **UX**: `result.fullStream` instead of `result.textStream` when piping the agent output to Slack. Preserves step boundaries (text-delta / tool-call / tool-result / step-start / step-finish), so multi-tool runs render with proper separators instead of one continuous wall of text.
- **UX**: `thread.startTyping()` surfaces Slack's native typing indicator twice — once when the turn starts (so the user sees "Ekko is typing…" during context loading) and once just before the stream begins (so it persists through the first-token latency).
- **Reliability**: explicit `dedupeTtlMs: 600_000` on the `Chat` constructor. Slack retries events up to 3× in the first minute on non-200 acks, and Fluid Compute may route retries to a different instance; 10-minute dedup covers all of Slack's retry attempts comfortably across instances.

## [0.1.7] — 2026-06-03

- **UX**: `npx create-ekko-agent` (no args) now defaults to `my-ekko-agent` instead of prompting.
- **UX**: when `vercel inspect` detects the production alias (the common case), bootstrap uses it silently — no more "Press Enter to accept" friction. The prompt only appears as a fallback when detection fails.
- **UX (important)**: welcome DM and `onAssistantThreadStarted` no longer direct users to `dashboard.composio.dev` to connect tools. They now correctly explain that users should *ask the bot* — "connect Gmail" / "connect Linear" — so the bot can generate an auth link scoped to the user's Slack identity. Connecting via the dashboard binds to a different Composio entity and the bot can't see it (real gotcha that confused at least one tester).

## [0.1.6] — 2026-06-03

- **Fix (critical)**: `vercel env pull` in the post-deploy step ran without `--environment=production`, so it downloaded the development env which lacks `DATABASE_URL`. The migration runner then errored out, leaving the deployed bot with no schema applied — first DM crashes inside `ensureSlackUser`. Now pulls production explicitly.
- **UX**: Slack welcome DM is now Composio-aware. If you supplied a Composio API key during setup, the DM tells you to connect toolkits at the dashboard (instead of telling you to "get an API key" you already have). If you didn't, it walks you through both steps.
- **UX**: OAuth browser success page is no longer a bare `<h1>` — proper on-brand teal page with animated check ("Installed — Return to your terminal").
- **Copy fix**: Slack config token instruction now correctly says "scroll to the bottom of the page" (previously said "near the top").
- **Polish**: removed the trailing `Next: open Slack → search "Ekko" → DM the bot.` — already in the `Setup complete!` summary above it.

## [0.1.5] — 2026-06-03

- **Fix (critical)**: `create-ekko-agent` was eagerly creating a readline interface at module load — even when `projectName` was given as argv and no prompt was needed. The unused readline still disturbed `process.stdin`, so when `pnpm bootstrap` ran as a child and tried to read its own "Continue?" prompt, stdin returned EOF immediately and bootstrap exited silently after the banner. Switched to lazy-init readline (only created if `ask()` is actually called). Bootstrap's prompts now receive user input as expected.
- **UX**: `vercel link` now runs with `--yes` — skips the "code dir", "modify settings", and "additional settings" prompts entirely (no real choice for ekko's structure; defaults are always correct).
- **UX**: removed the redundant `Ready.` banner at the end of `create-ekko-agent`. Bootstrap's own `Setup complete!` + welcome DM + icon prompt is now the last word.

## [0.1.4] — 2026-06-03

- **Fix (critical)**: `setVercelEnv` was piping values via stdin to `vercel env add`, which silently dropped the value on some setups — env vars saved as empty strings. Now uses the documented non-interactive path: `vercel env add KEY production --value <V> --force --yes`. Surfaced when a fresh setup ended up with empty `SLACK_BOT_TOKEN`, leaving the bot unable to authenticate to Slack.
- **UX**: every interactive prompt is now prefixed with `❯ ` (cyan) so the user can distinguish "waiting on you" from "loading."
- **UX**: spinner messages now display elapsed seconds — `Provisioning Neon… (12s)` — so you can tell still-working from hung.
- **UX**: pre-flight explainer before `vercel link` ("Vercel will ask 3–4 questions, press Enter to accept defaults") in both `pnpm bootstrap` and `create-ekko-agent`.

## [0.1.3] — 2026-06-03

- **Fix**: bootstrap now detects the actual production alias via `vercel inspect` instead of guessing `<projectName>.vercel.app`. For projects with common names (e.g. `janitor`), the bare subdomain is often already taken globally — Vercel suffixes the project's real alias (e.g. `janitor-nu.vercel.app`). The wrong-URL bug caused the Slack manifest to point at a stranger's deployment, breaking event delivery to the bot.

## [0.1.2] — 2026-06-03

- **Fix**: `create-ekko-agent` and `pnpm bootstrap` now auto-fall-back to `npx -y vercel` when the `vercel` CLI is not on `PATH` (e.g., after a fresh `npm i -g vercel` in a shell that hasn't refreshed yet). First invocation downloads vercel once; subsequent calls hit the npm cache.
- Vercel CLI is no longer a hard prerequisite — only pnpm is required up front.

## [0.1.1] — 2026-06-03

- README badges (npm version, license, Node engines) on the public repo and the `create-ekko-agent` package page.
- `CHANGELOG.md` at repo root.

## [0.1.0] — 2026-06-03

Initial public release.

- Slack-native AI agent template built on Vercel's Chat SDK + AI SDK with `ToolLoopAgent` and the AI Gateway (default model: `anthropic/claude-opus-4.8`).
- Composio Tool Router for 1000+ OAuth-brokered tools — toolkits become available automatically on the next turn after the user connects them at [dashboard.composio.dev](https://dashboard.composio.dev). No redeploy needed.
- Remote MCP server support via `lib/tools/custom/mcp-servers.ts` (forker-owned extension point).
- Custom tools as a first-class extension point at `lib/tools/custom/` — defined via the AI SDK's `tool()` helper.
- Postgres + pgvector memory layer. Default provisioning via Neon over Vercel Marketplace (`DATABASE_URL` auto-injected); works with Supabase, Railway, or any standard Postgres connection string.
- Conversation summarization via a nightly `/api/cron/compact` cron.
- `npx create-ekko-agent my-agent` one-command scaffold — clones the template, installs dependencies, links to a Vercel project, runs the interactive setup, and deploys.
- `pnpm bootstrap` interactive setup script — automates Neon Marketplace provisioning via Vercel CLI, Slack app creation through `apps.manifest.create`, browser-based OAuth install (localhost listener captures the bot token), Vercel env var writeback, production deploy, schema migration, and a welcome DM to the installer.
- Slack manifest updates to point at the stable production URL after deploy.
- Default Ekko app icon shipped at `public/ekko-icon.{png,svg}` for one-click upload via the bootstrap script's auto-open prompt.
