# FASE 2 — Modelo de datos

> App **1212**. Postgres (Supabase) + PostGIS + RLS. Borrador para aprobación.
> Fecha: 2026-06-24. Migraciones en `supabase/migrations/`.

Principios: integridad referencial, RLS en toda tabla expuesta, separación usuario/admin, índices desde el día 1, sin datos huérfanos, borrado/anonimización de cuenta soportado.

---

## Mapa de entidades

```
auth.users (gestionado por Supabase)
   │ 1:1
   ▼
profiles ──< social_links
   │ 1:1
   ▼
locations (PostGIS, exacta)
   │
   ├──< habits ──< habit_logs
   ├──< tasks
   ├──< journal_entries
   ├──< user_levels (estado de progreso) → levels (catálogo)
   ├──< community_members >── communities ──< community_messages
   │                                        └─< community_files
   ├──< moderation_reports
   └──< audit_logs

roles / user_roles      (autorización)
app_config              (configuración global, solo admin)
```

Convenciones: PK `uuid` (`gen_random_uuid()`), timestamps `created_at`/`updated_at` (`timestamptz`), soft-delete vía `deleted_at` donde aplica, FK con `on delete cascade` salvo donde se anonimiza.

---

## Entidades

### `profiles` — perfil público del usuario
Propósito: datos públicos que ve la comunidad. 1:1 con `auth.users`.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | = `auth.users.id` (FK on delete cascade) |
| username | citext UNIQUE | público, `@handle`, validado |
| display_name | text | nombre visible |
| avatar_url | text | ruta en bucket `avatars` |
| bio | text NULL | opcional |
| city | text NULL | texto libre ("Madrid, España") |
| is_public | boolean | default true (perfil público por diseño) |
| location_sharing | text | enum: `exact` \| `city` \| `off`. Default `exact` (decisión producto) |
| onboarding_done | boolean | default false |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz NULL | soft-delete (anonimización) |

Relaciones: 1:1 users; 1:N social_links, habits, tasks, journal, memberships.

### `social_links` — enlaces del perfil (públicos)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK→profiles | on delete cascade |
| kind | text | enum: instagram, x, youtube, linkedin, web, tiktok |
| url | text | validado http(s) |
| position | int | orden |

### `locations` — ubicación geográfica (PÚBLICA, exacta)
Propósito: punto en el mapa global. Decisión de producto: exacta. **Riesgo de seguridad alto** — mitigaciones en Fase 6/7 (consentimiento explícito, opt-out por `profiles.location_sharing`, no exponer historial).

| Columna | Tipo | Notas |
|---|---|---|
| profile_id | uuid PK FK→profiles | 1:1, on delete cascade |
| geog | geography(Point,4326) | PostGIS, lat/lng exactos |
| accuracy_m | numeric NULL | precisión reportada por el dispositivo |
| updated_at | timestamptz | cuándo se actualizó |

Índice: GiST sobre `geog` (consultas "cerca de").

### `levels` — catálogo de niveles 1..9 (estático)
Propósito: definición de los 9 niveles (nombre, descripción, colores). Solo lectura para usuarios.

| Columna | Tipo | Notas |
|---|---|---|
| n | int PK | 1..9 |
| name | text | "Aprendiz"… "Grado Supremo" |
| description | text | |
| aura | text | color hex |
| colors | jsonb | {deep,mid,light,edge,glow} |
| threshold | int | puntos/actividad para alcanzarlo |

### `user_levels` — progreso del usuario
| Columna | Tipo | Notas |
|---|---|---|
| profile_id | uuid PK FK→profiles | 1:1 |
| current_level | int FK→levels.n | default 1 |
| progress | int | 0..100 hacia el siguiente |
| points | int | acumulado |
| updated_at | timestamptz | |

### `habits` — hábitos del usuario
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK→profiles | on delete cascade |
| name | text | |
| icon | text NULL | |
| schedule | jsonb | días/frecuencia |
| archived | boolean | default false |
| created_at | timestamptz | |

### `habit_logs` — marcado diario de hábito
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| habit_id | uuid FK→habits | on delete cascade |
| profile_id | uuid FK→profiles | denormalizado para RLS rápida |
| log_date | date | |
| done | boolean | |
| UNIQUE | (habit_id, log_date) | un registro por día |

