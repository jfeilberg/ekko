import { db } from '../db';
import { log } from '../log';

/**
 * Persistence for the Vercel Sandbox snapshot id used to accelerate PDF export.
 *
 * The snapshot (chromium + playwright pre-installed) is built once and reused by
 * every instance, so only the first export after a cold start / expiry pays the
 * install cost. Stored in Postgres so it is shared across Fluid Compute
 * instances, with an in-process memo on top. All operations are best-effort:
 * if the store is unavailable, callers fall back to a cold sandbox build.
 */

const KEY = 'pdf_export_snapshot_id';
let memo: string | null | undefined; // undefined = not yet read; null = none stored

export async function getSnapshotId(): Promise<string | null> {
  if (memo !== undefined) return memo;
  try {
    const rows = await db()<{ value: string }[]>`
      SELECT value FROM skill_cache WHERE key = ${KEY} LIMIT 1
    `;
    memo = rows[0]?.value ?? null;
  } catch (err) {
    log.warn({ err }, 'snapshot_cache_read_failed');
    memo = null;
  }
  return memo;
}

export async function setSnapshotId(id: string): Promise<void> {
  memo = id;
  try {
    await db()`
      INSERT INTO skill_cache (key, value, updated_at) VALUES (${KEY}, ${id}, now())
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()
    `;
  } catch (err) {
    log.warn({ err }, 'snapshot_cache_write_failed');
  }
}

export async function clearSnapshotId(): Promise<void> {
  memo = null;
  try {
    await db()`DELETE FROM skill_cache WHERE key = ${KEY}`;
  } catch (err) {
    log.warn({ err }, 'snapshot_cache_clear_failed');
  }
}
