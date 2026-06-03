# create-ekko-agent

Scaffold a Slack-native AI agent in one command.

```bash
npx create-ekko-agent my-agent
```

This walks you from nothing to a working bot in your Slack workspace:

1. Clones the [Ekko](https://github.com/jfeilberg/ekko) template into `./my-agent`
2. Installs dependencies
3. Links to a Vercel project (interactive — sign in if needed)
4. Runs the interactive setup: Slack app creation, OAuth install, env var writeback, deploy

Total time: ~3 minutes.

## Prerequisites

- **Node.js 22+**
- **pnpm** ([install](https://pnpm.io/installation))
- **Vercel CLI** (`npm i -g vercel`, then `vercel login`)
- A Slack workspace where you can install apps

## What you'll need to provide

- A Slack config token (generate at [api.slack.com/apps](https://api.slack.com/apps) — click "Generate Token" near the top)
- (Optional) A Composio API key for 1000+ OAuth-brokered tools ([dashboard.composio.dev](https://dashboard.composio.dev))

## Learn more

See the [ekko README](https://github.com/jfeilberg/ekko) for architecture, customization, and extension points.

## License

MIT
