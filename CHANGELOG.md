# Changelog

All notable changes to Ekko (and the `create-ekko-agent` scaffolding CLI) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/), and the project uses [semantic versioning](https://semver.org/).

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
