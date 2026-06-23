# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/). Sin versionar aún (pre-MVP).

## [Sin publicar]

### Added — Fase 3: Autenticación (2026-06-24)
- Auth OIDC Google/Apple sobre la API propia. Endpoints: `/auth/login`, `/refresh`, `/logout`, `/logout-all`, `DELETE /account`, `/me`.
- JWT access (15 min) + refresh opaco (30 d, solo hash en DB) con **rotación + reuse detection** (revoca familia ante robo).
- Verificación de `id_token` contra JWKS de Google/Apple (`lib/oidc`), JWT propio (`lib/jwt`), tokens (`lib/tokens`).
- Middleware `requireAuth`/`requireRole`/`requireAdmin` + rate limiting (login 10/min, refresh 30/min) + CORS + validación Zod.
- Eliminación de cuenta (cascade + anonimización de mensajes). Bloqueo de cuenta vía `auth_users.disabled`.
- **14 tests** (vitest) contra Neon: jwt, tokens, oidc, y flujo completo de auth. Todos en verde.
- Migración `..._006_fix_provision_username.sql`: **bug encontrado por los tests** — username provisional excedía 20 chars y violaba el check; truncado a 20.
- Docs `05-autenticacion.md`, `06-oauth-setup.md`. Añadido `@types/node`, `jose`, `vitest.config.ts`, tipado de contexto Hono.

### Changed — Pivote de backend: Supabase → Neon + API propia (2026-06-24)
- Supabase descartado (plan free agotado). Ver `docs/adr/0001-backend-neon-api-propia.md`.
- `supabase/` → `db/`. Eliminada `config.toml` y la migración `..._rls.sql` (RLS dependía de `auth.uid()`).
- Migración 1: añadidas tablas de auth propias (`auth_users`, `auth_identities`, `auth_sessions`); `profiles.id` referencia `auth_users`. Trigger → función `provision_user()`. Helpers `is_admin/is_member/is_moderator` ahora reciben el id como parámetro.
- **Autorización movida a la capa API** (middleware por rol + filtrado por dueño en cada query). Ya no hay RLS como segunda barrera → tests de autorización obligatorios.
- Scaffold de la API en `api/` (Node + Hono + Drizzle/postgres, runner de migraciones, `.env.example`, health check).
- Docs `03`/`04` actualizadas con nota de pivote.

### Added — Fase 2: Modelo de datos (2026-06-24)
- `docs/04-modelo-datos.md`: diseño completo (entidades, índices, constraints, roles, RLS, crecimiento).
- `supabase/migrations/`: 5 migraciones SQL versionadas (extensiones+core, contenido, comunidad+moderación+auditoría, RLS, semillas). **No aplicadas aún** (proyecto Supabase pendiente de crear por límite de plan free).
- `supabase/config.toml`: config local Supabase (Postgres 17, auth Google/Apple).
- `.gitignore` reforzado: secretos (`.env`, `*.pem`, `*.key`), node_modules, Expo, Supabase temp.

### Decisiones confirmadas por el propietario
- Camino A (app nueva, diseño como spec). Backend Supabase. Frontend Expo. Ubicación **exacta** pública (con mitigaciones pendientes en Fase 6/7).
- Proyecto Supabase 1212: bloqueado por límite de 2 proyectos free en org CAP → el propietario creará una org nueva.

### Added — Fase 1: Auditoría y documentación (2026-06-24)
- `docs/01-auditoria.md`: auditoría del repositorio, riesgos técnicos y decisión de fondo (prototipo de diseño, no app funcional).
- `docs/02-prd.md`: Product Requirements Document (objetivo, usuarios, casos de uso, alcance MVP/post-MVP).
- `docs/03-arquitectura.md`: arquitectura propuesta (Expo + Supabase/Postgres), entornos y observabilidad.
- `README.md` y `CHANGELOG.md`.

### Notas
- Esta fase **no modifica el prototipo** (`index.html`, `support.js`). Solo añade documentación.
- Pendiente de decisión del propietario: camino A (app nueva) vs B (hidratar prototipo); Supabase vs API propia; Expo vs nativo.
