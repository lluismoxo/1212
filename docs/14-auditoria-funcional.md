# Auditoría funcional — ¿está listo para usuarios reales?

> Revisión sobre el código real (no asunciones). Fecha: 2026-06-24.
> Solo diagnóstico — sin cambios todavía.

## Resumen ejecutivo

La app tiene **backend sólido y testeado** (auth, CRUD, autorización por dueño, 29 tests) y **pantallas conectadas** a la API (no son mocks). Pero hay **3 fallos que la hacen no-usable de punta a punta** y **varias funciones que parecen terminadas y no lo están**.

🔴 **Bloqueantes para un usuario real:**
1. **No se puede iniciar sesión** sin `googleClientId` (vacío en `app.json`). Sin login, no se prueba nada en cliente. *(Credencial del propietario.)*
2. **El sistema de niveles NO existe como motor.** La regla central (subir nivel con ≥70% de hábitos en 1 mes) **no está implementada en ningún sitio**. Todos quedan Nivel 1 para siempre.
3. **No hay comunidades.** Las 7 iniciales (CONSULTORÍA, IA, …) no están sembradas; la DB tiene **0**. La pantalla de comunidad sale vacía.

---

## MAPA DE FUNCIONALIDAD

| Pantalla | Existe | Estado | Persistencia | Datos | Prioridad |
|----------|--------|--------|--------------|-------|-----------|
| Auth (Google) | Sí | **Rota sin credencial** | Backend (tokens SecureStore) | Backend | Crítica |
| Onboarding | Sí | Funciona | n/a | — | Media |
| Consentimiento | Sí | Funciona | n/a | — | Media |
| Permisos | Sí | Funciona (estados ok) | n/a | — | Alta |
| Home | Sí | Parcial (nivel vía ruta pública, frágil) | Backend | Backend | Alta |
| Niveles | Sí | **Parcial — sin progresión** | Backend (solo lectura) | Backend | Crítica |
| Hábitos | Sí | **Parcial — solo marcar hoy** | Backend | Backend | Crítica |
| Tareas | Sí | **Parcial — no es "del día"** | Backend | Backend | Alta |
| Diario | Sí | Funciona | Backend | Backend | Media |
| Comunidades (lista) | Sí | **Vacía — sin seed** | Backend | Backend | Crítica |
| Comunidad detalle (chat) | Sí | Parcial (sin tiempo real) | Backend | Backend | Alta |
| Mapa | Sí | Funciona (depende de permiso) | Backend (PostGIS) | Backend | Media |
| Buscar | Sí | **Parcial — solo exacta** | Backend | Backend | Media |
| Perfil público | Sí | Funciona | Backend | Backend | Media |
| Perfil propio / ajustes | Sí | Funciona (ubicación, borrar cuenta) | Backend | Backend | Alta |

Persistencia general: **correcta** — todo va a Postgres/Neon, nada en estado local volátil. Sobrevive a logout/reinstalación/cambio de dispositivo (los tokens en SecureStore + datos en backend). Esto está **bien**.

---

## 1. Funcionalidades COMPLETAS (funcionan y persisten)

- **Autenticación de servidor**: OIDC, JWT + refresh con rotación y reuse-detection, logout, logout-all, eliminar cuenta (cascade + anonimiza mensajes). 29 tests.
- **Perfil**: leer/editar, username único, enlaces, público/privado, control de ubicación (exact/city/off), avatar por URL.
- **Diario**: una entrada por día (`unique(profile_id, entry_date)`), privado (solo dueño, ni admin), upsert.
- **Tareas (CRUD backend)**: crear/listar/toggle/borrar con aislamiento por dueño.
- **Mapa / nearby**: PostGIS, respeta `location_sharing`, límites anti-scraping.
- **Autorización**: por dueño en cada query; comunidades por pertenencia/rol; admin separado. Tests de aislamiento cruzado.

## 2. Funcionalidades PARCIALES (UI hecha, lógica incompleta)

- **Hábitos (`habits.tsx`)**: solo permite **marcar hoy = hecho**. No desmarca, no edita, no elimina, no muestra la tabla semanal ni el estado de cada día. El backend sí tiene log/semana/streak, pero la pantalla no los usa.
- **Tareas (`tasks.tsx`)**: titulada "Tareas del día" pero hace `GET /tasks` **sin filtrar por fecha** → muestra el histórico completo. La spec pide que las completadas **desaparezcan al acabar el día y no haya histórico**: no implementado (ni purga, ni manejo de zona horaria/fecha).
- **Home**: el nivel se pide a la **ruta pública** `/profiles/:username`; si el perfil es privado o el username no cargó, cae a Nivel 1. Funciona por casualidad, acoplamiento frágil.
- **Comunidad detalle**: chat carga **solo al abrir/enviar** (sin tiempo real ni polling). Spec pide sincronización en tiempo real.
- **Buscar**: solo coincidencia **exacta** de username (no hay endpoint de búsqueda parcial). Spec pide búsqueda parcial.

