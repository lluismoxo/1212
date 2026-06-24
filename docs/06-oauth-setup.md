# Setup OAuth — Google y Apple (para el propietario)

Pasos para obtener las credenciales que van en `api/.env`. Necesario para que el login real funcione.

## Google

1. https://console.cloud.google.com → crear/elegir proyecto.
2. **APIs & Services → Credentials → Create OAuth client ID.**
3. Tipo: **iOS** (y/o Android) para la app Expo; además un client **Web** si pruebas en web.
4. Copia el **Client ID** → `GOOGLE_CLIENT_ID` en `.env`.
   - Para Expo se usa normalmente la librería `expo-auth-session` / `@react-native-google-signin`. El `id_token` que devuelve es lo que la app envía a `POST /auth/login`.
5. Configura la **bundle id** / package name que use la app (se define en Fase 4 al crear el proyecto Expo).

## Apple

1. https://developer.apple.com (cuenta de pago, 99 €/año — **requisito de Apple** para Sign in with Apple).
2. **Certificates, IDs & Profiles:**
   - Crea un **App ID** con capacidad *Sign in with Apple*.
   - Crea un **Services ID** → su identificador va en `APPLE_CLIENT_ID`.
   - Crea una **Key** con *Sign in with Apple* → descarga el `.p8` (solo una vez).
3. Rellena en `.env`: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, y `APPLE_PRIVATE_KEY` (contenido del `.p8`).

## Notas
- La API solo **verifica** el `id_token` contra los JWKS públicos de cada proveedor; no necesita el client secret para el flujo de verificación de id_token (sí harán falta en el cliente Expo según la librería).
- Tras rellenar `.env`, reinicia la API. El login dejará de devolver `auth_failed` por "OAuth no configurado".
- **Seguridad:** el `.env` NUNCA se versiona (ya en `.gitignore`). El `.p8` tampoco.
