# 1212 API

Backend de 1212. Node + Hono + Drizzle/Postgres (Neon). Autorización en la API (sin RLS). Ver `../docs/adr/0001-backend-neon-api-propia.md`.

## Setup

1. Crear DB en Neon (free): https://console.neon.tech → New project → copiar connection string.
2. `cp .env.example .env` y rellenar `DATABASE_URL`, `JWT_SECRET`, OAuth.
3. `npm install`
4. `npm run db:migrate` — aplica `../db/migrations/*.sql` en orden (idempotente).
5. `npm run dev` — API en `:8787`. Probar `GET /health`.

## Estructura (se completa en Fase 3+)

```
src/
  index.ts          # bootstrap Hono
  db/
    client.ts       # cliente postgres/drizzle
    migrate.ts      # runner de migraciones SQL
    schema.ts       # (Fase 4) esquema Drizzle reflejando db/migrations
  modules/          # (Fase 3+) auth, users, profiles, location, media,
                    #           communities, moderation, admin, analytics
  middleware/       # (Fase 3+) auth (JWT), roles, rate-limit
```

## Migraciones

La fuente de verdad son los `.sql` crudos en `../db/migrations/`. `migrate.ts` los aplica con una tabla de control `_migrations`. No editar una migración ya aplicada; crear una nueva.
