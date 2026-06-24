# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/). Sin versionar aún (pre-MVP).

## [Sin publicar]

### Changed — Simplificación MVP (2026-06-24)
- **Login solo Google** en la app: Apple retirado del flujo (cuenta dev de pago). `auth.tsx` cableado con `expo-auth-session` (funciona al poner `googleClientId` en `app.json`). Backend mantiene Apple por si se reactiva.
- **Avatar por URL** (MVP sin storage propio): en perfil, pegar URL de imagen → `avatar_url`. Más adelante, subida a R2.
- **Default de ubicación → `city`** (migración 009): privacidad por defecto; `exact` pasa a ser opt-in explícito. Resuelve parte del riesgo legal R-L1.
- Doc `13-neon-region-ue.md`: guía para mover la DB a región UE (R-L2). Quitada dep `expo-apple-authentication`.
- 29 tests verde; typecheck mobile limpio.

### Added — Pantallas mobile restantes (2026-06-24)
- **levels** (9 niveles + componente `Crystal` SVG, desbloqueo por nivel actual).
- **profile**: perfil propio, control de **ubicación pública** (exact/city/off), cerrar sesión, **eliminar cuenta** (con confirmación).
- **communities** (listado + unirse) y **community/[id]** (chat conectado a `/communities/:id/messages`).
- **map**: usa `nearby` (PostGIS) con la ubicación del dispositivo; lista de personas cerca con distancia.
- **search** (por username) + **u/[username]** (perfil público con enlaces y nivel).
- Home enlaza a todas las secciones; hero con cristal → niveles. `react-native-svg` añadido. Typecheck limpio.

### Added — Fase 8: Escalabilidad (2026-06-24)
- Doc `12-escalabilidad.md`: análisis 100 → 100k usuarios, qué añadir y **cuándo** (Redis/cache a 10k, colas/CDN/archivado a 100k). No sobreoptimizar.
- Migración `008_perf_indexes`: índice `auth_sessions(refresh_hash)` (hot path de refresh), índice parcial de perfiles públicos, `community_members(community_id)`.
- Documentado el diseño que ya escala (API stateless, paginación keyset, PostGIS, storage desacoplado, límites de query). 29/29 tests verde.

### Added — Fase 9: Calidad (CI, entornos, deploy, rollback) (2026-06-24)
- **GitHub Actions** (`.github/workflows/ci.yml`): job `api` (Postgres+PostGIS efímero → typecheck + migraciones + 29 tests + audit prod) y job `mobile` (typecheck). En cada push/PR.
- Tests de integración detectan la DB por `DATABASE_URL` (ya no excluyen localhost) → corren en CI sobre Postgres limpio.
- Doc `11-calidad-ci-deploy.md`: gate de calidad, entornos (local/CI/staging/prod), deploy (Fly/Railway + EAS) y **rollback** (releases + migraciones aditivas + OTA).
- Limpieza: script `lint` huérfano → `typecheck`. Lockfiles verificados (`npm ci`).

### Added — Fase 7: Privacidad y legal (2026-06-24)
- Documentos en `legal/`: privacy-policy, terms-of-service, retención, eliminación-cuenta, índice.
- **`legal/RIESGOS-LEGALES.md`**: riesgos RGPD detectados (ubicación exacta por defecto, DB en EE.UU., menores, consentimiento granular) con acciones recomendadas.
- Reflejan los requisitos de negocio: no venta de datos, perfiles públicos, ubicación pública con control del usuario, acceso admin interno (diario excluido).
- **Pantalla de consentimiento** `mobile/app/consent.tsx`: informa qué datos son públicos antes de pedir permisos; onboarding → consent → permissions.
- Avisos: documentos son borradores técnicos, requieren revisión legal. Typecheck mobile limpio.

### Added — Frontend Expo + Fase 5: permisos de dispositivo (2026-06-24)
- Proyecto **Expo (SDK 52, expo-router)** en `mobile/` (Camino A: app nueva que consume la API).
- Pantallas conectadas a la API: splash/enrutado, auth (Google/Apple), onboarding, **permissions**, home, habits, tasks, journal.
- `lib/api.ts`: cliente con tokens en SecureStore + **auto-refresh** al 401. `state/auth.tsx`: sesión. `theme/tokens.ts`: colores + 9 niveles del prototipo.
- **Fase 5**: `services/permissions.ts` + `permissions.tsx` — permisos contextuales (cámara/fotos/localización), todos los estados (granted/denied/limited/undetermined), guía a Ajustes al rechazar, mínimo acceso. Ubicación **avisa que será pública** antes de pedir consentimiento.
- Typecheck limpio; `expo config` válido. Doc `10-frontend-permisos.md`, `mobile/README.md`.

### Security — Fase 6: Auditoría de seguridad (2026-06-24)
- **Eliminado `drizzle-orm`** (advisory SQLi por identificadores; no se usaba — queries raw parametrizadas) → **producción con 0 vulnerabilidades**.
- Añadido `secureHeaders` (CSP, HSTS, nosniff, X-Frame), `bodyLimit` 256KB, **rate limit global** 120/min, `onError` genérico (no filtra stack traces).
- Corregido CORS: faltaba método `PUT`.
- Doc `09-seguridad.md`: modelo de amenazas (A1–A12), revisión OWASP/API, riesgos abiertos (ubicación exacta, token de bloqueado 15 min, rate limit en memoria).
- Verificado: sin SQLi en código de app, sin secretos en git, 29/29 tests verde.
- Avisos dev restantes (vitest/vite/esbuild) documentados como sin impacto en producción.

### Added — Fase 4: Backend por módulos, lote 2 (2026-06-24)
- Módulos **communities, moderation, admin, analytics, media**.
- communities: foro/chat, miembros, roles; autorización por pertenencia (no-miembro bloqueado, solo moderador oculta, autor/mod borra).
- moderation: reportes (usuario) + resolución (admin).
- admin (rol admin): stats, listar/buscar usuarios, bloquear cuenta (revoca sesiones), gestionar roles, log de auditoría. Diario excluido por privacidad.
- analytics propia con lista blanca de eventos (migración 007 `analytics_events`). No se venden datos.
- media: presigned uploads a Cloudflare R2 (binario no pasa por la API); SDK aws como dependencia opcional; 503 si no configurado.
- **7 tests nuevos (29 totales)** contra Neon, verde. Typecheck limpio.
- Doc `08-backend-modulos-lote2.md`. Backend MVP completo (auth + 11 módulos).

### Added — Fase 4: Backend por módulos, lote 1 (2026-06-24)
- Módulos **profiles, location, habits, tasks, journal** (service + routes + Zod).
- profiles: perfil propio/público, username único, enlaces sociales, onboarding.
- location: PostGIS upsert + `nearby`; respeta `location_sharing` (exact/city/off) como mitigación de privacidad; radio/límite acotados (anti-scraping).
- habits: CRUD + log diario (upsert) + racha + logs semanales.
- tasks: CRUD. journal: upsert por fecha + paginación (privado).
- **Autorización por dueño** en todas las queries (filtro `profile_id`). Tests de aislamiento (no tocar datos ajenos → 404).
- **8 tests nuevos** (22 totales) contra Neon, en verde. Typecheck limpio.
- Doc `07-backend-modulos.md`.

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
