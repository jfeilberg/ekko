#!/usr/bin/env node
// Interactive setup for Ekko.
//
// Walks the developer from fresh clone → working Ekko bot in Slack:
//   1. Provision Neon Postgres via Vercel Marketplace (DATABASE_URL)
//   2. Slack config token → creates Slack app via apps.manifest.create
//   3. OAuth install (browser + localhost:8080 listener) → captures bot token
//   4. Writes SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET to Vercel env
//   5. Optionally prompts for COMPOSIO_API_KEY
//   6. Deploys via `vercel deploy --prod`
//   7. Runs `pnpm db:push` to apply schema migrations
//   8. Updates Slack manifest with production URL via apps.manifest.update
//   9. Prints summary + "DM Ekko in Slack" instructions

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Cancel any clack prompt result that signals the user pressed Ctrl-C.
function bail(value) {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  return value;
}

function abort(msg) {
  p.log.error(msg);
  process.exit(1);
}

async function main() {
  p.intro(pc.bgCyan(pc.black(' ekko setup ')));
  p.log.message(pc.dim('fresh clone → working bot in Slack, ~3 minutes'));
  p.log.message(pc.dim('Prerequisites: vercel CLI logged in. Slack workspace where you can install apps.'));

  // Auto-detect vercel CLI. If not on PATH, fall back to `npx -y vercel` — handles
  // the "just ran `npm i -g vercel` but the shell hasn't refreshed PATH" case
  // gracefully (open-new-terminal / hash -r is the manual workaround).
  VERCEL = (await which('vercel')) ? ['vercel'] : ['npx', '-y', 'vercel'];
  if (VERCEL[0] === 'npx') {
    p.log.info('vercel CLI not on PATH — using `npx vercel` (downloads on first use).');
  }

  // Verify .vercel/project.json exists; if missing, run `vercel link` interactively.
  if (!existsSync(path.join(projectRoot, '.vercel/project.json'))) {
    p.log.warn('Not linked to a Vercel project. Running `vercel link`…');
    p.log.step('Linking to Vercel');
    p.log.message(pc.dim('Vercel will ask a few questions; press Enter for defaults.'));
    await new Promise((resolve, reject) => {
      const proc = spawnVercel(['link'], { cwd: projectRoot, stdio: 'inherit' });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error('vercel link failed'))));
      proc.on('error', reject);
    });
    if (!existsSync(path.join(projectRoot, '.vercel/project.json'))) {
      abort('vercel link did not complete. Please run it manually and try again.');
    }
  }

  const go = bail(await p.confirm({ message: 'Continue?', initialValue: true }));
  if (!go) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // ---- Step 1: Provision Neon Postgres ----
  p.log.step('Step 1/7  Provision Neon Postgres');
  const hasDatabaseUrl = await vercelEnvExists('DATABASE_URL');
  if (hasDatabaseUrl) {
    p.log.success('DATABASE_URL already set — skipping Neon provisioning.');
  } else {
    p.log.info('Ekko needs a Postgres database for memory and user state.');
    p.log.message(pc.dim('Neon (free tier, auto-suspends, pgvector built in) is the default.'));

    const provisionNeon = bail(await p.confirm({
      message: 'Provision Neon Postgres via Vercel Marketplace?',
      initialValue: true,
    }));
    if (provisionNeon) {
      // Try CLI first — `vercel integration add neon` provisions + connects + pulls env all in one go.
      const s = p.spinner();
      s.start('Provisioning Neon via Vercel CLI…');
      const cliOk = await tryVercelIntegrationAdd('neon');
      if (cliOk) {
        s.stop('Neon provisioned and DATABASE_URL injected');
      } else {
        // Fall back to browser flow (first-ever Marketplace use may need legal-terms acceptance in browser).
        s.stop('CLI provisioning unavailable — falling back to browser', 1);
        p.log.info('Opening https://vercel.com/marketplace/neon …');
        p.log.message(pc.dim('Click "Add Integration", select this Vercel project, complete the flow.'));
        const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        spawn(opener, ['https://vercel.com/marketplace/neon'], { detached: true, stdio: 'ignore' });
        bail(await p.confirm({ message: 'Connected Neon and set DATABASE_URL?', initialValue: true }));
        const confirmed = await vercelEnvExists('DATABASE_URL');
        if (!confirmed) {
          p.log.warn('DATABASE_URL still not detected. Set it manually with `vercel env add DATABASE_URL production` and run `pnpm db:push` after deploy.');
        } else {
          p.log.success('DATABASE_URL confirmed.');
        }
      }
    } else {
      p.log.message(pc.dim('Skipped. Set DATABASE_URL manually before deploying:'));
      p.log.message(pc.dim('  vercel env add DATABASE_URL production'));
      p.log.message(pc.dim('  Then run `pnpm db:push` after deploy.'));
    }
  }

  // ---- Step 1b: Provision Upstash Redis ----
  // Not a numbered step in the intro list — bundled under "storage" so the
  // user perceives one provisioning phase. Without Redis, Chat SDK dedup is
  // per-instance only and thread-follow silently breaks across Fluid Compute
  // instances (the user mentions Ekko, gets a reply, replies in-thread, and
  // nothing happens because the subscription is in a different instance).
  const hasRedisUrl = await vercelEnvExists('REDIS_URL');
  if (hasRedisUrl) {
    p.log.success('REDIS_URL already set — skipping Upstash provisioning.');
  } else {
    p.log.info('Ekko can use Redis for thread-follow + cross-instance event dedup.');
    p.log.message(pc.dim('Optional. The bot works without it; replying after a mention needs it.'));

    const provisionRedis = await p.confirm({
      message: 'Try to provision Upstash Redis via Vercel CLI? (optional)',
      initialValue: true,
    });
    if (!p.isCancel(provisionRedis) && provisionRedis) {
      const s = p.spinner();
      s.start('Provisioning Upstash Redis via Vercel CLI…');
      // Slug per `vercel integration discover redis` → "Upstash for Redis".
      const cliOk = await tryVercelIntegrationAdd('upstash/upstash-kv');
      if (cliOk) {
        s.stop('Upstash Redis provisioned and REDIS_URL injected');
      } else {
        // CLI `integration add` only works once the integration is already
        // installed on the team; first-time install needs a browser OAuth/terms
        // step the CLI can't automate. Redis is optional, so don't force the
        // user through the Marketplace flow — inform and continue.
        s.stop('Could not auto-provision Redis via CLI', 1);
        p.log.message(pc.dim("Upstash needs a one-time browser install the CLI can't do. Skipping — the bot works without it."));
        p.log.message(pc.dim('Add anytime: any REDIS_URL works (Upstash, Redis Cloud, …). See the README.'));
      }
    } else {
      p.log.message(pc.dim('Skipped Redis. Thread-follow needs it; add a REDIS_URL anytime (README).'));
    }
  }

  // ---- Step 2: Slack config token + create app ----
  p.log.step('Step 2/7  Create Slack app');
  p.log.info('Generate a config token at: https://api.slack.com/apps');
  p.log.message(pc.dim('Scroll to the bottom → "Your App Configuration Tokens" → "Generate Token" for the workspace where Ekko will live.'));

  const configToken = bail(await p.text({
    message: 'Paste your Slack config token',
    placeholder: 'xoxe.xoxp-…',
    validate: (v) => (!v || !v.startsWith('xoxe.')) ? 'That does not look like a config token.' : undefined,
  }));

  p.log.step('Step 3/7  Creating Slack app from manifest');
  const manifestPath = path.join(projectRoot, 'slack-manifest.yaml');
  const manifestRaw = readFileSync(manifestPath, 'utf-8');
  const manifestObj = parseYaml(manifestRaw);

  // Override redirect URLs + event URL with localhost for the install, since we
  // don't have a deploy URL yet. We'll update the manifest after deploy.
  const tempRedirect = 'http://localhost:8080/callback';
  manifestObj.oauth_config = manifestObj.oauth_config || {};
  manifestObj.oauth_config.redirect_urls = [tempRedirect];
  // The event_subscriptions URL must be HTTPS, but Slack doesn't validate it on
  // manifest creation — only when events fire. Use a placeholder.
  if (manifestObj.settings?.event_subscriptions) {
    manifestObj.settings.event_subscriptions.request_url = 'https://example.com/api/webhooks/slack';
  }
  // Same for slash command URL.
  if (manifestObj.features?.slash_commands) {
    for (const cmd of manifestObj.features.slash_commands) {
      cmd.url = 'https://example.com/api/webhooks/slack';
    }
  }

  const createRes = await fetch('https://slack.com/api/apps.manifest.create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${configToken}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ manifest: JSON.stringify(manifestObj) }),
  });
  const createData = await createRes.json();
  if (!createData.ok) {
    console.error('Slack rejected the manifest:', createData.error);
    if (createData.errors) console.error(JSON.stringify(createData.errors, null, 2));
    abort('Manifest creation failed.');
  }
  const { app_id } = createData;
  const { client_id, client_secret, signing_secret } = createData.credentials;
  p.log.success(`Created Slack app ${app_id}`);

  // ---- Step 4: OAuth install ----
  p.log.step('Step 4/7  Install to workspace');
  const scopes = (manifestObj.oauth_config.scopes.bot || []).join(',');
  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${client_id}&scope=${scopes}&redirect_uri=${encodeURIComponent(tempRedirect)}`;
  p.log.info('Opening browser for OAuth install…');
  p.log.message(pc.dim(`If it does not open, visit: ${installUrl}`));

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:8080');
      if (url.pathname !== '/callback') {
        res.writeHead(404); res.end('Not found'); return;
      }
      const c = url.searchParams.get('code');
      const err = url.searchParams.get('error');
      if (err) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Install denied: ${err}</h1>`);
        server.close();
        reject(new Error(`OAuth error: ${err}`));
        return;
      }
      if (!c) {
        res.writeHead(400); res.end('Missing code');
        server.close();
        reject(new Error('No code in callback'));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Installed — Ekko</title><style>html,body{margin:0;height:100%}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d9488;color:#fff;display:flex;align-items:center;justify-content:center}.card{text-align:center;padding:3rem}.check{font-size:5rem;line-height:1;margin-bottom:1rem;animation:pop .35s ease-out}@keyframes pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}h1{margin:0 0 .5rem;font-weight:600;font-size:1.5rem;letter-spacing:-.01em}p{margin:0;opacity:.88;font-size:1rem}</style></head><body><div class="card"><div class="check">✓</div><h1>Installed</h1><p>Return to your terminal — Ekko is finishing setup.</p></div></body></html>`);
      server.close();
      resolve(c);
    });
    server.listen(8080, 'localhost', () => {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      spawn(opener, [installUrl], { detached: true, stdio: 'ignore' });
    });
    setTimeout(() => { server.close(); reject(new Error('OAuth timeout (5 min)')); }, 5 * 60 * 1000);
  });

  // Exchange code for bot token.
  const oauthRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id, client_secret, redirect_uri: tempRedirect }).toString(),
  });
  const oauthData = await oauthRes.json();
  if (!oauthData.ok) abort(`OAuth exchange failed: ${oauthData.error}`);
  const botToken = oauthData.access_token;
  const installerId = oauthData.authed_user?.id;
  p.log.success(`Installed to ${oauthData.team?.name} (${oauthData.team?.id})`);

  // ---- Step 5: Write env vars to Vercel ----
  p.log.step('Step 5/7  Write env vars to Vercel');

  let s = p.spinner();
  s.start('Writing SLACK_BOT_TOKEN…');
  try {
    await setVercelEnv('SLACK_BOT_TOKEN', botToken);
    s.stop('SLACK_BOT_TOKEN set');
  } catch (err) {
    s.stop('Failed to write SLACK_BOT_TOKEN', 1);
    throw err;
  }

  s = p.spinner();
  s.start('Writing SLACK_SIGNING_SECRET…');
  try {
    await setVercelEnv('SLACK_SIGNING_SECRET', signing_secret);
    s.stop('SLACK_SIGNING_SECRET set');
  } catch (err) {
    s.stop('Failed to write SLACK_SIGNING_SECRET', 1);
    throw err;
  }

  // Generate + set CRON_SECRET so the nightly /api/cron/compact route can
  // authenticate (otherwise it returns 503 and memory compaction never runs).
  s = p.spinner();
  s.start('Writing CRON_SECRET…');
  try {
    const cronSecret = randomBytes(32).toString('hex');
    await setVercelEnv('CRON_SECRET', cronSecret);
    s.stop('CRON_SECRET set');
  } catch (err) {
    s.stop('Failed to write CRON_SECRET', 1);
    throw err;
  }

  // ---- Composio (optional) ----
  // Composio enables 1000+ OAuth-brokered tools (Gmail, Linear, Notion, …). It is
  // optional — the bot works without it and you can add COMPOSIO_API_KEY anytime.
  // Nothing in this step cancels setup: Esc / skip just continues without Composio.
  p.log.step('Composio tools (optional)');
  p.log.message(pc.dim('1000+ OAuth-brokered tools: Gmail, Linear, Notion, and more.'));

  let composioConfigured = false;

  const composioChoice = await p.select({
    message: 'Set up Composio tools now?',
    options: [
      { value: 'paste', label: 'I have a Composio API key', hint: 'from dashboard.composio.dev' },
      { value: 'skip',  label: 'Skip for now',              hint: 'add COMPOSIO_API_KEY later' },
    ],
    initialValue: 'skip',
  });

  if (!p.isCancel(composioChoice) && composioChoice === 'paste') {
    p.log.message(pc.dim('Get a key at https://dashboard.composio.dev (Settings → API Keys).'));
    const k = await p.text({ message: 'Paste your Composio API key', placeholder: 'ak_…' });
    if (!p.isCancel(k) && k && k.trim()) {
      s = p.spinner();
      s.start('Writing COMPOSIO_API_KEY…');
      try {
        await setVercelEnv('COMPOSIO_API_KEY', k.trim());
        s.stop('COMPOSIO_API_KEY set');
        composioConfigured = true;
      } catch (err) {
        s.stop('Failed to write COMPOSIO_API_KEY', 1);
        throw err;
      }
    } else {
      p.log.message(pc.dim('Skipped Composio. Add COMPOSIO_API_KEY to your Vercel env anytime.'));
    }
  } else {
    p.log.message(pc.dim('Skipped Composio. Add COMPOSIO_API_KEY later to enable 1000+ tools.'));
  }

  // ---- Step 6: Deploy ----
  p.log.step('Step 6/7  Deploy to production');
  let prodUrl;
  const deploySpinner = p.spinner();
  deploySpinner.start('Deploying to Vercel…');
  try {
    prodUrl = await deployAndCaptureUrl();
    if (!prodUrl) {
      deploySpinner.stop('Could not parse production URL from deploy output', 1);
      abort('Re-run `vercel deploy --prod` manually and update the Slack manifest at https://api.slack.com/apps.');
    }
    deploySpinner.stop(`Deployed to ${prodUrl}`);
  } catch (err) {
    deploySpinner.stop('Deploy failed', 1);
    throw err;
  }

  // ---- Step 7: Apply migrations ----
  p.log.step('Step 7/7  Apply schema migrations');
  // Pull production env (DATABASE_URL is only set on production by the Neon
  // Marketplace integration; without --environment=production we'd download
  // the development env which lacks DATABASE_URL, and db-push would error out).
  const pullSpinner = p.spinner();
  pullSpinner.start('Pulling production env…');
  await new Promise((resolve) => {
    const pull = spawnVercel(
      ['env', 'pull', '.env.local', '--environment=production', '--yes'],
      { cwd: projectRoot, stdio: ['ignore', 'ignore', 'pipe'] },
    );
    pull.on('close', (code) => {
      if (code !== 0) {
        pullSpinner.stop('vercel env pull exited non-zero — continuing anyway', 1);
      } else {
        pullSpinner.stop('Production env pulled');
      }
      resolve();
    });
  });

  const pushSpinner = p.spinner();
  pushSpinner.start('Applying schema migrations…');
  await new Promise((resolve, reject) => {
    let stderr = '';
    const push = spawn('node', ['scripts/db-push.mjs'], {
      cwd: projectRoot,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env },
    });
    push.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    push.on('close', (code) => {
      if (code !== 0) {
        pushSpinner.stop('db:push exited non-zero', 1);
        p.log.warn('Run `pnpm db:push` manually after setting DATABASE_URL in .env.local.');
        if (stderr) p.log.message(pc.dim(stderr.trim().split('\n').slice(-3).join('\n')));
      } else {
        pushSpinner.stop('Schema migrations applied');
      }
      resolve();
    });
    push.on('error', reject);
  });

  // ---- Resolve stable alias for the Slack manifest ----
  // The Slack manifest needs the stable alias so events keep landing on the
  // latest production deploy. Detection via `vercel inspect` is reliable in
  // practice — we only prompt the user as a fallback if it fails.
  const projectJson = JSON.parse(readFileSync(path.join(projectRoot, '.vercel/project.json'), 'utf-8'));
  const aliasSpinner = p.spinner();
  aliasSpinner.start('Detecting production alias…');
  const detectedAlias = await getProductionAlias(prodUrl);
  let stableUrl;
  if (detectedAlias) {
    aliasSpinner.stop(`Using ${detectedAlias} for the Slack manifest`);
    stableUrl = detectedAlias;
  } else {
    aliasSpinner.stop('Could not detect alias via `vercel inspect`', 1);
    const fallback = projectJson.projectName ? `https://${projectJson.projectName}.vercel.app` : prodUrl;
    p.log.message(pc.dim(`Falling back to: ${fallback}`));
    const aliasInput = bail(await p.text({
      message: 'Production URL for the Slack manifest',
      placeholder: fallback,
      defaultValue: fallback,
    }));
    stableUrl = aliasInput || fallback;
  }

  const manifestSpinner = p.spinner();
  manifestSpinner.start('Updating Slack manifest…');
  const finalManifest = structuredClone(manifestObj);
  const webhookUrl = `${stableUrl}/api/webhooks/slack`;
  if (finalManifest.settings?.event_subscriptions) finalManifest.settings.event_subscriptions.request_url = webhookUrl;
  if (finalManifest.features?.slash_commands) for (const cmd of finalManifest.features.slash_commands) cmd.url = webhookUrl;
  finalManifest.oauth_config.redirect_urls = [`${stableUrl}/`];

  const updateRes = await fetch('https://slack.com/api/apps.manifest.update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${configToken}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id, manifest: JSON.stringify(finalManifest) }),
  });
  const updateData = await updateRes.json();
  if (!updateData.ok) {
    manifestSpinner.stop(`Manifest update failed (${updateData.error})`, 1);
    p.log.warn(`Update event URLs manually at https://api.slack.com/apps/${app_id}.`);
  } else {
    manifestSpinner.stop('Slack manifest updated');
  }

  // ---- Welcome DM to the installer ----
  if (installerId) {
    const dmSpinner = p.spinner();
    dmSpinner.start('Sending welcome DM…');
    const toolsLine = composioConfigured
      ? 'Composio is plugged in 🔌. To connect any toolkit (Gmail, Linear, Notion, and more), *just ask me*. Say "connect Gmail" and I\'ll send back a one-click authorization link tied to *your* Slack user. (Connecting through dashboard.composio.dev directly binds to a different identity and I won\'t see it.)'
      : 'Want me to use 1000+ external tools? Grab a Composio API key at <https://dashboard.composio.dev>, add it as `COMPOSIO_API_KEY` to your Vercel env, and redeploy. Then just ask me to connect what you need.';
    const welcomeText = [
      '👋 *Welcome to Ekko!*',
      '',
      "I'm your AI agent in this workspace. You can:",
      '• DM me directly to chat',
      '• @-mention me in any channel I\'m invited to',
      '• Open the Assistant view (sidebar) for a dedicated thread',
      '',
      toolsLine,
      '',
      'Try saying hi 👋',
    ].join('\n');
    const dmRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: installerId, text: welcomeText, mrkdwn: true }),
    });
    const dmData = await dmRes.json();
    if (dmData.ok) {
      dmSpinner.stop('Sent welcome DM');
    } else {
      dmSpinner.stop(`Could not send welcome DM (${dmData.error})`, 1);
      p.log.warn('Not fatal — open Slack and DM Ekko directly.');
    }
  }

  // ---- Done ----
  p.note(
    [
      `Stable URL   ${stableUrl}`,
      `Slack app    https://api.slack.com/apps/${app_id}`,
    ].join('\n'),
    'Setup complete',
  );

  // Offer to open the dashboard for icon upload.
  // (Slack's standard manifest API doesn't accept icons — only the Deno SDK manifest does,
  // and only because `slack deploy` pre-uploads it via an internal endpoint before sending
  // the rest to apps.manifest.create. For us: manual upload is the only supported path.)
  // We ship a default icon at public/ekko-icon.png — users can drag-drop it directly.
  const wantIcon = bail(await p.confirm({
    message: 'Open the Slack dashboard to upload an app icon now?',
    initialValue: true,
  }));
  if (wantIcon) {
    const iconPageUrl = `https://api.slack.com/apps/${app_id}/general`;
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(opener, [iconPageUrl], { detached: true, stdio: 'ignore' });
    p.log.success(`Opened ${iconPageUrl}`);
    p.log.message(pc.dim('Scroll to "Display Information" → "App icon".'));
    p.log.message(pc.dim(`Drag-drop ${path.join(projectRoot, 'public/ekko-icon.png')} (the default Ekko icon, or your own).`));
  } else {
    p.log.message(pc.dim(`To upload later: https://api.slack.com/apps/${app_id} → Basic Information → App icon.`));
    p.log.message(pc.dim(`Default icon to upload: ${path.join(projectRoot, 'public/ekko-icon.png')}`));
  }

  p.outro(pc.cyan('Open Slack and DM Ekko 👋'));
}

