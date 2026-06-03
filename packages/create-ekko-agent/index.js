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
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { styleText } from 'node:util';

const TEMPLATE_REPO = 'jfeilberg/ekko';

// Lazy-init readline. When projectName is given as argv, ask() is never called,
// readline never opens, stdin is untouched — critical so the child `pnpm bootstrap`
// can read its own stdin prompts without seeing EOF.
let rl = null;
const ask = (q) => {
  if (!rl) rl = readline.createInterface({ input: stdin, output: stdout });
  return rl.question(`  ${styleText('cyan', '❯')} ${q}`);
};
const closeReadline = () => { if (rl) { rl.close(); rl = null; } };

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

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
    p.on('error', reject);
  });
}

function which(cmd) {
  return new Promise((resolve) => {
    const p = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

async function main() {
  ui.banner('create-ekko-agent', 'Slack-native AI agent template');

  // pnpm is a hard prerequisite — vercel CLI is auto-fetched via npx if missing,
  // which gracefully handles the "just installed vercel globally but PATH hasn't
  // refreshed yet" case (open new terminal / `hash -r` is the manual workaround).
  if (!(await which('pnpm'))) {
    ui.err('pnpm not found. Install it from https://pnpm.io/installation and re-run.');
    closeReadline();
    process.exit(1);
  }
  const VERCEL = (await which('vercel')) ? ['vercel'] : ['npx', '-y', 'vercel'];
  if (VERCEL[0] === 'npx') {
    ui.info('vercel CLI not on PATH — using `npx vercel` (downloads on first use).');
  }

  // Project name (arg or prompt)
  let projectName = process.argv[2];
  if (!projectName) {
    projectName = (await ask('Project name (e.g. my-agent): ')).trim();
  }
  if (!projectName) {
    ui.err('Project name required.');
    closeReadline();
    process.exit(1);
  }
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(projectName)) {
    ui.err(`Invalid project name "${projectName}". Use letters, numbers, hyphens, underscores.`);
    closeReadline();
    process.exit(1);
  }

  const targetDir = path.resolve(projectName);
  if (existsSync(targetDir)) {
    ui.err(`Directory ${targetDir} already exists.`);
    closeReadline();
    process.exit(1);
  }

  console.log();
  ui.say(`Creating ${c.primary(projectName)} in ${c.dim(targetDir)}`);

  // Step 1: clone template
  ui.step(1, 4, 'Cloning template');
  const cloneSpinner = spinner('Fetching template…');
  try {
    await run('npx', ['-y', 'degit', TEMPLATE_REPO, projectName], { stdio: 'ignore' });
    cloneSpinner.stop('Template cloned');
  } catch (err) {
    cloneSpinner.fail('Clone failed');
    throw err;
  }

  // Step 2: install deps
  ui.step(2, 4, 'Installing dependencies');
  ui.info('Installing… this may take a minute.');
  await run('pnpm', ['install'], { cwd: targetDir });

  // Step 3: vercel link (--yes skips the 4–6 default-accept prompts: code dir,
  // modify settings, additional settings, etc. Sign in if prompted, otherwise
  // the project is auto-created in your default Vercel scope.)
  ui.step(3, 4, 'Linking to Vercel');
  ui.info('Auto-accepting defaults. (To use a non-default team, run `vercel switch <team>` first.)');
  await run(VERCEL[0], [...VERCEL.slice(1), 'link', '--yes'], { cwd: targetDir });

  // Step 4: bootstrap. We hand stdin off entirely — bootstrap prints its own
  // "Setup complete!" + welcome DM + icon upload prompt, so we don't print a
  // redundant final banner here.
  ui.step(4, 4, 'Setup (Slack + deploy)');
  closeReadline();
  await run('pnpm', ['bootstrap'], { cwd: targetDir });
}

main().catch((err) => {
  ui.err(err.message);
  closeReadline();
  process.exit(1);
});
