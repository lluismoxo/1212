# Mover la base de datos a región UE (Neon)

> Acción del propietario. Resuelve el riesgo legal R-L2 (transferencia internacional). No la puedo hacer yo (no tengo acceso a crear proyectos Neon). Pasos sencillos.

## Por qué
La DB está en `us-east-1` (EE. UU.). Datos personales de la UE → conviene una región UE (`eu-central-1` Frankfurt o similar) para evitar transferencias internacionales bajo RGPD.

## Pasos
1. En https://console.neon.tech → **New project** → región **EU (Frankfurt)**.
2. Copia el nuevo connection string (con `sslmode=require`).
3. Aplica el esquema en la nueva DB:
   ```bash
   cd app/api
   # pon el nuevo DATABASE_URL en .env
   node --env-file=.env node_modules/.bin/tsx src/db/migrate.ts
   ```
   Esto recrea todas las tablas + semillas (las migraciones son idempotentes).
4. Actualiza `DATABASE_URL` en `.env` (local) y en el entorno de despliegue.
5. (Si ya había datos reales en la DB vieja) exporta/importa con `pg_dump`/`pg_restore`. En MVP sin usuarios reales todavía, basta con re-migrar.
6. Borra el proyecto antiguo de Neon cuando confirmes que todo funciona.

## Verificación
- `GET /health` responde.
- 29 tests verde contra la nueva DB: `cd app/api && node --env-file=.env node_modules/.bin/vitest run`.

## Recordatorio
- **Rota la contraseña** del proyecto Neon antiguo (se pegó en chat).
