-- Small key/value cache for skill runtime state that should persist across
-- Fluid Compute instances. Currently holds the Vercel Sandbox snapshot id used
-- to skip the chromium install on PDF export. Safe to be empty: the PDF export
-- path falls back to a cold install when no snapshot id is present.
create table if not exists skill_cache (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
