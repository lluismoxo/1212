# Auditoría de Seguridad — 1212

**Fecha:** 2026-06-29 · **Alcance:** todo el repo (api, mobile, db, ci) · **Metodología:** OWASP ASVS/MASVS/MASTG, STRIDE, GDPR.

> Auditoría real sobre el código, no checklist teórico. Se asumió cliente comprometido y atacante autenticado.

---

## FASE 0 — THREAT MODEL

### Assets sensibles
- Tokens de sesión (access JWT 15min, refresh 30d).
- PII: nombre, username, foto, **teléfono/WhatsApp**, enlaces sociales, **ubicación exacta**.
- Credenciales: password (bcrypt), `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, connection string Neon.

### Trust boundaries
1. Dispositivo (WebView + Expo nativo) ↔ API (Hono).
2. API ↔ Neon (Postgres, TLS).
3. API ↔ Google OAuth / (R2 futuro).
4. WebView ↔ runtime del diseño (Claude Design) + bridge.js.

### DFD (resumen)
```
[Usuario] --geo/fotos/login--> [WebView+bridge] --HTTPS+JWT--> [API Hono]
                                      |                            |
                              localStorage(tokens)         [Neon Postgres/PostGIS]
[Safari] --OAuth code--> [API /auth/google/callback] --> [Google JWKS]
```

### Actores y STRIDE (top)
| Actor | Amenaza principal | STRIDE |
|---|---|---|
| Atacante externo | MITM en WebView, fuerza bruta login | Tampering, Info disclosure |
| Usuario malicioso autenticado | IDOR/BOLA sobre datos de otros | Elevation, Info disclosure |
| Empleado interno / fuga de string Neon | Acceso total a DB (sin RLS) | Info disclosure |
| Otro usuario | Stalking por ubicación exacta pública | Info disclosure |

### Top escenarios de abuso (priorizados)
1. Robo de teléfono de otros usuarios vía perfil público sin auth. **[CORREGIDO]**
2. WebView carga origen externo malicioso (phishing/MITM). **[CORREGIDO]**
3. Stalking por `location_sharing=exact` público. **[Riesgo aceptado/mitigable]**
4. Fuga del connection string Neon → sin RLS, acceso total. **[Riesgo abierto]**
5. Fuerza bruta login → mitigado por rate limit. **[OK]**
6. Robo de refresh token → mitigado por rotación + reuse detection. **[OK]**

---

## FASE 1 — ARQUITECTURA (detectada)

- **Frontend:** diseño Claude Design (runtime propio + React) en WebView; `bridge.js` conecta a la API.
- **App nativa:** Expo SDK 52 (expo-router), react-native-webview, expo-web-browser, expo-notifications, expo-camera/image-picker/location.
- **Backend:** Node + **Hono 4** + TypeScript. SQL crudo parametrizado con **postgres-js** (sin ORM; drizzle eliminado por advisory).
- **Auth:** OIDC Google (Authorization Code + state) y email/password (bcrypt). JWT (`jose`) + refresh opaco hasheado.
- **DB:** Neon Postgres + PostGIS. Runner de migraciones propio.
- **Almacenamiento archivos:** Cloudflare R2 vía presigned (no activo; sin credenciales).
- **CI/CD:** GitHub Actions (typecheck + tests contra Postgres efímero + audit). **Ahora +secret scanning.**
- **Secretos:** `.env` (gitignored). Verificado: sin secretos en código ni en historial git.

---

## HALLAZGOS

Severidad: 🔴 Alta · 🟠 Media · 🟡 Baja · ✅ Verificado correcto

### 🔴 H1 — Teléfono/WhatsApp expuestos en perfil público (CWE-359, A01)
**Evidencia:** `getPublicProfile` (`api/src/modules/profiles/service.ts`) devolvía TODOS los `social_links`, incluido teléfono/WhatsApp, en `GET /profiles/:username` (sin requireAuth). Cualquiera con el username obtenía el teléfono.
**CVSS aprox:** 6.5 (AV:N/AC:L/PR:N/UI:N/C:H).
**Fix aplicado:** el perfil público solo expone enlaces no-contacto (instagram/x/youtube/linkedin/web/tiktok); phone/whatsapp se excluyen.
**Largo plazo:** que el dueño elija por enlace si es público o solo-contactos.

### 🔴 H2 — WebView con `originWhitelist:["*"]` + `mixedContentMode:"always"` (CWE-749, A05)
**Evidencia:** `mobile/app/index.tsx`. Permitía renderizar cualquier origen y contenido HTTP sin cifrar dentro del WebView (MITM/phishing si navega a un enlace).
**CVSS aprox:** 6.1 (AV:N/AC:H/C:H/I:L).
**Fix aplicado:** `originWhitelist` restringido a la API y al scheme `app1212://`; enlaces externos se abren en el navegador del sistema (`onShouldStartLoadWithRequest` + `Linking`); `mixedContentMode` solo "always" en dev (http localhost), "never" con API https.

