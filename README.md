# 1212 — Evoluciona

App de desarrollo personal gamificado: hábitos, tareas y diario que hacen evolucionar tu **nivel** (1→9), con capa social (perfiles públicos, comunidades y mapa global).

## Estado actual

Este repositorio contiene hoy un **prototipo de diseño de alta fidelidad** exportado desde Claude Design (`index.html` + runtime `support.js`). **No es todavía una app funcional**: no hay backend, base de datos, autenticación real ni persistencia.

Se está siguiendo un proceso por fases (CTO/arquitectura/seguridad) para convertirlo en un producto. Ver [`docs/`](docs/).

## Documentación (Fase 1)

| Doc | Contenido |
|-----|-----------|
| [docs/01-auditoria.md](docs/01-auditoria.md) | Estado del repo, riesgos, decisión de fondo |
| [docs/02-prd.md](docs/02-prd.md) | Objetivo, usuarios, casos de uso, alcance MVP |
| [docs/03-arquitectura.md](docs/03-arquitectura.md) | Pila propuesta (frontend/backend/infra) |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de cambios |

## Ver el prototipo

Servir la carpeta `app/` con cualquier servidor estático y abrir `index.html`. Requiere conexión (carga fuentes y `globe.gl` por CDN).

## Próximos pasos

Fase 2 (modelo de datos) tras aprobar PRD y arquitectura. **No se modifica el prototipo hasta confirmar el camino** (ver auditoría, sección 2).
