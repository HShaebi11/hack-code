-- Community Brain schema. Service role bypasses RLS for the demo API.

create extension if not exists pgcrypto;

create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  type text not null check (type in ('whatsapp', 'discord', 'slack', 'paste')),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources (id) on delete cascade,
  message_id text not null,
  author text not null,
  body text not null,
  sent_at timestamptz,
  unique (source_id, message_id)
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  name text not null,
  handle text,
  note text,
  first_seen timestamptz,
  unique (community_id, name)
);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  source_id uuid references sources (id) on delete set null,
  message_id text,
  title text not null,
  body text not null,
  author text,
  sent_at timestamptz,
  citation text not null
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  source_id uuid references sources (id) on delete set null,
  message_id text,
  body text not null,
  author text,
  sent_at timestamptz,
  citation text not null
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  idea_id uuid references ideas (id) on delete set null,
  title text not null,
  pitch text not null,
  why_now text not null,
  citations jsonb not null default '[]'::jsonb,
  status text not null default 'idea',
  created_at timestamptz not null default now()
);

create table if not exists event_people (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  person_id uuid references people (id) on delete set null,
  name text not null,
  why text not null
);

insert into communities (name, slug)
values ('Hack Code', 'hack-code')
on conflict (slug) do nothing;

alter table communities enable row level security;
alter table sources enable row level security;
alter table messages enable row level security;
alter table people enable row level security;
alter table ideas enable row level security;
alter table memories enable row level security;
alter table events enable row level security;
alter table event_people enable row level security;
