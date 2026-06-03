#!/usr/bin/env node
// Probe Slack's apps.manifest.update for icon field support.
//
// Slack's docs (https://docs.slack.dev/reference/app-manifest) list 13 top-level
// manifest fields, none of them an icon. The Deno Slack SDK has an `icon` field,
// but it's processed client-side by `slack deploy` before reaching apps.manifest.create.
//
// This script empirically tests whether Slack's standard manifest API accepts
// any of several plausible icon field shapes by:
//   1. Exporting the current manifest (so we have a known-good baseline)
//   2. Attempting apps.manifest.update with each icon field shape added
//   3. Reporting which (if any) Slack accepts
//   4. Restoring the original manifest at the end (so failed attempts don't
//      mutate your app, and any successful mutation is rolled back too)
//
// Usage:
//   node scripts/probe-icon-manifest.mjs
//
// Inputs (interactive):
//   - Slack config token (xoxe...) — generate at https://api.slack.com/apps
//   - Your app_id (A...) — find at https://api.slack.com/apps, click your app, copy from URL
//
// If any shape is accepted, the script reports it. Open the app dashboard
// (Basic Information) to see if the icon actually rendered — Slack may accept
// an unknown field silently without applying it.

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = (q) => rl.question(q);

// We use the icon we ship in the template (served at /ekko-icon.png from the
// deployed app, or accessible via raw GitHub). This way, if Slack accepts a
// field that takes a URL, the test also validates that Slack can actually
// fetch and render OUR icon — not a generic placeholder.
const ICON_URL = 'https://raw.githubusercontent.com/jfeilberg/ekko/main/public/ekko-icon.png';

const GUESSES = [
  { label: 'display_information.icon',           mutate: (m) => { m.display_information.icon = ICON_URL; } },
  { label: 'display_information.icon_url',       mutate: (m) => { m.display_information.icon_url = ICON_URL; } },
  { label: 'display_information.image_url',      mutate: (m) => { m.display_information.image_url = ICON_URL; } },
  { label: 'display_information.app_icon',       mutate: (m) => { m.display_information.app_icon = ICON_URL; } },
  { label: 'display_information.image_512',      mutate: (m) => { m.display_information.image_512 = ICON_URL; } },
  { label: 'icon (top-level)',                   mutate: (m) => { m.icon = ICON_URL; } },
  { label: 'features.bot_user.icon',             mutate: (m) => { m.features = m.features ?? {}; m.features.bot_user = m.features.bot_user ?? {}; m.features.bot_user.icon = ICON_URL; } },
];

function abort(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }

async function api(method, configToken, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${configToken}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function summarizeError(result) {
  if (result.errors?.length) {
    return result.errors.map((e) => `${e.pointer ?? ''} ${e.message ?? ''}`.trim()).filter(Boolean).join('; ');
  }
  return result.error || 'unknown error';
}

async function main() {
  console.log('\n🧪 Slack manifest icon-field probe (apps.manifest.update)\n');
  console.log('This will:');
  console.log('  1. Export your current manifest (baseline)');
  console.log(`  2. Try ${GUESSES.length} different icon field shapes via apps.manifest.update`);
  console.log('  3. Report which (if any) Slack accepts');
  console.log('  4. Restore your original manifest at the end\n');

  const configToken = (await ask('Slack config token (xoxe...): ')).trim();
  if (!configToken.startsWith('xoxe.')) abort('Config token must start with xoxe.');

  const appId = (await ask('Your Slack app_id (e.g. A0123ABCDEF): ')).trim();
  if (!/^A[A-Z0-9]+$/.test(appId)) abort('Invalid app_id format. Should look like A0123ABCDEF.');

  // 1. Export current manifest.
  console.log(`\n→ Exporting current manifest for ${appId}…`);
  const exported = await api('apps.manifest.export', configToken, { app_id: appId });
  if (!exported.ok) abort(`apps.manifest.export failed: ${summarizeError(exported)}`);
  const baseManifest = exported.manifest;
  console.log('  ✓ Got current manifest as baseline');

  // 2. Probe each guess.
  console.log(`\n→ Probing ${GUESSES.length} icon field shapes…\n`);
  const accepted = [];
  for (const { label, mutate } of GUESSES) {
    const candidate = structuredClone(baseManifest);
    try {
      mutate(candidate);
    } catch (err) {
      console.log(`✗ ${label}`);
      console.log(`    couldn't apply mutation: ${err.message}\n`);
      continue;
    }
    const result = await api('apps.manifest.update', configToken, {
      app_id: appId,
      manifest: JSON.stringify(candidate),
    });
    if (result.ok) {
      console.log(`✓ ACCEPTED: ${label}`);
      console.log(`    Slack returned ok=true. Check the dashboard's Basic Information page`);
      console.log(`    to see if the icon actually rendered. (Slack may accept unknown fields`);
      console.log(`    silently without applying them — visual check is the ground truth.)\n`);
      accepted.push(label);
    } else {
      console.log(`✗ rejected: ${label}`);
      console.log(`    ${summarizeError(result)}\n`);
    }
  }

  // 3. Restore original manifest (rolls back any successful mutations).
  console.log('→ Restoring original manifest…');
  const restore = await api('apps.manifest.update', configToken, {
    app_id: appId,
    manifest: JSON.stringify(baseManifest),
  });
  if (restore.ok) {
    console.log('  ✓ Restored\n');
  } else {
    console.warn(`  ⚠ Could not restore: ${summarizeError(restore)}`);
    console.warn('    Your manifest may be in a mutated state. Re-run `pnpm bootstrap` to push a clean manifest if needed.\n');
  }

  // 4. Summary.
  console.log('─'.repeat(60));
  if (accepted.length === 0) {
    console.log('Conclusion: Slack accepts no known icon field shape in the standard manifest.');
    console.log('Path forward: upload icon manually at the dashboard (Basic Information → App icon).');
  } else {
    console.log(`Conclusion: ${accepted.length} field shape(s) returned ok=true:`);
    for (const a of accepted) console.log(`  • ${a}`);
    console.log('\nNote: ok=true means the manifest validated. It does NOT prove the icon');
    console.log('rendered. Open https://api.slack.com/apps/' + appId + ' → Basic Information');
    console.log('to confirm visually. If the icon actually appeared, we can wire it into');
    console.log('bootstrap.mjs. If not, the field is being silently ignored.');
  }

  rl.close();
}

main().catch((err) => { console.error('\n✗', err.message); process.exit(1); });
