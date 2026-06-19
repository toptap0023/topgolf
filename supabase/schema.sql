-- TOPgolf database schema
-- Run this in Supabase → SQL Editor → New query → Run (it is idempotent).
--
-- This is a no-auth personal app: the anon role gets full access, so anyone with
-- the deployed URL can read/write. Tables are namespaced golf_* so they can live
-- alongside other projects in the same Supabase database.

create extension if not exists pgcrypto;

create table if not exists public.golf_sessions (
  id              uuid primary key default gen_random_uuid(),
  played_on       date not null default current_date,
  title           text,
  location        text,
  source_filename text,
  distance_unit   text not null default 'yds',  -- 'yds' | 'm'
  speed_unit      text not null default 'mph',  -- 'mph' | 'kph' | 'm/s'
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.golf_shots (
  id                        uuid primary key default gen_random_uuid(),
  session_id                uuid not null references public.golf_sessions(id) on delete cascade,
  shot_index                int,
  shot_time                 timestamptz,
  club                      text,
  club_category             text,   -- Driver | Wood | Hybrid | Iron | Wedge | Putter | Other
  ball_speed                numeric,
  club_speed                numeric,
  smash_factor              numeric,
  launch_angle              numeric,
  launch_direction          numeric,
  spin_rate                 numeric,
  spin_axis                 numeric,
  backspin                  numeric,
  sidespin                  numeric,
  apex_height               numeric,
  carry_distance            numeric,
  total_distance            numeric,
  carry_deviation_angle     numeric,
  carry_deviation_distance  numeric,  -- + right / - left
  total_deviation_angle     numeric,
  total_deviation_distance  numeric,
  attack_angle              numeric,
  club_path                 numeric,
  club_face                 numeric,  -- face angle
  face_to_path              numeric,
  note                      text,
  raw                       jsonb,    -- original CSV row (header -> value)
  created_at                timestamptz not null default now()
);

-- Manual round/score log to track the scoring goal.
create table if not exists public.golf_rounds (
  id                    uuid primary key default gen_random_uuid(),
  played_on             date not null default current_date,
  course                text,
  score                 int,
  par                   int default 72,
  holes                 int default 18,
  putts                 int,
  fairways_hit          int,
  greens_in_regulation  int,
  notes                 text,
  created_at            timestamptz not null default now()
);

create index if not exists golf_shots_session_idx  on public.golf_shots(session_id);
create index if not exists golf_shots_club_idx      on public.golf_shots(club);
create index if not exists golf_sessions_played_idx on public.golf_sessions(played_on desc);
create index if not exists golf_rounds_played_idx   on public.golf_rounds(played_on desc);

alter table public.golf_sessions enable row level security;
alter table public.golf_shots    enable row level security;
alter table public.golf_rounds   enable row level security;

drop policy if exists golf_sessions_public on public.golf_sessions;
drop policy if exists golf_shots_public    on public.golf_shots;
drop policy if exists golf_rounds_public   on public.golf_rounds;

create policy golf_sessions_public on public.golf_sessions
  for all to anon, authenticated using (true) with check (true);
create policy golf_shots_public on public.golf_shots
  for all to anon, authenticated using (true) with check (true);
create policy golf_rounds_public on public.golf_rounds
  for all to anon, authenticated using (true) with check (true);