function which(cmd) {
  return new Promise((resolve) => {
    const proc = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

// Set by main() after PATH detection: either ['vercel'] or ['npx', '-y', 'vercel'].
let VERCEL = ['vercel'];
function spawnVercel(args, opts) {
  return spawn(VERCEL[0], [...VERCEL.slice(1), ...args], opts);
}

function vercelEnvExists(key) {
  return new Promise((resolve) => {
    const ls = spawnVercel(['env', 'ls', 'production'], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    ls.stdout.on('data', (chunk) => { out += chunk.toString(); });
    ls.on('close', () => resolve(out.includes(key)));
  });
}

/**
 * Provision a Marketplace integration via CLI. Returns true on success.
 * Falls back to false on any failure (caller should offer browser flow).
 */
function tryVercelIntegrationAdd(slug) {
  return new Promise((resolve) => {
    const proc = spawnVercel(['integration', 'add', slug, '--environment', 'production'], {
      cwd: projectRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function setVercelEnv(key, value) {
  return new Promise((resolve, reject) => {
    // Use `--value` (documented non-interactive path) + `--force` (overwrite
    // existing) + `--yes` (skip the post-add confirmation prompt). The previous
    // stdin-pipe approach silently wrote empty strings on some setups because
    // vercel CLI's TTY-style prompts dropped the piped value.
    const proc = spawnVercel(
      ['env', 'add', key, 'production', '--value', value, '--force', '--yes'],
      { cwd: projectRoot, stdio: ['ignore', 'ignore', 'ignore'] },
    );
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`vercel env add ${key} exited ${code}`)));
    proc.on('error', reject);
  });
}

/**
 * Resolve the canonical production alias for a given deployment by parsing
 * `vercel inspect <url>`. The shortest alias listed is typically the one
 * Vercel auto-assigned (e.g. `myproject.vercel.app`, or `myproject-nu.vercel.app`
 * when the bare subdomain is taken globally).
 */
function getProductionAlias(deployUrl) {
  return new Promise((resolve) => {
    const proc = spawnVercel(['inspect', deployUrl], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    proc.stdout.on('data', (c) => { out += c.toString(); });
    proc.stderr.on('data', (c) => { out += c.toString(); });
    proc.on('close', () => {
      const aliasesIdx = out.indexOf('Aliases');
      if (aliasesIdx === -1) return resolve(null);
      const buildsIdx = out.indexOf('Builds', aliasesIdx);
      const section = out.slice(aliasesIdx, buildsIdx === -1 ? out.length : buildsIdx);
      const urls = [...section.matchAll(/https:\/\/[a-z0-9.-]+\.vercel\.app/g)].map((m) => m[0]);
      if (!urls.length) return resolve(null);
      urls.sort((a, b) => a.length - b.length);
      resolve(urls[0]);
    });
    proc.on('error', () => resolve(null));
  });
}

function deployAndCaptureUrl() {
  return new Promise((resolve, reject) => {
    const proc = spawnVercel(['deploy', '--prod', '--yes'], { cwd: projectRoot });
    let buf = '';
    proc.stdout.on('data', (chunk) => {
      const s = chunk.toString();
      buf += s;
    });
    proc.stderr.on('data', (chunk) => {
      const s = chunk.toString();
      buf += s;
    });
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`vercel deploy exited ${code}`));
      // Match either "Production: https://..." or any vercel.app URL.
      const m = buf.match(/Production:\s+(https:\/\/[^\s]+)/) ?? buf.match(/(https:\/\/[a-z0-9-]+\.vercel\.app)/);
      resolve(m ? m[1] : null);
    });
  });
}

main().catch((err) => {
  p.log.error(`Setup failed: ${err.message}`);
  process.exit(1);
});
