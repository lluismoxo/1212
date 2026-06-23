-- 1212 · Comunidades, moderación, auditoría, config

-- ── communities ───────────────────────────────────────────────
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  slug        citext unique not null,
  name        text not null,
  description text,
  goal        text,
  colors      jsonb,
  is_private  boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member' check (role in ('member','moderator')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, profile_id)
);
create index community_members_profile_idx on public.community_members (profile_id);

-- helper: ¿el usuario actual pertenece a la comunidad?
create or replace function public.is_member(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_members
    where community_id = c_id and profile_id = auth.uid()
  );
$$;

-- helper: ¿el usuario actual modera la comunidad?
create or replace function public.is_moderator(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_members
    where community_id = c_id and profile_id = auth.uid() and role = 'moderator'
  );
$$;

create table public.community_messages (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null, -- anonimiza al borrar cuenta
  kind         text not null default 'text' check (kind in ('text','photo','file')),
  body         text,
  media_url    text,
  hidden       boolean not null default false, -- moderación
  created_at   timestamptz not null default now()
);
create index community_messages_feed_idx on public.community_messages (community_id, created_at desc);

create table public.community_files (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null,
  name         text not null,
  url          text not null,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

-- ── moderación ────────────────────────────────────────────────
create table public.moderation_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('profile','message','community')),
  target_id   uuid not null,
  reason      text not null,
  status      text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  handled_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index moderation_status_idx on public.moderation_reports (status, created_at desc);

-- ── auditoría (append-only, solo admin lee) ───────────────────
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  ip          inet,
  user_agent  text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ── config global (solo admin) ────────────────────────────────
create table public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
