-- KahaniGhar initial schema (architecture.md section 4)
-- Run in Supabase SQL editor or via supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('grandparent','parent','child','other')),
  created_at timestamptz not null default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  nickname text not null,
  age_band text not null check (age_band in ('3-5','6-8','9-10')),
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists voices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  label text not null,
  speaker_embedding text,            -- JSON string {embedding,shape,dtype}; never sent to client
  consent_at timestamptz,
  consent_text text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists recordings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  storage_path text not null,
  language text not null,
  duration_s numeric,
  transcript text,
  created_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  language text not null,
  kind text not null check (kind in ('memory','folklore','generated')),
  source_recording_id uuid references recordings(id) on delete set null,
  narrator_member_id uuid references members(id) on delete set null,
  child_id uuid references children(id) on delete set null,
  age_band text,
  structure jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  idx int not null,
  text text not null,
  choice_prompt text,
  choices jsonb,
  audio_path text,
  voice_id uuid references voices(id) on delete set null,
  model text,
  created_at timestamptz not null default now(),
  unique (story_id, idx)
);

create index if not exists idx_members_family on members(family_id);
create index if not exists idx_children_family on children(family_id);
create index if not exists idx_voices_member on voices(member_id);
create index if not exists idx_recordings_member on recordings(member_id);
create index if not exists idx_stories_family on stories(family_id);
create index if not exists idx_scenes_story on scenes(story_id);

-- RLS: service role bypasses; anon has no access by default.
alter table families enable row level security;
alter table members enable row level security;
alter table children enable row level security;
alter table voices enable row level security;
alter table recordings enable row level security;
alter table stories enable row level security;
alter table scenes enable row level security;

-- Storage buckets (create in dashboard or via SQL). Both must be PRIVATE.
-- Server uses service role + signed URLs; never expose raw paths to clients.
--
-- SQL alternative (run as service role):
--   insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false) on conflict do nothing;
--   insert into storage.buckets (id, name, public) values ('tts-cache', 'tts-cache', false) on conflict do nothing;
--
-- RLS on storage.objects is enabled by default. With no policies, anon/authenticated
-- cannot read objects; only the service role can. Keep it that way. If you add
-- policies later, scope them to the owning family only.

-- RLS policy note:
-- With RLS enabled and NO policies, anon/authenticated have zero access (deny by
-- default). The server uses the service role, which bypasses RLS, and MUST call
-- the assert* helpers in lib/db/queries.ts to enforce family ownership.
-- Do NOT add broad "using (true)" policies. Any future read policy must be
-- scoped to the requesting user's family.

-- Seed example (uncomment and adjust for your demo family):
-- insert into families (id, name) values ('00000000-0000-0000-0000-000000000001', 'Demo Family');