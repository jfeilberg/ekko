create extension if not exists vector;

create table if not exists slack_users (
  slack_user_id        text primary key,
  team_id              text not null,
  composio_entity_id   text not null unique,
  created_at           timestamptz not null default now()
);

create table if not exists messages (
  id            bigserial primary key,
  slack_user_id text not null references slack_users(slack_user_id),
  thread_ts     text not null,
  channel_id    text not null,
  role          text not null check (role in ('user','assistant','tool')),
  content       text not null,
  tool_calls    jsonb,
  embedding     vector(1536),
  created_at    timestamptz not null default now()
);
create index if not exists messages_recent_idx on messages (slack_user_id, thread_ts, created_at desc);
create index if not exists messages_embedding_idx on messages using hnsw (embedding vector_cosine_ops);

create table if not exists summaries (
  id                  bigserial primary key,
  slack_user_id       text not null,
  thread_ts           text not null,
  summary             text not null,
  covered_through_id  bigint not null,
  created_at          timestamptz not null default now()
);
create index if not exists summaries_lookup_idx on summaries (slack_user_id, thread_ts, created_at desc);

create table if not exists app_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table slack_users enable row level security;
alter table messages    enable row level security;
alter table summaries   enable row level security;
alter table app_state   enable row level security;
-- No policies: service-role only.

create or replace function match_messages(
  query_embedding vector(1536),
  match_user text,
  exclude_thread text,
  match_limit int default 5
) returns table (content text, similarity float)
language sql stable as $$
  select m.content, 1 - (m.embedding <=> query_embedding) as similarity
  from messages m
  where m.slack_user_id = match_user
    and m.thread_ts <> exclude_thread
    and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_limit;
$$;
