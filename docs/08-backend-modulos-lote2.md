# FASE 4 — Backend por módulos (lote 2)

> App **1212**. API Node/Hono + Neon. Fecha: 2026-06-24.
> Lote 2: communities, moderation, admin, analytics, media.
> Estado: implementado y testeado (29/29 tests contra Neon).

---

## communities

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/communities` | públicas + las del usuario |
| POST | `/communities` | crea (el creador queda **moderador**) |
| GET | `/communities/:id` | miembro (si privada) |
| POST | `/communities/:id/join` | unirse (solo públicas) |
| POST | `/communities/:id/leave` | salir |
| GET | `/communities/:id/members` | miembro |
| GET | `/communities/:id/messages` | miembro (los ocultos solo moderador) |
| POST | `/communities/:id/messages` | miembro |
| DELETE | `/communities/:id/messages/:mid` | autor o moderador |
| PATCH | `/communities/:id/messages/:mid/hidden` | moderador (moderación) |

Autorización por pertenencia/rol comprobada en cada operación (tests: no-miembro bloqueado, member no oculta, autor borra el suyo).

## moderation

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/moderation/reports` | cualquier usuario (reportar profile/message/community) |
| GET | `/moderation/reports?status=` | **admin** |
| PATCH | `/moderation/reports/:id` | **admin** (resolved/dismissed/reviewing) |

## admin (acceso interno del propietario — requisito de negocio)

Todo el módulo exige rol **admin**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/stats` | conteos (usuarios, perfiles, comunidades, reportes abiertos) |
| GET | `/admin/users?q=&limit=` | listar/buscar usuarios |
| PATCH | `/admin/users/:id/disabled` | bloquear/desbloquear (al bloquear **revoca sus sesiones**) |
| PATCH | `/admin/users/:id/role` | conceder/quitar rol |
| GET | `/admin/audit` | log de auditoría |

Las acciones sensibles (disable, cambios de rol) escriben en `audit_logs`. **El diario queda excluido** del acceso admin (privacidad máxima, decisión de Fase 2).

## analytics (propia, sin terceros)

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/analytics/track` | usuario (solo eventos en **lista blanca**) |
| GET | `/analytics/summary?days=` | admin |

Lista blanca de eventos (onboarding_completed, habit_checked, level_up, …) evita inyección de nombres arbitrarios. **No se venden datos.** Migración `..._007_analytics_events.sql`.

## media (Cloudflare R2, presigned uploads)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/media/presign` | URL PUT prefirmada para subir avatar/foto directo a R2 |

- El binario **no pasa por la API** (el cliente sube directo a R2 con la URL firmada, 5 min de validez).
- Valida tipo (jpg/png/webp) y tamaño (máx 8 MB) antes de firmar.
- Si R2 no está configurado (`R2_*` en `.env`) → `503 storage_not_configured`. El SDK `@aws-sdk/*` es **dependencia opcional**, se importa dinámicamente solo si hay config.
- Setup R2: crear bucket en Cloudflare, API token R2, rellenar `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET/R2_PUBLIC_BASE`.

---

## Tests (7 nuevos, 29 totales)
communities: creador=moderador, join+post, **no-miembro bloqueado**, **solo mod oculta**, autor/mod borra. moderation: reportar+resolver. admin: stats, **disable revoca sesiones**, audit log. analytics: **whitelist** descarta eventos no permitidos.

## Cierre de Fase 4
Backend MVP completo: auth + 11 módulos. Pendiente integración real OAuth (credenciales) y R2 (credenciales). Siguiente: Fase 5 (permisos de dispositivo en el cliente Expo) o Fase 6 (auditoría de seguridad) — el frontend Expo aún no existe (Camino A).
