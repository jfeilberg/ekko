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

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { styleText } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const rl = readline.createInterface({ input: stdin, output: stdout });
// Every interactive prompt is prefixed with ❯ so the user can distinguish
// "waiting on you" from "running/loading." Critical UX cue when sandwiched
// between spinners and background CLI output.
const ask = (q) => rl.question(`  ${styleText('cyan', '❯')} ${q}`);

// ---- UI helpers ----

const c = {
  primary: (s) => styleText(['cyan', 'bold'], s),
  dim: (s) => styleText('gray', s),
  ok: (s) => styleText('green', s),
  warn: (s) => styleText('yellow', s),
  err: (s) => styleText('red', s),
  step: (s) => styleText('cyan', s),
};

const ui = {
  banner(title, subtitle) {
    const line = '─'.repeat(56);
    console.log();
    console.log(c.primary(line));
    console.log(`  ${c.primary(title)}`);
    if (subtitle) console.log(`  ${c.dim(subtitle)}`);
    console.log(c.primary(line));
    console.log();
  },
  step(n, total, label) {
    console.log();
    console.log(`${c.step(`▸ Step ${n}/${total}`)}  ${c.primary(label)}`);
  },
  info(s)  { console.log(`  ${c.dim(s)}`); },
  say(s)   { console.log(`  ${s}`); },
  ok(s)    { console.log(`  ${c.ok('✓')} ${s}`); },
  warn(s)  { console.log(`  ${c.warn('⚠')} ${s}`); },
  err(s)   { console.error(`  ${c.err('✗')} ${s}`); },
  done(title, lines) {
    console.log();
    console.log(`  ${c.ok('✓')} ${c.primary(title)}`);
    for (const l of lines) console.log(`    ${c.dim(l)}`);
    console.log();
  },
};

function spinner(label) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const start = Date.now();
  let i = 0;
  let active = true;
  const id = setInterval(() => {
    if (!active) return;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const time = elapsed >= 1 ? c.dim(` (${elapsed}s)`) : '';
    process.stdout.write(`\r  ${c.primary(frames[i])} ${label}${time}`);
    i = (i + 1) % frames.length;
  }, 80);
  const clear = () => {
    active = false;
    clearInterval(id);
    process.stdout.write(`\r${' '.repeat(label.length + 16)}\r`);
  };
  return {
    stop(finalMsg) { clear(); if (finalMsg) ui.ok(finalMsg); },
    fail(finalMsg) { clear(); if (finalMsg) ui.err(finalMsg); },
  };
}

function abort(msg) {
  ui.err(msg);
  process.exit(1);
}