### 🔴 H3 — Sin RLS en Postgres (defensa en profundidad) (CWE-284, A04)
**Evidencia:** ninguna `row level security`/`policy` en `db/migrations`. La autorización vive 100% en la capa API (filtro `profile_id = userId` en cada query, verificado correcto). Si se filtra el connection string, no hay segunda barrera.
**CVSS aprox:** 5.0 (depende de fuga del secreto).
**Fix corto:** rotar credenciales Neon periódicamente; rol de app con permisos mínimos.
**Fix largo:** habilitar RLS por `profile_id` como segunda capa.
**Estado:** riesgo abierto, documentado. La capa API mitiga el caso normal.

### 🟠 H4 — `contentType` de subida sin validar MIME real (CWE-434)
**Evidencia:** `media/routes.ts` confía en el `contentType` que envía el cliente para el presign. R2 no activo aún.
**Fix largo:** validar magic-bytes al recibir/servir; restringir por extensión real en R2.

### 🟠 H5 — Fotos con EXIF (geolocalización) van directas a R2 (CWE-359, GDPR)
**Evidencia:** flujo de avatar sube binario directo a R2 sin stripear EXIF. Una foto puede llevar coordenadas.
**Fix largo:** stripear EXIF en el cliente (expo-image-manipulator) antes de subir.
**Estado:** R2 no activo; pendiente cuando se active.

### 🟠 H6 — Ubicación exacta pública = riesgo de stalking (CWE-359, GDPR)
**Evidencia:** `location_sharing='exact'` publica coordenadas precisas. Se simplificó a on/off (on=exact) por decisión de producto.
**Mitigación:** es opt-in (toggle), default 'off'/'city'. Documentado en `legal/RIESGOS-LEGALES.md`.
**Recomendación:** ofrecer también precisión "ciudad" o jitter de coords antes de producción masiva.

### 🟠 H7 — Deep link por scheme custom sin universal links (CWE-939)
**Evidencia:** OAuth vuelve por `app1212://`; otra app puede registrar el mismo scheme e interceptar el código.
**Mitigación:** el code intercambio usa client_secret server-side + state; el deep link solo transporta tokens ya emitidos sobre una sesión de Safari.
**Fix largo:** universal links (associatedDomains) cuando haya dominio.

### 🟡 H8 — Rate limit en memoria (CWE-770)
**Evidencia:** `middleware/rateLimit.ts` usa `Map` en proceso. No protege contra DoS distribuido ni sirve con múltiples instancias.
**Fix largo:** Redis/Upstash. Ya documentado (Fase 8).

### 🟡 H9 — `/design/*` y `/legal/*` servidos ANTES de secureHeaders (CWE-693)
**Evidencia:** `api/src/index.ts`: el estático del diseño va antes de `secureHeaders()` (necesario porque el runtime usa inline scripts que la CSP bloquearía). Esas rutas no llevan CSP.
**Mitigación:** es HTML propio sin entrada de usuario sin escapar; el WebView ahora bloquea orígenes externos.
**Fix largo:** CSP con nonce para los inline del runtime.

