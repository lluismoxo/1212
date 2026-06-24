# FASE 9 — Calidad: CI, entornos, deploy, rollback

> App **1212**. Fecha: 2026-06-24.

## CI (GitHub Actions)

Workflow `.github/workflows/ci.yml`, en cada push y PR. Dos jobs:

### `api`
- Levanta **Postgres + PostGIS efímero** (`postgis/postgis:17-3.5`) como servicio — no toca Neon.
- `npm ci` → `tsc --noEmit` → aplica migraciones → `vitest run` (29 tests de integración) → `npm audit --omit=dev --audit-level=high`.
- Los tests de integración detectan la DB por `DATABASE_URL` (empieza por `postgres`); en CI apuntan al Postgres del runner.

### `mobile`
- `npm ci` → `tsc --noEmit`.

Resultado: cada push valida typecheck + 29 tests + sin vulnerabilidades de producción, sobre una DB limpia. Si algo rompe, el push queda en rojo.

## Métricas mínimas de calidad (gate)
- **Typecheck** sin errores (API y mobile). Bloqueante.
- **29/29 tests** en verde. Bloqueante.
- **0 vulnerabilidades** de producción (`npm audit --omit=dev`, nivel high+). Bloqueante.
- (Futuro) cobertura mínima cuando crezca la base; lint con ESLint flat config.

## Entornos

| Entorno | DB | API | App |
|---------|----|----|-----|
| local | Neon (dev) o Postgres local | `npm run dev` (:8787) | Expo Go / simulador |
| CI | Postgres efímero del runner | — | typecheck |
| staging | Neon (proyecto/branch staging) | despliegue staging | build interno (TestFlight/Internal) |
| producción | Neon (región **UE**, ver RIESGOS-LEGALES) | despliegue prod | App Store / Play |

Cada entorno con su `.env` y secretos propios. **Nunca** secretos en el repo.

## Deploy (recomendado, pendiente de activar)

### API
- **Fly.io** o **Railway** (free tier). Build desde `api/` (Dockerfile o buildpack Node).
- Variables de entorno por el gestor de secretos del proveedor.
- Migraciones: ejecutar `npm run db:migrate` como paso de release (idempotente, tabla `_migrations`).
- Health check: `GET /health`.

### App móvil
- **EAS Build** (Expo) → TestFlight / Play Internal → producción.
- `eas.json` con perfiles development/preview/production (pendiente de crear al sacar primeras builds).

## Rollback

### API
- Deploy versionado por release del proveedor (Fly/Railway guardan releases) → `rollback` a la versión anterior.
- **Migraciones:** son aditivas y idempotentes. Para revertir un cambio de esquema se crea una **nueva migración** que lo deshaga (nunca editar/borrar una aplicada). No hacemos `down` automáticos para evitar pérdida de datos.

### App móvil
- **expo-updates / OTA**: revertir a un update anterior para cambios JS sin pasar por la store.
- Cambios nativos → nueva build + revisión de store (no instantáneo).

## Pendiente
- Crear `Dockerfile`/config de deploy de la API y `eas.json` cuando se decida proveedor y haya credenciales.
- Añadir ESLint (flat config) y, más adelante, cobertura de tests.
- Mover Neon a región UE antes de producción (RIESGOS-LEGALES R-L2).
