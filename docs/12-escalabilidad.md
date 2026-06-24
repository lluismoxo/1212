# FASE 8 — Escalabilidad

> App **1212**. Fecha: 2026-06-24. Principio: **no sobreoptimizar** — preparar, no construir lo que no hace falta aún.

## Resumen

El MVP actual (1 instancia de API + Neon + índices) aguanta holgadamente hasta ~10k usuarios. Este documento marca **qué añadir y cuándo**, por umbrales. Lo aplicado ahora: índices que faltaban (migración 008). El resto se activa cuando los números lo pidan.

---

## Escenarios por número de usuarios

### 100 usuarios — *(estado actual, suficiente)*
- 1 instancia de API (Fly/Railway free), Neon free.
- Sin cache, sin colas. Rate limit en memoria OK.
- **Acción:** ninguna. Ya cubierto.

### 1.000 usuarios
- Mismo stack. Vigilar consultas lentas con `pg_stat_statements`.
- **Acción:** activar logs de queries lentas; revisar plan de Neon (compute).

### 10.000 usuarios
- La API probablemente sigue con 1–2 instancias.
- Rate limit en memoria **deja de servir** si hay >1 instancia → **mover a Redis/Upstash** (clave compartida).
- Cache de lecturas calientes: perfiles públicos, catálogo de niveles, listado de comunidades → **Redis con TTL corto**.
- Mapa (`nearby`): ya acotado por radio/límite + índice GiST. Vigilar.
- **Acción:** Redis (rate limit + cache), réplica de lectura de Neon si hace falta.

### 100.000 usuarios
- API **stateless** detrás de balanceador, autoescalado horizontal (por eso el rate limit y sesiones no viven en memoria de proceso — los refresh ya están en DB).
- **CDN** (Cloudflare) delante de R2 para imágenes (avatares/fotos) — ya en R2, solo añadir caché de CDN.
- **Colas** (p. ej. Upstash QStash / BullMQ) para trabajos diferidos: envío de notificaciones, recálculo de niveles/rachas en lote, agregados de analítica. Hoy todo es síncrono; a esta escala conviene desacoplar.
- Particionado/archivado de tablas de crecimiento alto: `community_messages`, `analytics_events`, `audit_logs` (por fecha).
- **Acción:** colas, CDN, archivado por fecha, posible separación de la analítica a su propio almacén.

---

## Diseño que YA escala (decisiones tomadas pronto)

- **API stateless:** sesiones (refresh) en DB, no en memoria → escalar horizontal es trivial.
- **Paginación keyset** en feeds (`community_messages` por `created_at`, journal por `entry_date`) → no se degrada con el tamaño.
- **Índices** desde el día 1 + migración 008 (refresh_hash, perfiles públicos parciales, members por comunidad).
- **PostGIS GiST** para el mapa → consultas espaciales eficientes.
- **Límites de query** (radio mapa ≤ 20.000 km, page size ≤ 100–200) → frena coste y scraping.
- **Storage desacoplado** (R2, presigned) → el binario no pasa por la API; CDN se añade sin cambios de código.

## Cache (cuando toque, no antes)
| Dato | Estrategia | Invalidación |
|------|-----------|--------------|
| Catálogo de niveles | cache larga (casi inmutable) | al cambiar la semilla |
| Perfil público | TTL corto (30–60s) | al editar el perfil |
| Listado de comunidades | TTL corto | al crear/borrar comunidad |

## Colas (a partir de ~100k)
Notificaciones push, recálculo de nivel/racha en lote, agregación de analítica. Patrón productor→cola→worker.

## Observabilidad / costes
- Sentry (errores) + `pg_stat_statements` (queries) + dashboards de Neon.
- Coste dominado por: compute de Neon, egress (mitigado por R2 sin egress + CDN), y la cola/Redis cuando entren.
- Revisar coste por hito; no contratar nada antes de necesitarlo.

## Prevención de consultas lentas
- Nunca `select *` en hot paths; columnas explícitas (ya aplicado).
- Agregados pesados (racha, stats) por índice o, a gran escala, materializados/cacheados.
- `EXPLAIN` en cualquier query nueva sobre tabla grande antes de subirla.

---

## Aplicado en esta fase
- Migración `008_perf_indexes`: índice de `auth_sessions(refresh_hash)` (hot path de refresh), índice parcial de perfiles públicos, índice de `community_members(community_id)`.
- 29/29 tests siguen en verde.

## No aplicado a propósito (evitar deuda/over-engineering)
Redis, colas, CDN, réplicas, particionado — se activan por umbral, documentados arriba.