## 3. Funcionalidades FALSAS (UI sin lógica detrás)

- **Sistema de niveles**: la pantalla muestra 9 niveles y bloquea/desbloquea según `current_level`, pero **nada sube de nivel**. No existe cálculo de % de cumplimiento, ni agregación mensual, ni job/endpoint de promoción. `user_levels` solo se **lee**; se escribe una vez (Nivel 1 al registrarse) y nunca más. → **La regla central del producto no existe.**
- **Comunidades iniciales**: la UI espera comunidades, pero **no hay seed**; DB con 0. Las 7 temáticas del prototipo eran datos hardcoded del diseño, nunca se llevaron al backend.
- **Crear comunidad**: no hay UI para crearla (el backend sí tiene el endpoint).

## 4. Bugs / inconsistencias encontrados

- **B1** (crítico): login imposible sin `googleClientId`. App no usable end-to-end. *(Falta credencial.)*
- **B2** (crítico): sin motor de niveles → progresión imposible; "Aprendiz" permanente.
- **B3** (crítico): 0 comunidades → pantalla principal social vacía.
- **B4** (alto): "Tareas del día" muestra todas las tareas históricas; no desaparecen al cambiar el día.
- **B5** (alto): hábitos sin desmarcar/editar/eliminar/histórico en la UI.
- **B6** (medio): buscador solo exacto, no parcial.
- **B7** (medio): chat sin tiempo real.
- **B8** (bajo): Home obtiene su propio nivel por ruta pública (frágil si el perfil es privado).
- **B9** (info): no hay login email/contraseña ni recuperación (la spec los lista; decisión MVP previa fue "solo Google"). Aclarar si se quieren.

## 5. Riesgos

- **Integridad de la progresión:** cuando se implemente el motor de niveles, debe vivir **en backend** (no confiable en cliente). Bien encaminado: no hay endpoint para que el usuario escriba su nivel (no hay bypass), pero tampoco hay promoción legítima.
- **Multiusuario / consistencia:** los datos son de backend y compartidos, así que A/B/C verían lo mismo — **pero** sin comunidades ni tiempo real no se puede validar el caso social todavía.
- **Zona horaria** en tareas/hábitos/diario: las fechas las pone el **cliente** (`new Date().toISOString().slice(0,10)`). Dos dispositivos en zonas distintas pueden marcar días distintos. Definir si la fecha la fija el servidor.
- **Tareas sin purga** crecerán indefinidamente por usuario.

## 6. Cambios aplicados

Ninguno todavía — esta fase es **solo auditoría** (según lo pedido).

## 7. Casos aún pendientes de probar (requieren login funcional o seed)

- E2E real de registro→home→progresión (bloqueado por B1).
- Multiusuario en comunidades (bloqueado por B3).
- Cambio de dispositivo / reinstalación (la arquitectura lo soporta; falta probarlo con login real).
- Offline: el cliente **no** tiene capa offline (cada acción es un fetch); sin red, falla la operación. Definir si se requiere.

## 8. Plan siguiente (orden propuesto, al aprobar)

**Prioridad crítica (hacen la app usable):**
1. **Motor de niveles** (B2): endpoint/job server-side que calcula % de cumplimiento mensual de hábitos y promueve nivel si ≥70%. Tests con 69/70/71%, huecos, mes incompleto. Sin bypass cliente.
2. **Seed de las 7 comunidades** (B3): migración de semilla idempotente.
3. **Tareas "del día"** (B4): filtrar por fecha del servidor + purga/no-histórico según la regla.

**Prioridad alta:**
4. Hábitos: completar la UI (desmarcar/editar/eliminar/semana) usando los endpoints ya existentes (B5).
5. Fecha del servidor para hábitos/tareas/diario (riesgo zona horaria).
6. Home: pedir el nivel propio por un endpoint propio, no por la ruta pública (B8).

**Prioridad media:**
7. Búsqueda parcial (B6) — endpoint nuevo.
8. Refresco/polling del chat (B7).

**Decisiones del propietario antes de tocar nada:**
- ¿Se quiere login email/contraseña + recuperación, o se mantiene solo Google? (B9)
- ¿La fecha de "día" la fija servidor o dispositivo?
- ¿Hace falta soporte offline?
- Confirmar la regla exacta de niveles (¿70% del mes natural? ¿qué pasa si empieza a mitad de mes?).