---

## ✅ VERIFICADO CORRECTO (no son hallazgos)
- **A03 Injection:** todo SQL parametrizado (postgres-js template); sin `sql.unsafe/raw`; sin concatenación de input. Sin SQLi.
- **Admin (BFLA):** `adminRoutes.use("*", requireAuth, requireAdmin)` protege todo el módulo. RBAC con `requireRole`.
- **IDOR/BOLA:** cada query de habits/tasks/journal/communities filtra por `profile_id = userId`. Tests de aislamiento cruzado.
- **Auth:** refresh con rotación atómica + reuse detection (revoca toda la familia ante robo). Race/TOCTOU cubierto por `update ... where revoked_at is null returning`.
- **OAuth:** state anti-CSRF (cookie HttpOnly SameSite=Lax). Verificación id_token contra JWKS de Google con `aud=GOOGLE_CLIENT_ID`.
- **Cripto:** refresh = randomBytes(32)+SHA-256; passwords bcrypt(10); comparación timing-safe. Sin MD5/SHA1/crypto casera/claves hardcoded.
- **Logging:** no se registran tokens/PII/ubicación. `onError` genérico (no filtra stack).
- **Headers:** secureHeaders (CSP/HSTS/X-Frame/nosniff). bodyLimit 256KB. CORS allowlist (no `*`).
- **Secretos:** sin secretos en código ni en historial git (verificado).
- **GDPR derecho al olvido:** `DELETE /auth/account` (cascade + anonimiza). Rate limit en login/register/forgot/refresh.
- **XSS:** diseño usa React.createElement (auto-escapa); datos vía `textContent`; el único `innerHTML` es markup estático sin datos de usuario.

---

## RESULTADOS

### Security Score: **78/100**
Base sólida (auth, injection, authz por dueño, cripto correctos). Penalizan: sin RLS, PII de contacto que estaba expuesta (corregida), WebView laxo (corregido), rate limit en memoria, R2/EXIF pendientes.

### Bloqueantes para publicar (resolver antes de store)
1. ✅ H1 teléfono público — **corregido**.
2. ✅ H2 WebView origin — **corregido**.
3. ⚠️ Mover API a HTTPS público (hoy localhost) y Neon a región UE.
4. ⚠️ Rotar `JWT_SECRET` y credenciales (el secret de dev no debe ir a prod).
5. ⚠️ Decidir precisión de ubicación pública (H6) con criterio legal.

### Riesgos aceptables (MVP)
- H3 sin RLS (la capa API mitiga; rotar credenciales).
- H8 rate limit en memoria (1 instancia).
- H7 scheme deep link (mitigado por state + secret server-side).

### Plan 7 días
- [x] Corregir H1, H2.
- [x] Secret scanning (gitleaks) en CI.
- [ ] Rotar JWT_SECRET prod, separar `.env.production`.
- [ ] HTTPS en la API (deploy).

### Plan 30 días
- [ ] RLS por `profile_id` (H3).
- [ ] EXIF strip al subir (H5) + validación magic-bytes (H4).
- [ ] Neon región UE; rotación de credenciales programada.
- [ ] CSP con nonce para el runtime del diseño (H9).

### Plan 90 días
- [ ] Universal links (H7). Redis para rate limit (H8).
- [ ] SAST (CodeQL) + SBOM + Dependabot.
- [ ] Detección de login anómalo / device binding opcional.
- [ ] Pentest externo.

### Checklist producción
- [ ] HTTPS + HSTS forzado. [ ] JWT_SECRET fuerte rotado. [ ] Neon UE + backups verificados.
- [ ] Rate limit distribuido. [ ] Logs sin PII. [ ] Política de privacidad revisada por legal.