Índice: (profile_id, log_date) para vistas semanales y cálculo de racha.

### `tasks` — tareas del día
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK→profiles | on delete cascade |
| text | text | |
| done | boolean | default false |
| due_date | date NULL | |
| position | int | |
| created_at | timestamptz | |

### `journal_entries` — diario
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK→profiles | on delete cascade |
| entry_date | date | |
| body | text | privado (solo dueño) |
| UNIQUE | (profile_id, entry_date) | una entrada por día |

### `communities` — comunidades temáticas
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| slug | citext UNIQUE | |
| name | text | |
| description | text | |
| goal | text | |
| colors | jsonb | gradiente |
| is_private | boolean | default true |
| created_by | uuid FK→profiles | |
| created_at | timestamptz | |

### `community_members` — pertenencia + rol en comunidad
| Columna | Tipo | Notas |
|---|---|---|
| community_id | uuid FK→communities | on delete cascade |
| profile_id | uuid FK→profiles | on delete cascade |
| role | text | enum: member, moderator |
| joined_at | timestamptz | |
| PK | (community_id, profile_id) | |

### `community_messages` — foro/chat
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| community_id | uuid FK→communities | on delete cascade |
| profile_id | uuid FK→profiles | autor (on delete set null → anonimiza) |
| kind | text | enum: text, photo, file |
| body | text NULL | |
| media_url | text NULL | bucket `media` |
| created_at | timestamptz | |

Índice: (community_id, created_at desc).

### `community_files` — archivos compartidos
| id, community_id, profile_id, name, url, size_bytes, created_at |

### `roles` / `user_roles` — autorización global
`roles`: visitor, user, moderator, admin (semilla).
`user_roles`: (profile_id, role) — un usuario puede tener varios. Admin = acceso interno del propietario.

### `moderation_reports` — moderación
| id, reporter_id, target_type (profile/message/community), target_id, reason, status (open/reviewing/resolved/dismissed), handled_by, created_at, resolved_at |

### `audit_logs` — logs de seguridad/auditoría (solo admin lee)
| id, actor_id NULL, action, entity_type, entity_id, ip inet NULL, user_agent NULL, metadata jsonb, created_at |
Append-only. Sin RLS de lectura para usuarios.

### `app_config` — configuración global
| key text PK, value jsonb, updated_at | Solo admin escribe/lee.

---

## Roles y acceso (resumen RLS)

| Rol | Lectura | Escritura |
|---|---|---|
| visitante | nada (o solo metadatos públicos vía vista) | nada |
| usuario | perfiles públicos, comunidades a las que pertenece, su propio contenido | solo su propio contenido; mensajes en sus comunidades |
| moderador | + contenido de comunidades que modera | + ocultar mensajes / gestionar miembros de sus comunidades |
| admin | todo (incl. audit_logs, app_config) | todo |

Detalle de políticas RLS → en la migración SQL.

---

## Índices clave
- `profiles(username)` unique; `profiles(deleted_at)` parcial.
- `locations USING gist(geog)`.
- `habit_logs(profile_id, log_date)`, unique `(habit_id, log_date)`.
- `tasks(profile_id, due_date)`.
- `journal_entries` unique `(profile_id, entry_date)`.
- `community_messages(community_id, created_at desc)`.
- `community_members(profile_id)`.

## Constraints / integridad
- Todos los enum vía `check` o tipos enum nativos.
- FKs con cascade salvo autores de mensajes (`set null` → anonimización al borrar cuenta).
- `username` citext + check formato `^[a-z0-9_.]{3,20}$`.

## Migraciones / versionado
- Una migración por cambio, numeradas por timestamp (`supabase/migrations/<ts>_<nombre>.sql`).
- Nunca editar una migración aplicada; siempre nueva.
- Semillas (levels 1..9, roles) en migración aparte idempotente.

## Estrategia de crecimiento / consultas lentas
- Vistas semanales de hábitos: agregadas por índice `(profile_id, log_date)`, rango acotado.
- Mapa: consulta espacial con bounding-box + GiST, límite de resultados.
- Foro: paginación keyset por `(community_id, created_at)`.
- Evitar `select *` en cliente; usar columnas explícitas y RPC para agregados (racha, nivel).
