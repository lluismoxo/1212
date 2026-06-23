-- 1212 · Contenido del usuario: hábitos, tareas, diario

-- ── habits ────────────────────────────────────────────────────
create table public.habits (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  icon       text,
  schedule   jsonb not null default '{}'::jsonb,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);
create index habits_profile_idx on public.habits (profile_id) where archived = false;

create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null,
  done       boolean not null default true,
  unique (habit_id, log_date)
);
create index habit_logs_profile_date_idx on public.habit_logs (profile_id, log_date);

-- ── tasks ─────────────────────────────────────────────────────
create table public.tasks (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 500),
  done       boolean not null default false,
  due_date   date,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index tasks_profile_due_idx on public.tasks (profile_id, due_date);

-- ── journal (privado) ─────────────────────────────────────────
create table public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, entry_date)
);
create trigger journal_updated before update on public.journal_entries
  for each row execute function public.set_updated_at();
