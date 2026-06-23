# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/). Sin versionar aún (pre-MVP).

## [Sin publicar]

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