### Checklist App Store / Play Store
- [ ] Usos de permisos justificados (cámara/fotos/ubicación) en Info.plist/manifest.
- [ ] Privacy Nutrition Label / Data Safety form coherente con datos recogidos.
- [ ] Cuenta de prueba para revisión. [ ] Borrado de cuenta accesible (✅ existe).

### Riesgos residuales
Ubicación exacta pública (opt-in), sin RLS (mitigado), rate limit en memoria, deep link por scheme. Aceptables para MVP; abordar según el plan antes de escala.

---

## FASE 2 — HARDENING ITERATIVO (2026-07-02, rama `security-hardening`)

Segunda pasada. Todos los fixes con test/typecheck. Solo servidor + config (no toca bridge.js, que va en PR #32).

### 🔴 H10 — Account pre-hijacking al enlazar OIDC (CWE-287)
`loginWithIdentity` fusionaba una identidad Google con una cuenta password existente por email SIN exigir `email_verified`. Un atacante podía pre-crear una cuenta password con el email de la víctima (no hay verificación de email en el registro) y quedar fusionado cuando la víctima entra con Google.
**Fix:** solo se auto-enlaza si `identity.emailVerified === true` (`canLinkToExistingAccount`, con test); al enlazar un email verificado se marca la cuenta como `email_verified=true`.
**Residual:** sin flujo de verificación de email en el registro password, el pre-hijack con *email verificado por el atacante* sigue siendo teórico → pendiente añadir verificación de email al alta password.

### 🟠 H11 — Oráculo de enumeración por temporización en login (CWE-208)
`loginWithPassword` retornaba antes de `bcrypt.compare` cuando el email no existía → el tiempo de respuesta distinguía "email existe" de "no existe".
**Fix:** se compara siempre contra un hash bcrypt señuelo. Bcrypt subido a 12 rounds.

### 🟠 H12 — Rate limit eludible por X-Forwarded-For falsificado (CWE-290)
La clave del rate limit salía de `x-forwarded-for`, cabecera que el cliente controla → fuerza bruta rotando la cabecera.
**Fix:** `TRUST_PROXY` (default false). Sin proxy de confianza se usa la IP real del socket; XFF solo se respeta si `TRUST_PROXY=true`.

### 🟠 H13 — id_token / access token sin pin de algoritmo (CWE-347)
`jwtVerify` no fijaba `algorithms` → margen a confusión de algoritmo / downgrade a "none".
**Fix:** access token fijado a `HS256`; id_tokens OIDC a `RS256/ES256`.

### 🟡 H14 — Estáticos (/design, /legal) sin cabeceras de seguridad (era H9)
Se servían antes de `secureHeaders`.
**Fix:** middleware propio con CSP a medida (permite el inline del runtime + unpkg/openfreemap/fontshare, bloquea object/base/frame-ancestors), nosniff, no-referrer, X-Frame-Options DENY.

### 🟡 H15 — Guardrails de configuración de producción
La API arrancaba en producción con JWT_SECRET de ejemplo, CORS con localhost o DB sin TLS.
**Fix:** `productionGuards` (con test) aborta el arranque si `NODE_ENV=production` y el secreto es corto/de ejemplo, CORS incluye localhost/exp, o `DATABASE_URL` no exige TLS.

### 🟡 H16 — Token de reset filtrable por NODE_ENV mal configurado
`devResetToken` se devolvía con `NODE_ENV !== "production"` (incluye vacío/typo).
**Fix:** solo con `NODE_ENV === "development"`.

### Residuales tras Fase 2 (no aplicados a ciegas)
- **RLS (H3):** requiere rol de app con permisos mínimos + pruebas contra DB real. No se aplica a ciegas para no romper la app (conecta como owner hoy). Plan: crear rol `app_rw`, políticas por `profile_id`, migrar el connection string.
- `meta()` de auth aún guarda la IP de XFF sin gate (solo es metadato de auditoría, no control).
- Tokens en localStorage del WebView (menos seguro que Keychain) — es territorio de la arquitectura WebView.