async function main() {
  ui.banner('Ekko setup', 'fresh clone → working bot in Slack, ~3 minutes');
  ui.say('This will:');
  ui.info('1. Provision Neon Postgres (DATABASE_URL)');
  ui.info('2. Create Slack app from manifest');
  ui.info('3. OAuth install in your workspace');
  ui.info('4. Write env vars to Vercel');
  ui.info('5. Deploy to production');
  ui.info('6. Apply schema migrations');
  ui.info('7. Update Slack manifest with production URL');
  console.log();
  ui.say(c.dim('Prerequisites: vercel CLI logged in. Slack workspace where you can install apps.'));
  console.log();

  // Auto-detect vercel CLI. If not on PATH, fall back to `npx -y vercel` — handles
  // the "just ran `npm i -g vercel` but the shell hasn't refreshed PATH" case
  // gracefully (open-new-terminal / hash -r is the manual workaround).
  VERCEL = (await which('vercel')) ? ['vercel'] : ['npx', '-y', 'vercel'];
  if (VERCEL[0] === 'npx') {
    ui.info('vercel CLI not on PATH — using `npx vercel` (downloads on first use).');
  }

  // Verify .vercel/project.json exists; if missing, run `vercel link` interactively.
  if (!existsSync(path.join(projectRoot, '.vercel/project.json'))) {
    ui.warn('Not linked to a Vercel project. Running `vercel link`…');
    ui.info('Vercel will ask 3–4 questions (scope, link-or-create, project name).');
    ui.info('Press Enter to accept defaults each time.');
    console.log();
    await new Promise((resolve, reject) => {
      const p = spawnVercel(['link'], { cwd: projectRoot, stdio: 'inherit' });
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('vercel link failed'))));
      p.on('error', reject);
    });
    if (!existsSync(path.join(projectRoot, '.vercel/project.json'))) {
      abort('vercel link did not complete. Please run it manually and try again.');
    }
  }

  const proceed = (await ask('Continue? (y/N) ')).trim().toLowerCase();
  if (proceed !== 'y') process.exit(0);

  // ---- Step 1: Provision Neon Postgres ----
  ui.step(1, 7, 'Provision Neon Postgres');
  const hasDatabaseUrl = await vercelEnvExists('DATABASE_URL');
  if (hasDatabaseUrl) {
    ui.ok('DATABASE_URL already set — skipping Neon provisioning.');
  } else {
    ui.info('Ekko needs a Postgres database for memory and user state.');
    ui.info('Neon (free tier, auto-suspends, pgvector built in) is the default.');
    console.log();
    const wantNeon = (await ask('Provision Neon Postgres via Vercel Marketplace? (Y/n) ')).trim().toLowerCase();
    if (wantNeon !== 'n') {
      // Try CLI first — `vercel integration add neon` provisions + connects + pulls env all in one go.
      const cliSpinner = spinner('Provisioning Neon via Vercel CLI…');
      const cliOk = await tryVercelIntegrationAdd('neon');
      if (cliOk) {
        cliSpinner.stop('Neon provisioned and DATABASE_URL injected');
      } else {
        // Fall back to browser flow (first-ever Marketplace use may need legal-terms acceptance in browser).
        cliSpinner.fail('CLI provisioning unavailable — falling back to browser');
        ui.info('Opening https://vercel.com/marketplace/neon …');
        ui.info('Click "Add Integration", select this Vercel project, complete the flow.');
        const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        spawn(opener, ['https://vercel.com/marketplace/neon'], { detached: true, stdio: 'ignore' });
        await ask('Press Enter once Neon is connected and DATABASE_URL is set… ');
        const confirmed = await vercelEnvExists('DATABASE_URL');
        if (!confirmed) {
          ui.warn('DATABASE_URL still not detected. Set it manually with `vercel env add DATABASE_URL production` and run `pnpm db:push` after deploy.');
        } else {
          ui.ok('DATABASE_URL confirmed.');
        }
      }
    } else {
      ui.info('Skipped. Set DATABASE_URL manually before deploying:');
      ui.info('  vercel env add DATABASE_URL production');
      ui.info('  Then run `pnpm db:push` after deploy.');
    }
  }

  // ---- Step 2: Slack config token + create app ----
  ui.step(2, 7, 'Create Slack app');
  ui.info('Generate a config token at: https://api.slack.com/apps');
  ui.info('Scroll to the bottom of the page → "Your App Configuration Tokens" → "Generate Token" for the workspace where Ekko will live.');
  console.log();
  const configToken = (await ask('Paste config token (xoxe...): ')).trim();
  if (!configToken.startsWith('xoxe.')) abort('That does not look like a config token.');

  ui.step(3, 7, 'Creating Slack app from manifest');
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
  ui.ok(`Created Slack app ${app_id}`);

  // ---- Step 4: OAuth install ----
  ui.step(4, 7, 'Install to workspace');
  const scopes = (manifestObj.oauth_config.scopes.bot || []).join(',');
  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${client_id}&scope=${scopes}&redirect_uri=${encodeURIComponent(tempRedirect)}`;
  ui.info('Opening browser for OAuth install…');
  ui.info(`If it does not open, visit: ${installUrl}`);

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
  ui.ok(`Installed to ${oauthData.team?.name} (${oauthData.team?.id})`);

  // ---- Step 5: Write env vars to Vercel ----
  ui.step(5, 7, 'Write env vars to Vercel');

  let s = spinner('Writing SLACK_BOT_TOKEN…');
  try {
    await setVercelEnv('SLACK_BOT_TOKEN', botToken);
    s.stop('SLACK_BOT_TOKEN set');
  } catch (err) {
    s.fail('Failed to write SLACK_BOT_TOKEN');
    throw err;
  }

  s = spinner('Writing SLACK_SIGNING_SECRET…');
  try {
    await setVercelEnv('SLACK_SIGNING_SECRET', signing_secret);
    s.stop('SLACK_SIGNING_SECRET set');
  } catch (err) {
    s.fail('Failed to write SLACK_SIGNING_SECRET');
    throw err;
  }

  // Generate + set CRON_SECRET so the nightly /api/cron/compact route can
  // authenticate (otherwise it returns 503 and memory compaction never runs).
  s = spinner('Writing CRON_SECRET…');
  try {
    const cronSecret = randomBytes(32).toString('hex');
    await setVercelEnv('CRON_SECRET', cronSecret);
    s.stop('CRON_SECRET set');
  } catch (err) {
    s.fail('Failed to write CRON_SECRET');
    throw err;
  }

  // ---- Step 6: Composio (optional) — not counted as a numbered step ----
  let composioConfigured = false;
  console.log();
  ui.say(c.dim('Optional: Composio for 1000+ tools (Gmail, Linear, Notion, etc.)'));
  const wantComposio = (await ask('Connect Composio? (Y/n) ')).trim().toLowerCase();
  if (wantComposio !== 'n') {
    ui.info('Get an API key at: https://dashboard.composio.dev');
    const k = (await ask('Paste Composio API key (or press Enter to skip): ')).trim();
    if (k) {
      s = spinner('Writing COMPOSIO_API_KEY…');
      try {
        await setVercelEnv('COMPOSIO_API_KEY', k);
        s.stop('COMPOSIO_API_KEY set');
        composioConfigured = true;
      } catch (err) {
        s.fail('Failed to write COMPOSIO_API_KEY');
        throw err;
      }
    }
  }

  // ---- Step 6: Deploy ----
  ui.step(6, 7, 'Deploy to production');
  let prodUrl;
  const deploySpinner = spinner('Deploying to Vercel…');
  try {
    prodUrl = await deployAndCaptureUrl();
    if (!prodUrl) {
      deploySpinner.fail('Could not parse production URL from deploy output');
      abort('Re-run `vercel deploy --prod` manually and update the Slack manifest at https://api.slack.com/apps.');
    }
    deploySpinner.stop(`Deployed to ${prodUrl}`);
  } catch (err) {
    deploySpinner.fail('Deploy failed');
    throw err;
  }

  // ---- Step 7: Apply migrations ----
  ui.step(7, 7, 'Apply schema migrations');
  // Pull production env (DATABASE_URL is only set on production by the Neon
  // Marketplace integration; without --environment=production we'd download
  // the development env which lacks DATABASE_URL, and db-push would error out).
  await new Promise((resolve) => {
    const pull = spawnVercel(['env', 'pull', '.env.local', '--environment=production', '--yes'], { cwd: projectRoot, stdio: 'inherit' });
    pull.on('close', resolve);
  });
  await new Promise((resolve, reject) => {
    const push = spawn('node', ['scripts/db-push.mjs'], { cwd: projectRoot, stdio: 'inherit', env: { ...process.env } });
    push.on('close', (code) => {
      if (code !== 0) {
        ui.warn('db:push exited non-zero. Run `pnpm db:push` manually after setting DATABASE_URL in .env.local.');
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
  console.log();
  const aliasSpinner = spinner('Detecting production alias…');
  const detectedAlias = await getProductionAlias(prodUrl);
  let stableUrl;
  if (detectedAlias) {
    aliasSpinner.stop(`Using ${detectedAlias} for the Slack manifest`);
    stableUrl = detectedAlias;
  } else {
    aliasSpinner.fail('Could not detect alias via `vercel inspect`');
    const fallback = projectJson.projectName ? `https://${projectJson.projectName}.vercel.app` : prodUrl;
    ui.info(`Falling back to: ${fallback}`);
    const aliasInput = (await ask('Press Enter to accept, or paste a custom domain: ')).trim();
    stableUrl = aliasInput || fallback;
  }

  console.log();
  const manifestSpinner = spinner('Updating Slack manifest…');
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
    manifestSpinner.fail(`Manifest update failed (${updateData.error})`);
    ui.warn(`Update event URLs manually at https://api.slack.com/apps/${app_id}.`);
  } else {
    manifestSpinner.stop('Slack manifest updated');
  }

  // ---- Welcome DM to the installer ----
  if (installerId) {
    const dmSpinner = spinner('Sending welcome DM…');
    const toolsLine = composioConfigured
      ? 'Composio is plugged in 🔌. To connect any toolkit (Gmail, Linear, Notion, …), *just ask me* — e.g. "connect Gmail" or "connect Linear" — and I\'ll generate a one-click authorization link tied to *your* Slack user. (Connecting via dashboard.composio.dev directly will bind to a different identity and I won\'t see it.)'
      : 'To unlock 1000+ external tools, grab a Composio API key at <https://dashboard.composio.dev>, add it as `COMPOSIO_API_KEY` to your Vercel env, and redeploy. Then just ask me to connect what you need.';
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
      dmSpinner.fail(`Could not send welcome DM (${dmData.error})`);
      ui.warn('Not fatal — open Slack and DM Ekko directly.');
    }
  }

  // ---- Done ----
  ui.done('Setup complete!', [
    `Stable URL: ${stableUrl}`,
    `Slack app: https://api.slack.com/apps/${app_id}`,
    'Open Slack and DM Ekko 👋',
  ]);

  // Offer to open the dashboard for icon upload.
  // (Slack's standard manifest API doesn't accept icons — only the Deno SDK manifest does,
  // and only because `slack deploy` pre-uploads it via an internal endpoint before sending
  // the rest to apps.manifest.create. For us: manual upload is the only supported path.)
  // We ship a default icon at public/ekko-icon.png — users can drag-drop it directly.
  const wantIcon = (await ask('Upload an app icon now? Opens the Basic Information page in your browser. (Y/n) ')).trim().toLowerCase();
  if (wantIcon !== 'n') {
    const iconPageUrl = `https://api.slack.com/apps/${app_id}/general`;
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(opener, [iconPageUrl], { detached: true, stdio: 'ignore' });
    ui.ok(`Opened ${iconPageUrl}`);
    ui.info('Scroll to "Display Information" → "App icon".');
    ui.info(`Drag-drop ${path.join(projectRoot, 'public/ekko-icon.png')} (the default Ekko icon, or your own).`);
  } else {
    ui.info(`To upload later: https://api.slack.com/apps/${app_id} → Basic Information → App icon.`);
    ui.info(`Default icon to upload: ${path.join(projectRoot, 'public/ekko-icon.png')}`);
  }

  console.log();
  rl.close();
}

function which(cmd) {
  return new Promise((resolve) => {
    const p = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
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
    const p = spawnVercel(['integration', 'add', slug, '--environment', 'production'], {
      cwd: projectRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
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
  ui.err(`Setup failed: ${err.message}`);
  process.exit(1);
});
