# 1212 — App móvil (Expo)

Cliente móvil de 1212. React Native + Expo (SDK 52) + expo-router. Consume la API de `../api`.

## Setup

1. `npm install`
2. Levanta la API: `cd ../api && npm run db:migrate && node --env-file=.env node_modules/.bin/tsx src/index.ts`
3. Ajusta `apiBaseUrl` en `app.json` → `extra` si la API no está en `http://localhost:8787`. En dispositivo físico usa la IP de tu Mac (no `localhost`).
4. `npm start` → abre en Expo Go (escanea QR) o simulador iOS/Android.

## Estructura (expo-router)

```
app/
  _layout.tsx     AuthProvider + Stack
  index.tsx       splash + enrutado por sesión
  auth.tsx        login Google/Apple
  onboarding.tsx  carrusel 3 pasos
  permissions.tsx permisos cámara/fotos/localización (Fase 5)
  home.tsx        nivel, racha, accesos
  habits.tsx / tasks.tsx / journal.tsx
src/
  theme/tokens.ts     colores + 9 niveles (del prototipo)
  lib/api.ts          cliente API + tokens (SecureStore) + auto-refresh
  state/auth.tsx      contexto de sesión
  services/permissions.ts  permisos del dispositivo
```

## Estado

Lote 1: flujo auth + onboarding + permisos + home/hábitos/tareas/diario conectados a la API. Pendiente: niveles (detalle), comunidad, mapa global, perfil/ajustes, búsqueda.

## Pendientes (credenciales)
- Login Google: configurar `GOOGLE_CLIENT_ID` y cablear `expo-auth-session` en `auth.tsx`.
- Login Apple: funciona en build iOS real con la capacidad *Sign in with Apple* (cuenta dev).
- Ver `../docs/06-oauth-setup.md`.
