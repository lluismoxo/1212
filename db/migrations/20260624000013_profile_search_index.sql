-- 1212 · Índice para búsqueda parcial de perfiles (ILIKE %q%).
-- pg_trgm acelera los LIKE con comodín por delante.

create extension if not exists pg_trgm;

create index if not exists profiles_username_trgm
  on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_trgm
  on public.profiles using gin (display_name gin_trgm_ops);
