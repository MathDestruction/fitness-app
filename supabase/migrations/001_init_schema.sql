-- ════════════════════════════════════════════════════════
-- Fitness Tracker — Phase 1 Schema
-- ════════════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════
-- TABLE: exercises
-- Global exercises (user_id IS NULL) + user-created ones
-- ════════════════════════════════════════════════════════
create table if not exists public.exercises (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references auth.users(id) on delete cascade,
  name                 text not null,
  category             text not null check (category in ('cardio', 'strength', 'hold')),
  primary_muscle_group text,
  secondary_muscle_group text,
  created_at           timestamptz not null default now()
);

alter table public.exercises enable row level security;

-- Users can read global exercises (user_id is null) or their own
create policy "exercises_select" on public.exercises
  for select using (user_id is null or user_id = auth.uid());

-- Users can insert their own exercises
create policy "exercises_insert" on public.exercises
  for insert with check (user_id = auth.uid());

-- Users can update/delete their own exercises
create policy "exercises_update" on public.exercises
  for update using (user_id = auth.uid());

create policy "exercises_delete" on public.exercises
  for delete using (user_id = auth.uid());

create index if not exists exercises_user_id_idx on public.exercises(user_id);
create index if not exists exercises_category_idx on public.exercises(category);

-- ════════════════════════════════════════════════════════
-- TABLE: sessions
-- ════════════════════════════════════════════════════════
create table if not exists public.sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  weight_kg    numeric(5,2),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "sessions_select" on public.sessions
  for select using (user_id = auth.uid());

create policy "sessions_insert" on public.sessions
  for insert with check (user_id = auth.uid());

create policy "sessions_update" on public.sessions
  for update using (user_id = auth.uid());

create policy "sessions_delete" on public.sessions
  for delete using (user_id = auth.uid());

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_date_idx on public.sessions(user_id, session_date desc);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.handle_updated_at();

-- ════════════════════════════════════════════════════════
-- TABLE: entries
-- Each exercise within a session
-- ════════════════════════════════════════════════════════
create table if not exists public.entries (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  exercise_id     uuid references public.exercises(id) on delete set null,
  exercise_name   text not null,
  type            text not null check (type in ('cardio', 'strength', 'hold')),
  -- cardio fields
  duration_seconds int,
  distance_km      numeric(8,3),
  speed_kmh        numeric(6,2),
  -- hold fields
  hold_sets        int,
  hold_seconds_per_set int,
  -- shared
  notes           text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.entries enable row level security;

-- Entries inherit access from sessions — user can only see entries for their sessions
create policy "entries_select" on public.entries
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = entries.session_id and s.user_id = auth.uid()
    )
  );

create policy "entries_insert" on public.entries
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = entries.session_id and s.user_id = auth.uid()
    )
  );

create policy "entries_update" on public.entries
  for update using (
    exists (
      select 1 from public.sessions s
      where s.id = entries.session_id and s.user_id = auth.uid()
    )
  );

create policy "entries_delete" on public.entries
  for delete using (
    exists (
      select 1 from public.sessions s
      where s.id = entries.session_id and s.user_id = auth.uid()
    )
  );

create index if not exists entries_session_id_idx on public.entries(session_id);
create index if not exists entries_type_idx on public.entries(type);

