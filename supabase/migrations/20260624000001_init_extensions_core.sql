-- 1212 · Migración inicial: extensiones, roles, perfiles, niveles, ubicación
-- Fase 2. Postgres 17 (Supabase). NO aplicada todavía (sin proyecto).

-- ── Extensiones ───────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- username case-insensitive
create extension if not exists "postgis";     -- geografía mapa

-- ── helper: updated_at automático ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── roles / autorización ──────────────────────────────────────
create table public.roles (
  key   text primary key check (key in ('visitor','user','moderator','admin')),
  label text not null
);

create table public.user_roles (
  profile_id uuid not null,
  role       text not null references public.roles(key),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role)
);

-- helper: ¿es admin el usuario actual?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where profile_id = auth.uid() and role = 'admin'
  );
$$;

-- ── profiles (1:1 con auth.users) ─────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         citext unique not null
                     check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name     text not null,
  avatar_url       text,
  bio              text,
  city             text,
  is_public        boolean not null default true,
  location_sharing text not null default 'exact'
                     check (location_sharing in ('exact','city','off')),
  onboarding_done  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index profiles_deleted_idx on public.profiles (deleted_at) where deleted_at is null;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.social_links (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('instagram','x','youtube','linkedin','web','tiktok')),
  url        text not null check (url ~* '^https?://'),
  position   int  not null default 0
);
create index social_links_profile_idx on public.social_links (profile_id);

-- ── locations (PostGIS, exacta — público por diseño) ──────────
create table public.locations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  geog       geography(Point,4326) not null,
  accuracy_m numeric,
  updated_at timestamptz not null default now()
);
create index locations_geog_idx on public.locations using gist (geog);

-- ── niveles (catálogo 1..9) + progreso ────────────────────────
create table public.levels (
  n           int primary key check (n between 1 and 9),
  name        text not null,
  description text not null,
  aura        text not null,
  colors      jsonb not null,
  threshold   int  not null default 0
);

create table public.user_levels (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  current_level int not null default 1 references public.levels(n),
  progress      int not null default 0 check (progress between 0 and 100),
  points        int not null default 0,
  updated_at    timestamptz not null default now()
);
create trigger user_levels_updated before update on public.user_levels
  for each row execute function public.set_updated_at();

-- ── crear profile + level al registrarse (trigger en auth) ────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- username provisional único; el usuario lo cambia en onboarding
    'u' || replace(new.id::text, '-', '')::text,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario')
  );
  insert into public.user_levels (profile_id) values (new.id);
  insert into public.user_roles (profile_id, role) values (new.id, 'user');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
