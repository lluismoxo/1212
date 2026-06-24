# FASE 3 — Autenticación

> App **1212**. API propia (Node/Hono) + Neon. OIDC Google/Apple.
> Fecha: 2026-06-24. Estado: implementado y testeado contra Neon (14/14 tests).

---

## Arquitectura

Flujo para app móvil (Expo). La app obtiene un `id_token` del proveedor (Google/Apple) en el cliente y lo manda a la API; la API lo verifica y emite **sus propios tokens**.

```
App (Expo)                         API (1212)                    Neon
   │  OAuth nativo Google/Apple
   │─────────────► id_token
   │  POST /auth/login {provider, idToken}
   │──────────────────────────────►│
   │                                │ verifyIdToken (JWKS del proveedor)
   │                                │ find/create auth_user + identity
   │                                │ provision_user → profile+level+role ──► insert
   │                                │ emite access (JWT 15m) + refresh (30d)
   │◄──────────────────────────────│  { accessToken, refreshToken, expiresIn }
   │
   │  Authorization: Bearer <access>  en cada request protegido
   │  POST /auth/refresh cuando expira el access (rota el refresh)
```

### Tokens
- **Access:** JWT HS256, 15 min, claims `{ sub, role }`. Verificado en cada request por `requireAuth`.
- **Refresh:** opaco (32 bytes aleatorios), 30 días. En DB **solo el SHA-256** (`auth_sessions.refresh_hash`). **Rotación** en cada uso.
- **Detección de robo:** si llega un refresh ya revocado → se asume reuse → se **revoca toda la familia** de sesiones del usuario y se rechaza. (Patrón refresh-token rotation con reuse detection.)

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | — (rate-limited) | id_token OIDC → par de tokens |
| POST | `/auth/refresh` | — (rate-limited) | rota refresh, emite nuevo par |
| POST | `/auth/logout` | — | revoca la sesión del refresh dado |
| POST | `/auth/logout-all` | Bearer | revoca todas las sesiones del usuario |
| DELETE | `/auth/account` | Bearer | elimina la cuenta (cascade + anonimiza mensajes) |
| GET | `/auth/me` | Bearer | claims del usuario actual |

Errores uniformes (`{ "error": "<code>" }`): `bad_request`(400), `no_token`/`invalid_token`/`auth_failed`/`invalid_refresh`/`refresh_expired`(401), `forbidden`/`account_disabled`/`refresh_reuse`(403), `rate_limited`(429). No se filtra si un email existe (anti-enumeración).

## Defensas implementadas
- **Rate limiting** en login (10/min/IP) y refresh (30/min/IP).
- **Bloqueo de cuenta:** `auth_users.disabled` → login rechazado.
- **Refresh hasheado** (nunca en claro en DB) + rotación + reuse detection.
- **Comparación en tiempo constante** de hashes (`safeEqualHex`).
- **Verificación OIDC** contra JWKS oficiales (issuer + audience comprobados).
- **CORS** restringido a orígenes de `ALLOWED_ORIGINS`.
- **Validación de entrada** con Zod en cada endpoint.

## Eliminación de cuenta
`DELETE /auth/account` → `delete from auth_users` → cascade borra profile, hábitos, tareas, diario, membresías, sesiones; los mensajes de comunidad pasan a `profile_id = null` (anonimizados, no se rompe el hilo). Cumple requisito de producto.

## Autorización (sin RLS)
`requireAuth` valida el JWT y adjunta `{sub, role}`. `requireRole(...)`/`requireAdmin` exigen rol (admin pasa siempre). El rol del claim se calcula como el más alto del usuario (admin > moderator > user) al emitir tokens. **Importante:** un cambio de rol no se refleja hasta el siguiente refresh/login (TTL access = 15 min). Aceptable para MVP.

## Pendiente del propietario (credenciales reales)
Para probar el login real hay que rellenar en `api/.env` (ver `docs/06-oauth-setup.md`):
- Google: `GOOGLE_CLIENT_ID`.
- Apple: `APPLE_CLIENT_ID` (Services ID) + clave.

Sin credenciales, los tests de integración usan identidades verificadas simuladas (la lógica DB/tokens se prueba entera).

## Tests (14, contra Neon)
- jwt: firma/verificación, manipulación.
- tokens: unicidad, hash determinista, comparación segura.
- oidc: extracción de claims (Google/Apple, email_verified string, sin sub).
- flujo: alta crea profile+level+role, login idempotente, rotación de refresh, **reuse detection revoca familia**, logout, borrado en cascada.

### Bug encontrado por los tests
`provision_user` generaba un username de 33 chars que violaba `profiles_username_check` (máx 20). Corregido en migración `..._006_fix_provision_username.sql` (truncado a 20).
