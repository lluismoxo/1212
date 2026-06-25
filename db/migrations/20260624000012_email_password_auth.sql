-- 1212 · Login con email + contraseña (además de Google/Apple).
-- Contraseña hasheada (bcrypt) en auth_users. Tokens de reset hasheados.

alter table public.auth_users
  add column if not exists password_hash text;

-- tokens de recuperación de contraseña (solo se guarda el hash)
create table if not exists public.password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.auth_users(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists password_resets_token_idx on public.password_resets (token_hash);
create index if not exists password_resets_user_idx on public.password_resets (user_id) where used_at is null;
