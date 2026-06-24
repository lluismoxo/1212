# FASE 1 — PRD (Product Requirements Document)

> App **1212** — "Evoluciona". Derivado del prototipo de diseño existente.
> Fecha: 2026-06-24. Estado: borrador para aprobación.

---

## Objetivo

1212 es una app de **desarrollo personal gamificado**. El usuario sostiene hábitos, tareas y un diario, y su progreso se materializa en un sistema de **9 niveles** (de "Aprendiz" a "Grado Supremo"), representados por un cristal que evoluciona. Incluye una capa **social/comunidad**: perfiles públicos, comunidades temáticas (consultoría, IA, ecommerce, marca personal, finanzas…) y un **mapa global** donde los usuarios aparecen geolocalizados.

Propuesta de valor: *"Convierte tu evolución personal en algo visible, medible y compartido."*

---

## Usuarios (roles)

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Visitante** | No autenticado. | Solo pantallas públicas de entrada (splash, onboarding, auth). |
| **Usuario** | Autenticado (Google/Apple). | Su perfil, hábitos, tareas, diario, comunidades, mapa, perfiles públicos de otros. |
| **Moderador** | Usuario con permisos sobre una comunidad. | Modera contenido/miembros de comunidades asignadas. |
| **Admin** | Propietario de la app. | Acceso administrativo a datos internos (definido como requisito de negocio). |

---

## Casos de uso principales

1. Registrarme con Google o Apple y crear mi perfil público (nombre, foto, enlaces).
2. Crear y marcar hábitos diarios/semanales; ver mi racha.
3. Gestionar tareas del día.
4. Escribir entradas de diario.
5. Ver mi nivel actual y el camino de evolución (vistas Camino / Órbita / Ascenso).
6. Unirme a comunidades, leer el foro, chatear, compartir archivos.
7. Buscar perfiles y verlos en el mapa global.
8. Gestionar mi cuenta: revisar permisos, cerrar sesión, **eliminar cuenta**.

---

## Flujo principal

```
Splash → Onboarding (3 pasos) → Auth (Google/Apple)
       → Crear perfil → Permiso cámara/fotos → Permiso localización
       → HOME (nivel + resumen del día + accesos)
            ├─ Hábitos / Tareas / Diario (productividad)
            ├─ Niveles (progreso/gamificación)
            ├─ Comunidad → Detalle (foro/chat/miembros)
            ├─ Mapa global
            └─ Perfil → Ajustes (sesión, permisos, eliminar cuenta)
```

---

## Funcionalidades MVP

- Auth real Google + Apple, sesión segura, logout, eliminación de cuenta.
- Perfil público (username, avatar, enlaces, ciudad/ubicación).
- Hábitos (CRUD + marcado semanal + racha).
- Tareas del día (CRUD).
- Diario (entrada por día + histórico).
- Niveles: cálculo de nivel a partir de actividad + visual de cristal.
- Permisos de dispositivo reales (cámara, fotos, localización) con todos los estados.
- Mapa global con perfiles geolocalizados (con protección de privacidad — ver legal).
- Pantalla de consentimiento (qué datos son públicos).

## Funcionalidades posteriores (post-MVP)

- Comunidades completas (foro + chat en tiempo real + archivos + moderación).
- Búsqueda avanzada de perfiles.
- Notificaciones push.
- Estadísticas avanzadas / insights.
- Roles de moderador con panel.

## Exclusiones (fuera de alcance por ahora)

- Mensajería privada 1:1.
- Monetización / pagos / suscripciones.
- Versión web pública indexable de perfiles (se evalúa por riesgo de scraping).
- IA generativa dentro de la app.

---

## Requisitos de negocio fijos (no negociables)

- **No se venden datos.**
- El propietario tiene **acceso administrativo** a datos internos.
- Los datos del **perfil son públicos**.
- La **localización del usuario es pública** — pero con protecciones contra abuso (ofuscación/precisión reducida, ver Fase 6/7).
- Debe existir **consentimiento e información clara** sobre qué es público.
