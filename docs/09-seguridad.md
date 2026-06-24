# FASE 6 — Auditoría de seguridad

> App **1212**. Backend API (Node/Hono) + Neon. Fecha: 2026-06-24.
> Revisión sobre el código real + mitigaciones aplicadas.

---

## Amenazas priorizadas

| # | Amenaza | Impacto | Prob. | Estado |
|---|---------|---------|-------|--------|
| A1 | Acceso no autorizado a datos de otro usuario (IDOR) | Alto | Media | **Mitigado** (filtro por dueño + tests) |
| A2 | Robo de cuenta vía refresh token robado | Alto | Baja | **Mitigado** (rotación + reuse detection) |
| A3 | Ubicación exacta pública → acoso/stalking | Alto | Media | **Parcial** (location_sharing, opt-out) — ver riesgos abiertos |
| A4 | Scraping masivo de perfiles/ubicaciones | Medio | Alta | **Mitigado** (rate limit global + límites de query) |
| A5 | Fuerza bruta / abuso de login | Medio | Media | **Mitigado** (rate limit login 10/min) |
| A6 | Enumeración de usuarios (¿existe este email?) | Medio | Media | **Mitigado** (errores uniformes) |
| A7 | SQL injection | Crítico | Baja | **Mitigado** (queries parametrizadas) |
| A8 | Escalada de privilegios a admin | Crítico | Baja | **Mitigado** (rol en claim + requireAdmin; solo admin concede roles) |
| A9 | Filtración de secretos (DB, JWT) en repo | Crítico | Baja | **Mitigado** (.env gitignored, verificado con git grep) |
| A10 | Subida de archivos maliciosos | Medio | Media | **Mitigado** (whitelist tipo+tamaño, presigned directo) |
| A11 | DoS por payload grande | Medio | Baja | **Mitigado** (body limit 256KB) |
| A12 | Exposición de stack traces / detalles internos | Bajo | Media | **Mitigado** (onError genérico) |

---

## Revisión por área (OWASP / API Top 10)

### Autenticación y sesiones
- OIDC verificado contra JWKS oficiales (issuer + audience). JWT HS256 propio, 15 min.
- Refresh opaco, **solo hash SHA-256 en DB**, rotación en cada uso, **reuse detection** revoca la familia.
- Logout y logout-all revocan sesiones. Bloqueo de cuenta (`disabled`) revoca sesiones activas.

### Autorización (sin RLS — capa API)
- Cada query filtra por `profile_id = userId`. Tests prueban aislamiento cruzado (no tocar datos ajenos → 404).
- Comunidades: pertenencia/rol comprobados (`is_member`/`is_moderator`).
- `requireAdmin` en todo `/admin`; conceder roles solo admin.

### Inyección
- 100% de las queries de la app usan tagged templates parametrizados de `postgres`. Único `unsafe` es el runner de migraciones leyendo `.sql` locales de confianza (no entrada de usuario).
- Validación de entrada con Zod en todos los endpoints; enums acotados.

### Exposición de datos / privacidad
- Perfil privado → 404 en ruta pública (no se confirma existencia).
- Diario **excluido** del acceso admin.
- `location_sharing` permite `exact`/`city`/`off`; `off` quita del mapa; `city` oculta coords.

### Secretos
- `.env` y `.p8` en `.gitignore`. Verificado: `git grep` no encuentra la cadena de conexión.
- Validación de entorno al arranque (`config/env.ts`); `JWT_SECRET` mínimo 16 chars.

### Cabeceras / transporte
- `secureHeaders()`: CSP por defecto, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, HSTS.
- CORS restringido a `ALLOWED_ORIGINS`.

### Subida de archivos
- Presigned PUT a R2: el binario no pasa por la API. Whitelist `jpg/png/webp`, máx 8 MB, URL caduca en 5 min.

### Abuso / rate limiting
- Global 120/min/IP; login 10/min; refresh 30/min. Límites de query (radio mapa, page size).

---

## Dependencias

- **Producción: 0 vulnerabilidades** (`npm audit --omit=dev`).
- Se eliminó `drizzle-orm` (tenía un advisory de SQLi por identificadores y **no se usaba** — todas las queries son raw parametrizadas).
- Quedan 5 avisos en dev (vitest/vite/esbuild): solo afectan al servidor de desarrollo de vite, que **no se usa** (`vitest run` sin UI ni dev-server) y **no se despliega**. Riesgo nulo en producción. Revisar al subir vitest a v3.

---

## Riesgos abiertos (requieren decisión/seguimiento)

1. **A3 — Ubicación exacta pública.** Sigue siendo el mayor riesgo de producto (acoso). Mitigaciones presentes: `location_sharing`, opt-out, límites de `nearby`. **Recomendado antes de producción:** que `exact` requiera un consentimiento explícito en la UI (no por defecto), o degradar el default a `city`. Decisión del propietario.
2. **Token de usuario bloqueado válido hasta 15 min.** Al hacer `disable` se revocan refresh tokens, pero el access token vigente sigue válido hasta expirar. Aceptable para MVP (ventana corta). Si se necesita revocación inmediata → lista de revocación / TTL menor.
3. **Rate limit en memoria.** Funciona con 1 instancia. Al escalar horizontalmente (Fase 8) → mover a Redis/Upstash.
4. **Sin WAF / protección DDoS de red.** Se delega al proveedor de despliegue (Fly/Cloudflare) en Fase 8.

---

## Cambios aplicados en esta fase
- Eliminado `drizzle-orm` (dep vulnerable e inútil) → prod sin vulnerabilidades.
- Añadido `secureHeaders`, `bodyLimit` (256KB), rate limit global, `onError` genérico.
- Corregido CORS (faltaba `PUT`).
- 29/29 tests siguen en verde; typecheck limpio.
