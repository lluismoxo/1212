# ADR 0001 — Backend: Neon + API propia (sustituye a Supabase)

- **Fecha:** 2026-06-24
- **Estado:** Aceptado
- **Reemplaza:** decisión previa de Fase 1 (Supabase) en `docs/03-arquitectura.md`.

## Contexto

En Fase 1 se eligió Supabase (Postgres gestionado + Auth + Storage + RLS). Al intentar crear el proyecto, la cuenta del propietario agotó el plan gratuito (límite de 2 proyectos free por org). Se descarta Supabase.

## Decisión

Backend propio:

| Capa | Antes (Supabase) | Ahora |
|------|------------------|-------|
| DB | Postgres gestionado Supabase | **Neon** (Postgres serverless, plan free) + PostGIS |
| ORM/migraciones | SQL + Supabase CLI | **Drizzle ORM** (TS), SQL como fuente de verdad |
| API | tablas + Edge Functions | **Node + Hono** (TypeScript) |
| Auth | Supabase Auth | **Auth.js (Core)** OIDC Google + Apple, JWT access + refresh rotado |
| Autorización | **RLS** en Postgres (`auth.uid()`) | **Middleware en la API** por rol + checks por query |
| Storage | Supabase Storage | **Cloudflare R2 / S3** (a decidir en Fase 4; free tier R2) |
| Deploy API | Supabase | **Fly.io / Railway** free tier (a decidir Fase 8) |

## Consecuencias

### Cambios en el código ya escrito (Fase 2)
- `supabase/` → renombrado a `db/`.
- Eliminada `config.toml` de Supabase.
- **Eliminada la migración `..._rls.sql`**: RLS dependía de `auth.uid()` (JWT en DB), que no existe sin Supabase. La autorización pasa a la capa API.
- Migración 1: añadidas tablas propias de auth — `auth_users`, `auth_identities` (OAuth), `auth_sessions` (refresh tokens hasheados). `profiles.id` ahora referencia `auth_users` en vez de `auth.users`.
- Trigger `on_auth_user_created` → reemplazado por función `provision_user(id, name)` que la API llama tras OAuth (transaccional, idempotente).
- Helpers `is_admin`/`is_member`/`is_moderator` ahora reciben el id del usuario como parámetro (los llama la API, no la DB vía JWT).

### Implicación de seguridad (importante)
- **Ya no hay RLS como red de seguridad en la base de datos.** Si la API tiene un bug de autorización, no hay segunda barrera. Mitigación: la capa de acceso a datos (repositorios) **siempre** filtra por `owner_id`/pertenencia; tests de autorización obligatorios (Fase 6/9); la credencial de DB nunca llega al cliente.
- A favor: control total de la lógica de auth/sesiones (bloqueo de cuenta, rotación de refresh, detección de sesiones inválidas) — requisitos explícitos del producto.

### Mantenido
- Todo el modelo de datos (tablas, índices, constraints, PostGIS, semillas niveles 1-9) sirve igual en Neon.
- Frontend sigue siendo Expo (sin cambios).

## Alternativas descartadas
- **Firebase/Firestore:** obligaba a reescribir el modelo relacional a NoSQL. Descartado.
- **Pocketbase/Appwrite:** atan el modelo a su sistema de permisos; menos control.
