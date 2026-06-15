#!/usr/bin/env node
// create-ekko-agent — scaffold a Slack-native AI agent in one command.
//
// Usage: npx create-ekko-agent <project-name>
//
// Steps:
//   1. Clone the ekko template (via degit, no git history)
//   2. pnpm install
//   3. vercel link (interactive — links/creates a Vercel project)
//   4. pnpm bootstrap (runs the in-repo setup script)

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const TEMPLATE_REPO = 'jfeilberg/ekko';

// Cancel any clack prompt result that signals the user pressed Ctrl-C.
function bail(value) {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  return value;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    // NODE_NO_WARNINGS silences third-party deprecation noise (e.g. a transitive
    // dep's url.parse() DEP0169) that would otherwise clutter the clean install output.
    const proc = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, NODE_NO_WARNINGS: '1' }, ...opts });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
    proc.on('error', reject);
  });
}

function which(cmd) {
  return new Promise((resolve) => {
    const proc = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function main() {
  p.intro(pc.bgCyan(pc.black(' create-ekko-agent ')));
  p.log.message(pc.dim('Slack-native AI agent template'));

  // pnpm is a hard prerequisite — vercel CLI is auto-fetched via npx if missing,
  // which gracefully handles the "just installed vercel globally but PATH hasn't
  // refreshed yet" case (open new terminal / `hash -r` is the manual workaround).
  if (!(await which('pnpm'))) {
    p.log.error('pnpm not found. Install it from https://pnpm.io/installation and re-run.');
    p.outro(pc.red('Missing prerequisite: pnpm'));
    process.exit(1);
  }

  // Auto-detect vercel CLI; fall back to npx.
  const VERCEL = (await which('vercel')) ? ['vercel'] : ['npx', '-y', 'vercel'];
  if (VERCEL[0] === 'npx') {
    p.log.info('vercel CLI not on PATH — using `npx vercel` (downloads on first use).');
  }

  // Project name: argv first, default to `my-ekko-agent` if not given (no prompt
  // — the user can pass their own as the first arg if they want).
  const projectName = (process.argv[2] || 'my-ekko-agent').trim();
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(projectName)) {
    p.log.error(`Invalid project name "${projectName}". Use letters, numbers, hyphens, underscores.`);
    p.outro(pc.red('Invalid project name'));
    process.exit(1);
  }

  const targetDir = path.resolve(projectName);
  if (existsSync(targetDir)) {
    p.log.error(`Directory ${targetDir} already exists.`);
    p.outro(pc.red('Directory already exists'));
    process.exit(1);
  }

  p.log.info(`Creating ${pc.bold(projectName)} in ${pc.dim(targetDir)}`);

  // Step 1: clone template
  p.log.step('Cloning template');
  const s1 = p.spinner();
  s1.start('Fetching template…');
  try {
    await run('npx', ['-y', 'degit', TEMPLATE_REPO, projectName], { stdio: 'ignore' });
    s1.stop('Template cloned');
  } catch (err) {
    s1.stop('Clone failed', 1);
    throw err;
  }

  // Step 2: install deps
  p.log.step('Installing dependencies');
  p.log.message(pc.dim('This can take a minute.'));
  await run('pnpm', ['install'], { cwd: targetDir });

  // Step 3: vercel link (--yes skips the 4–6 default-accept prompts: code dir,
  // modify settings, additional settings, etc. Sign in if prompted, otherwise
  // the project is auto-created in your default Vercel scope.)
  p.log.step('Linking to Vercel');
  p.log.message(pc.dim('Vercel will ask a few questions; press Enter for defaults.'));
  await run(VERCEL[0], [...VERCEL.slice(1), 'link', '--yes'], { cwd: targetDir });

  // Step 4: bootstrap. We hand stdin off entirely — bootstrap prints its own
  // intro/note/outro, so we don't print a redundant final banner here.
  p.log.step('Setup (Slack + deploy)');
  await run('pnpm', ['bootstrap'], { cwd: targetDir });
}

main().catch((err) => {
  p.log.error(err.message);
  process.exit(1);
});
