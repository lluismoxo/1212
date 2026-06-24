# Riesgos regulatorios detectados — 1212

**Fecha:** 24 de junio de 2026. Análisis técnico (no legal). Revisar con abogado antes de producción.

Contexto: propietario en España → aplica **RGPD** (UE) y **LOPDGDD**. Si hay usuarios en UE, aplica igual.

---

## 🔴 ALTO

### R-L1 — Ubicación pública (exacta por defecto)
La ubicación precisa pública es un **dato de geolocalización sensible** y un riesgo real de **acoso/stalking**. El RGPD exige minimización de datos y privacy-by-design/by-default (art. 25).
- **Resuelto (parcial):** el default pasa a **`city`** (migración 009) → privacidad por defecto. La ubicación exacta es ahora opt-in explícito desde el perfil.
- Pendiente: registrar el consentimiento de `exact` de forma auditable cuando el usuario lo active.
- Mitigaciones ya presentes: opt-out, solo-ciudad, off; aviso en la pantalla de permisos.

### R-L2 — Transferencia internacional de datos
La DB Neon está en **`us-east-1` (EE. UU.)**. Transferir datos personales de la UE a EE. UU. requiere base legal (p. ej. Data Privacy Framework / cláusulas contractuales tipo).
- **Recomendación:** mover la DB a una **región UE** (Neon ofrece `eu-*`) o documentar la base de transferencia. Mover región es lo más simple. **Acción recomendada antes de producción.**

---

## 🟠 MEDIO

### R-L3 — Perfiles públicos + scraping
Perfiles públicos (nombre, ciudad, enlaces) son indexables/scrapeables. Riesgo de uso indebido por terceros.
- Mitigaciones: rate limiting, sin web pública indexable por ahora. Mantener perfiles solo dentro de la App reduce exposición.

### R-L4 — Menores
Sin verificación de edad. RGPD fija el consentimiento digital de menores entre 13–16 (16 en España salvo cambios). Con ubicación pública, el riesgo con menores es mayor.
- **Recomendación:** edad mínima clara en el registro + términos; valorar gate de edad.

### R-L5 — Consentimiento granular
Cámara/fotos/ubicación se piden por separado (bien), pero falta registrar el consentimiento de "ubicación pública" de forma auditable (quién/cuándo aceptó).
- **Recomendación:** guardar el consentimiento (timestamp + versión de política) en la cuenta.

---

## 🟡 BAJO / FORMAL

### R-L6 — Documentos legales incompletos
Faltan: email de contacto/DPO, jurisdicción, edad mínima, plazos de retención concretos. Marcados como `[pendiente]` en cada documento.

### R-L7 — Registro de actividades de tratamiento (RAT)
RGPD art. 30: conviene mantener un registro de tratamientos. Esta documentación es una base.

---

## Resumen de acciones recomendadas antes de producción
1. **Decidir default de ubicación** (recomendado: `city`) + consentimiento explícito para `exact`. [producto + legal]
2. **Mover DB a región UE** o documentar transferencia. [técnico — fácil]
3. **Registrar consentimientos** (ubicación pública) de forma auditable. [técnico]
4. **Gate de edad** mínimo. [producto]
5. **Completar** los `[pendiente]` legales con un profesional. [legal]
