# Changelog

All notable changes to Ekko (and the `create-ekko-agent` scaffolding CLI) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/), and the project uses [semantic versioning](https://semver.org/).

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
