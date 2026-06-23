# FASE 1 — Arquitectura propuesta

> App **1212**. Propuesta para aprobación. **No implementar todavía.**
> Fecha: 2026-06-24.

Principio rector: simplicidad de MVP, sin deuda grave, escalable, segura desde el día 1, con frontend / backend / infraestructura **separados**.

---

## Resumen de la pila recomendada

| Capa | Elección recomendada | Por qué |
|------|----------------------|---------|
| Frontend | **React Native + Expo** (TypeScript) | El diseño es una app móvil (status bar, notch, permisos nativos). Expo da acceso limpio a cámara/fotos/localización y build iOS/Android. |
| Backend | **Supabase** (Postgres + Auth + Storage + RLS) para MVP | Auth Google/Apple, Postgres real, Row Level Security para autorización, storage de imágenes. Menos infra que mantener; escala razonable. Migración a backend propio posible más adelante. |
| Base de datos | **PostgreSQL** (gestionado por Supabase) | Relacional, maduro, RLS, índices geoespaciales (PostGIS) para el mapa. |
| Auth | **Supabase Auth** con proveedores Google + Apple (OIDC) | Cubre el requisito exacto; gestiona sesiones + refresh tokens. |
| Storage | **Supabase Storage** (buckets con políticas) | Avatares, fotos. Acceso por política, no público abierto. |
| Infra/Deploy | App: **EAS Build/Submit** (Expo). Backend: Supabase gestionado. | Mínima operación para MVP. |
| Observabilidad | **Sentry** (errores) + logs de Supabase | Errores de cliente y servidor desde el principio. |
| Analítica | **PostHog** (eventos de producto, self-host opcional) | Embudo de onboarding, retención. Sin vender datos. |
| Entornos | local / staging / producción (proyectos Supabase separados) | Aislamiento de datos y secretos. |

> **Alternativa al backend (a evaluar):** API propia **Node + NestJS/Fastify + Postgres + Prisma**. Ventaja: control total, lógica de negocio compleja, portabilidad. Inconveniente: mucha más infra, auth y RLS hay que construirlos. **Recomendación: empezar con Supabase**, abstraer el acceso a datos en el cliente para poder migrar.

---

## Frontend

- **Framework:** React Native + Expo (TS). Reemplaza el prototipo `<x-dc>` (que no es producción).
- **Estructura propuesta:**
  ```
  src/
    app/            # rutas (expo-router): pantallas = las del prototipo
    components/     # UI reutilizable (cristal, glass card, image-slot real…)
    features/       # auth, habits, tasks, journal, levels, community, map, profile
    lib/            # cliente API/Supabase, helpers
    services/       # permisos (cámara/fotos/localización), storage
    state/          # store (Zustand) + cache servidor (React Query)
    theme/          # tokens del diseño (gold, niveles, glass)
  ```
- **Por qué:** separa UI de lógica; React Query gestiona datos de servidor; Zustand para estado local de UI. El diseño actual se traduce a componentes nativos.
- **Riesgo:** reescritura del prototipo. Mitigado porque el diseño ya está definido y validado visualmente.

## Backend

- **Patrón:** servicios por módulo (auth, users, profiles, location, media, communities, moderation, analytics), expuestos como:
  - tablas Postgres con **RLS** para CRUD directo seguro, y
  - **Edge Functions** (Supabase) para lógica que no debe vivir en el cliente: rate limiting, ofuscación de ubicación, acciones de admin/moderación, borrado de cuenta.
- **Por qué:** minimiza backend a mantener sin renunciar a control donde importa (seguridad).
- **Riesgo:** lógica repartida entre RLS y functions → documentar bien qué va dónde.

## Base de datos

- **Motor:** PostgreSQL + **PostGIS** (mapa).
- **Estructura:** se detalla en Fase 2. Entidades base: `users/profiles`, `sessions`, `locations`, `habits`, `habit_logs`, `tasks`, `journal_entries`, `levels`, `communities`, `community_members`, `messages`, `permissions`, `moderation`, `audit_logs`, `app_config`.

## Autenticación

- **Proveedor:** Supabase Auth (Google + Apple OIDC).
- **Flujo:** PKCE → sesión con access token (corto) + refresh token (rotado). Logout revoca. Eliminación de cuenta = Edge Function que borra/anonimiza datos.
- **Detalle completo en Fase 3.**

## Storage

- Buckets `avatars`, `media`. Políticas: el dueño escribe; lectura según privacidad del perfil. Validación de tipo/tamaño en upload.

## Infraestructura / despliegue

- App móvil: EAS Build → TestFlight / Play Internal → producción.
- Backend: proyectos Supabase por entorno. Secretos en el gestor de secretos del entorno, **nunca** en el repo.

## Observabilidad

- **Logs:** Supabase (DB/Edge) + logs de seguridad propios en `audit_logs`.
- **Métricas:** Sentry (errores, performance), dashboards de Supabase.

## Analítica

- PostHog: eventos clave (`onboarding_completed`, `habit_checked`, `level_up`, `community_joined`, `account_deleted`). Anonimizable. **No se venden datos.**

## Entornos

| Entorno | Uso |
|---------|-----|
| local | desarrollo (Supabase CLI / stack local) |
| staging | pruebas integradas, datos de prueba |
| producción | usuarios reales, secretos aislados, backups |

---

## Decisiones que requieren tu input antes de Fase 2

1. **Supabase vs API propia** (recomendado: Supabase para MVP).
2. **React Native/Expo vs nativo iOS** (recomendado: Expo, multiplataforma).
3. Alcance del **mapa público**: ¿precisión exacta o solo ciudad? (impacta privacidad — recomendado: solo ciudad por defecto).
