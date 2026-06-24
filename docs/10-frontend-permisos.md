# Frontend Expo + FASE 5 (permisos de dispositivo)

> App **1212**. Cliente en `mobile/` (Expo SDK 52 + expo-router). Fecha: 2026-06-24.

## Decisiones

- **Camino A confirmado:** el cliente es una app Expo nueva que reproduce el diseño del prototipo y consume la API. El `index.html` queda solo como referencia visual.
- **expo-router** (file-based) para las pantallas; mapean 1:1 con las del prototipo.
- **Tokens** en `expo-secure-store` (cifrado del SO), no en AsyncStorage. `lib/api.ts` añade `Authorization` y **refresca automáticamente** el access token al recibir 401.
- **Estado de sesión** en `state/auth.tsx`; enrutado inicial según sesión + onboarding.

## Pantallas (lote 1)
splash/enrutado · auth (Google/Apple) · onboarding · **permissions** · home · habits · tasks · journal — todas conectadas a la API real.

---

## FASE 5 — Permisos del dispositivo

Implementado en `services/permissions.ts` + pantalla `app/permissions.tsx`.

### Principios aplicados
- **Solicitud contextual:** el permiso se pide en el momento en que la acción lo necesita (foto de perfil → cámara/fotos; aparecer en el mapa → ubicación). Nunca al abrir la app.
- **Mínimo acceso:** solo cámara, galería y ubicación en primer plano. Sin micrófono, sin ubicación en segundo plano.
- **Todos los estados** normalizados: `granted` / `denied` / `limited` (galería iOS) / `undetermined`.
- **Flujo de rechazo:** si el usuario deniega, se explica y se ofrece **abrir Ajustes del sistema** (no se puede re-preguntar desde la app).

### Cámara y fotos
`requestCamera()` + `requestPhotos()`. iOS puede conceder acceso **limitado** a fotos (solo las seleccionadas) → se trata como válido.

### Localización (PÚBLICA)
- La pantalla **avisa explícitamente** de que la ubicación será pública para la comunidad antes de pedir el permiso (consentimiento informado — conecta con el riesgo A3 de seguridad y con Fase 7 legal).
- Tras conceder, se obtiene la posición y se envía a `PUT /location/me`.
- El usuario puede revocar desde Ajustes; además el backend soporta `location_sharing = off` para quitarse del mapa sin tocar permisos del SO.

### Textos de permiso (app.json)
`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription` (este último indica que la ubicación será pública). Android: `CAMERA`, `READ_MEDIA_IMAGES`, `ACCESS_FINE_LOCATION`.

## Pendiente
Cablear login Google (expo-auth-session) cuando haya `GOOGLE_CLIENT_ID`. Pantallas restantes (niveles, comunidad, mapa, perfil, búsqueda) en próximos lotes.
