-- Grapevine: Luma events, expertise, permalinks. Service role still bypasses RLS.

alter table sources drop constraint if exists sources_type_check;
alter table sources add constraint sources_type_check
  check (type in ('whatsapp', 'discord', 'slack', 'paste', 'luma'));

alter table sources add column if not exists synced_at timestamptz;

alter table messages add column if not exists permalink text;

create table if not exists luma_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  source_id uuid not null references sources (id) on delete cascade,
  external_id text not null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  host text,
  community text,
  url text not null,
  description text,
  venue text,
  guest_count int,
  unique (source_id, external_id)
);

create table if not exists expertise (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  topic text not null,
  evidence_message_ids text[] not null default '{}',
  unique (community_id, person_id, topic)
);

alter table luma_events enable row level security;
alter table expertise enable row level security;
