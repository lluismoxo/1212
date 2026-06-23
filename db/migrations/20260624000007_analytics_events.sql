-- 1212 · Eventos de analítica de producto (propios, sin terceros para MVP).
-- No se venden datos. Sirve para embudos/retención internos.

create table public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (name, created_at desc);
create index analytics_events_profile_idx on public.analytics_events (profile_id, created_at desc);