-- ════════════════════════════════════════════════════════
-- TABLE: strength_sets
-- Individual sets for strength entries
-- ════════════════════════════════════════════════════════
create table if not exists public.strength_sets (
  id         uuid primary key default uuid_generate_v4(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  set_index  int not null,
  weight_kg  numeric(6,2) not null default 0,
  reps       int not null default 0,
  created_at timestamptz not null default now(),
  unique (entry_id, set_index)
);

alter table public.strength_sets enable row level security;

-- strength_sets inherit access via entries → sessions → user
create policy "strength_sets_select" on public.strength_sets
  for select using (
    exists (
      select 1 from public.entries e
      join public.sessions s on s.id = e.session_id
      where e.id = strength_sets.entry_id and s.user_id = auth.uid()
    )
  );

create policy "strength_sets_insert" on public.strength_sets
  for insert with check (
    exists (
      select 1 from public.entries e
      join public.sessions s on s.id = e.session_id
      where e.id = strength_sets.entry_id and s.user_id = auth.uid()
    )
  );

create policy "strength_sets_update" on public.strength_sets
  for update using (
    exists (
      select 1 from public.entries e
      join public.sessions s on s.id = e.session_id
      where e.id = strength_sets.entry_id and s.user_id = auth.uid()
    )
  );

create policy "strength_sets_delete" on public.strength_sets
  for delete using (
    exists (
      select 1 from public.entries e
      join public.sessions s on s.id = e.session_id
      where e.id = strength_sets.entry_id and s.user_id = auth.uid()
    )
  );

create index if not exists strength_sets_entry_id_idx on public.strength_sets(entry_id);

-- ════════════════════════════════════════════════════════
-- Seed global exercises
-- ════════════════════════════════════════════════════════
insert into public.exercises (user_id, name, category, primary_muscle_group) values
  -- Cardio
  (null, 'Run',           'cardio', null),
  (null, 'Jog',           'cardio', null),
  (null, 'Sprint',        'cardio', null),
  (null, 'Cycling',       'cardio', null),
  (null, 'Rowing',        'cardio', null),
  (null, 'Jump Rope',     'cardio', null),
  (null, 'Swimming',      'cardio', null),
  (null, 'Elliptical',    'cardio', null),
  (null, 'Stair Climber', 'cardio', null),
  -- Strength — Chest
  (null, 'Bench Press',    'strength', 'Chest'),
  (null, 'Incline Press',  'strength', 'Chest'),
  (null, 'Chest Fly',      'strength', 'Chest'),
  (null, 'Push Up',        'strength', 'Chest'),
  (null, 'Cable Crossover','strength', 'Chest'),
  -- Strength — Back
  (null, 'Deadlift',       'strength', 'Back'),
  (null, 'Barbell Row',    'strength', 'Back'),
  (null, 'Lat Pulldown',   'strength', 'Back'),
  (null, 'Seated Row',     'strength', 'Back'),
  (null, 'Pull Up',        'strength', 'Back'),
  -- Strength — Legs
  (null, 'Squat',          'strength', 'Legs'),
  (null, 'Leg Press',      'strength', 'Legs'),
  (null, 'Leg Curl',       'strength', 'Legs'),
  (null, 'Leg Extension',  'strength', 'Legs'),
  (null, 'Calf Raise',     'strength', 'Legs'),
  (null, 'Lunge',          'strength', 'Legs'),
  -- Strength — Biceps
  (null, 'Bicep Curl',         'strength', 'Biceps'),
  (null, 'Hammer Curl',        'strength', 'Biceps'),
  (null, 'Preacher Curl',      'strength', 'Biceps'),
  (null, 'Concentration Curl', 'strength', 'Biceps'),
  -- Strength — Triceps
  (null, 'Tricep Pushdown',   'strength', 'Triceps'),
  (null, 'Tricep Dip',        'strength', 'Triceps'),
  (null, 'Overhead Extension','strength', 'Triceps'),
  (null, 'Skull Crusher',     'strength', 'Triceps'),
  -- Strength — Shoulders
  (null, 'Shoulder Press', 'strength', 'Shoulders'),
  (null, 'Lateral Raise',  'strength', 'Shoulders'),
  (null, 'Front Raise',    'strength', 'Shoulders'),
  (null, 'Face Pull',      'strength', 'Shoulders'),
  (null, 'Reverse Fly',    'strength', 'Shoulders'),
  -- Strength — Core
  (null, 'Crunch',             'strength', 'Core'),
  (null, 'Russian Twist',      'strength', 'Core'),
  (null, 'Hanging Leg Raise',  'strength', 'Core'),
  (null, 'Cable Crunch',       'strength', 'Core'),
  (null, 'Ab Roller',          'strength', 'Core'),
  -- Holds
  (null, 'Plank',        'hold', 'Core'),
  (null, 'Side Plank',   'hold', 'Core'),
  (null, 'Wall Sit',     'hold', 'Legs'),
  (null, 'Dead Hang',    'hold', 'Back'),
  (null, 'L-Sit',        'hold', 'Core'),
  (null, 'Hollow Hold',  'hold', 'Core'),
  (null, 'Superman',     'hold', 'Back')
on conflict do nothing;
