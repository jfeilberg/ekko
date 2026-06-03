#!/usr/bin/env node
// Apply pending migrations from migrations/*.sql against DATABASE_URL.
//
// Tracks applied migrations in a _migrations table. Reads files in sorted
// order (so prefix them 0001_, 0002_, etc.). Each file's contents are
// executed as a single multi-statement transaction.

import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../migrations');

// Auto-load .env.local if present so `pnpm db:push` works right after
// `vercel env pull .env.local` without needing `node --env-file=...`.
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch { /* no .env.local — fall through to the DATABASE_URL check */ }

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Pull it first: `vercel env pull .env.local`');
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const applied = await sql`SELECT name FROM _migrations`;
  const appliedNames = new Set(applied.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const content = await readFile(path.join(migrationsDir, file), 'utf-8');
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    console.log(`✓ ${file}`);
    count += 1;
  }
  if (count === 0) console.log('No new migrations.');
  else console.log(`Applied ${count} migration(s).`);
} catch (err) {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
