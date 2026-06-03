import postgres from 'postgres';
import { env } from './env';

type Sql = ReturnType<typeof postgres>;

let cached: Sql | undefined;

/**
 * Memoized Postgres client. Reads DATABASE_URL lazily so build-time module
 * imports don't trigger env validation. Works with any standard Postgres
 * connection string — Neon (default), Supabase, local Postgres.
 */
export function db(): Sql {
  if (!cached) {
    cached = postgres(env().DATABASE_URL, {
      // Disable prepared statements for serverless compatibility (pg pooler
      // assigns connections per request, so prepared statements wouldn't survive).
      prepare: false,
      // Single connection per Fluid Compute instance — function reuse via Fluid
      // amortizes the connect cost; multiple in-flight queries share the conn.
      max: 1,
      // Reasonable idle timeout; Fluid keeps instances warm anyway.
      idle_timeout: 20,
    });
  }
  return cached;
}
