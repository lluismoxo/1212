# FASE 1 — Auditoría del repositorio

> App **1212** — "Evoluciona". Documento de auditoría sin cambios de código.
> Fecha: 2026-06-24

---

## 1. Resumen del estado actual

### Qué es el repositorio hoy

El repositorio (`github.com/lluismoxo/1212`) contiene **un prototipo de diseño exportado desde Claude Design**, no una aplicación funcional. Toda la "lógica" vive dentro de un único bloque `<script type="text/x-dc">` embebido en `index.html`, interpretado en tiempo de ejecución por `support.js` (el runtime de Claude Design, marcado como *GENERATED — do not edit*).

```
app/
├── index.html        # Prototipo completo (1364 líneas). Una sola pantalla "teléfono".
├── 1212.dc.html      # DUPLICADO byte-a-byte de index.html (basura).
├── support.js        # Runtime dc generado (React + parser de plantilla). No editar.
├── image-slot.js     # Web component <image-slot> (placeholder de imagen drag&drop).
├── crystals/         # 9 PNG de cristales por nivel.
├── crystalsT/        # 9 PNG (variante, usados realmente por LEVELS[].img).
├── screenshots/      # Capturas de la maqueta.
├── uploads/          # Imágenes sueltas de trabajo (ChatGPT/NanoBanana). NO deberían estar versionadas.
└── .gitignore        # Solo ignora .DS_Store.
```

### Qué existe (funciona como maqueta)

- Flujo de pantallas completo y navegable: splash → onboarding → auth → crear perfil → permisos (cámara, localización) → home → niveles → hábitos → tareas → diario → comunidad → mapa (globo 3D con `globe.gl`) → perfil.
- Sistema visual de 9 niveles (cristales SVG generados + PNG).
- Estado local en memoria (`this.state`): hábitos, tareas, comunidades, usuarios, diario — **todo hardcoded**.

### Qué falta (todo lo que hace falta para ser un producto)

- **Backend: no existe.** Cero API, cero servidor.
- **Base de datos: no existe.** Datos en arrays JS dentro del HTML.
- **Autenticación: falsa.** Los botones "Continuar con Google/Apple" llaman a `goProfile` — solo cambian de pantalla. No hay OAuth, ni sesión, ni token.
- **Permisos de dispositivo: falsos.** "Permitir acceso" no invoca ninguna API de permisos; solo navega.
- **Persistencia: ninguna.** Recargar = se pierde todo.
- **No hay** roles, autorización, rate limiting, logs, validación, tests, CI, ni documentación.

### Qué parece generado automáticamente

- `support.js` — runtime generado, no tocar.
- `index.html` — export literal de Claude Design (`<x-dc>`, `<sc-if>`, `{{ binding }}`).
- `image-slot.js` — scaffold "omelette starter" (marcado `@ds-adherence-ignore`).

### Riesgos técnicos detectados

| # | Riesgo | Gravedad |
|---|--------|----------|
| R1 | El "código" es un prototipo de diseño, no una base de app. Construir el producto real **no es modificar este HTML**, es crear una app nueva (frontend + backend) que reproduzca este diseño. | Alta |
| R2 | `uploads/` versiona imágenes de trabajo personales (posible info sensible). | Media |
| R3 | `1212.dc.html` duplica `index.html` → divergencia futura, confusión. | Baja |
| R4 | `.gitignore` mínimo: riesgo de subir secretos/artefactos cuando empiece el backend. | Media (futura) |
| R5 | Auth y permisos simulados pueden dar **falsa sensación de seguridad**: parece que "ya está", pero no protege nada. | Alta |
| R6 | Dependencia de CDN externo sin pin de integridad (`unpkg globe.gl`, `fontshare`). | Baja |

---

## 2. Decisión de fondo (requiere tu confirmación)

Este repo es un **diseño de alta fidelidad**, no un MVP a "mejorar". Hay dos caminos:

**A) Tratar el prototipo como spec de UI** y construir una app real nueva (recomendado).
Ventajas: arquitectura limpia, escalable, segura desde cero. El diseño se reusa como referencia visual.
Inconveniente: más trabajo inicial.

**B) "Hidratar" el prototipo** conectándolo a un backend.
Ventajas: aprovecha el HTML existente.
Inconvenientes graves: `support.js` no es editable, el modelo `<x-dc>` no está pensado para producción, no hay routing real, ni build, ni testing. Deuda técnica garantizada.

→ **Recomendación: Camino A.** El diseño es excelente y se conserva; lo que cambia es que deja de ser un HTML-prototipo y pasa a ser una app con frontend/backend/infra separados (ver `03-arquitectura.md`).

---

## 3. Próximos pasos (orden propuesto)

1. **Confirmar Camino A vs B** (decisión tuya — bloqueante).
2. Limpieza no destructiva: sacar `uploads/` y `1212.dc.html` del control de versiones (sin borrar del disco). PR pequeño.
3. Aprobar PRD (`02-prd.md`) y arquitectura (`03-arquitectura.md`).
4. Pasar a Fase 2 (modelo de datos) solo tras aprobar 1–3.

Nada de lo anterior toca el prototipo todavía. Esta fase es **solo documentación**.
