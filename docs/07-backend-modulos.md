# FASE 4 — Backend por módulos (lote 1)

> App **1212**. API Node/Hono + Neon. Fecha: 2026-06-24.
> Lote 1 (núcleo MVP del home): profiles, location, habits, tasks, journal.
> Estado: implementado y testeado (22/22 tests contra Neon).

Cada módulo = `service.ts` (lógica + **autorización por dueño**) + `routes.ts` (endpoints + Zod) + tests de integración. Patrón de autorización: toda query filtra por `profile_id = userId`; ninguna confía en un id que venga del cliente sin comprobar pertenencia.

---

## profiles

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/profiles/me` | Bearer | perfil propio (incluye config privada) |
| PATCH | `/profiles/me` | Bearer | actualizar (username único, bio, ciudad, avatar, isPublic, locationSharing) |
| PUT | `/profiles/me/links` | Bearer | reemplazar enlaces sociales (máx 6) |
| POST | `/profiles/me/onboarding-done` | Bearer | marcar onboarding completo |
| GET | `/profiles/:username` | — | perfil **público** (solo si `is_public`); incluye nivel y enlaces |

Validación de `username` (`^[a-z0-9_.]{3,20}$`) y unicidad. Perfil privado → 404 en la ruta pública (no se filtra su existencia).

## location

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| PUT | `/location/me` | Bearer | guardar mi ubicación (PostGIS, exacta) |
| DELETE | `/location/me` | Bearer | quitarme del mapa |
| GET | `/location/nearby?lat&lng&radiusKm&limit` | Bearer | perfiles públicos cercanos |

**Privacidad (mitigación del riesgo de ubicación pública exacta):** `nearby` respeta `profiles.location_sharing`:
- `exact` → devuelve lat/lng exactos.
- `city` → devuelve solo la ciudad (lat/lng = null).
- `off` → el usuario no aparece.

El default sigue siendo `exact` (decisión de producto), pero el usuario puede bajar su exposición. Radio y límite acotados (máx 20.000 km / 200 resultados) para frenar scraping masivo.

## habits

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/habits` | hábitos activos |
| POST | `/habits` | crear |
| DELETE | `/habits/:id` | archivar (no borra histórico) |
| PUT | `/habits/:id/log` | marcar/desmarcar un día (upsert) |
| GET | `/habits/logs?from&to` | logs de la semana (tabla del diseño) |
| GET | `/habits/streak` | racha actual (días consecutivos) |

Marcar un log verifica que el hábito es del usuario (test cubre el intento cruzado → 404).

## tasks

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/tasks?dueDate=` | tareas (opcional por fecha) |
| POST | `/tasks` | crear |
| PATCH | `/tasks/:id` | marcar hecha/no |
| DELETE | `/tasks/:id` | borrar |

## journal (privado)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/journal?limit&before` | entradas (paginación por fecha) |
| GET | `/journal/:date` | entrada de un día |
| PUT | `/journal/:date` | crear/editar (upsert por fecha) |

El diario es estrictamente privado del dueño.

---

## Tests (8 nuevos, 22 totales)
- profiles: update, username único entre usuarios, perfil público vs privado.
- location: upsert + nearby, `off` desaparece del mapa, coords inválidas rechazadas.
- habits: crear/marcar/racha, **no marcar hábito ajeno** (aislamiento).
- tasks: crear/toggle/borrar, **no togglear tarea ajena** (aislamiento).
- journal: upsert idempotente por fecha.

## Pendiente Fase 4 (lote 2)
media (subida avatar/fotos), communities (foro/chat/miembros/archivos), moderation, admin (acceso interno del propietario), analytics.
