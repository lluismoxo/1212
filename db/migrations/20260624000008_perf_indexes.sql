-- 1212 · Índices de rendimiento (Fase 8).
-- Detectados al revisar las queries reales de la API.

-- refresh/logout buscan sesión por refresh_hash en cada renovación de token.
-- Sin índice = scan secuencial en una tabla que crece con cada login.
create index if not exists auth_sessions_refresh_hash_idx
  on public.auth_sessions (refresh_hash);

-- nearby/mapa: join locations→profiles filtrando is_public + location_sharing.
-- Índice parcial para los perfiles realmente visibles en el mapa.
create index if not exists profiles_public_idx
  on public.profiles (id)
  where is_public = true and deleted_at is null;

-- listado de comunidades del usuario (membership lookup ya indexado por profile);
-- aquí aceleramos el "exists" inverso por comunidad.
create index if not exists community_members_community_idx
  on public.community_members (community_id);
