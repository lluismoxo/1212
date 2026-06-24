# Documentos legales — 1212

> ⚠️ **Borradores técnicos, no asesoramiento legal.** Revisión profesional obligatoria antes de producción.

| Documento | Contenido |
|-----------|-----------|
| [privacy-policy.md](privacy-policy.md) | Política de Privacidad (qué datos, públicos, no venta, derechos RGPD) |
| [terms-of-service.md](terms-of-service.md) | Términos de Servicio (uso aceptable, anti-acoso, moderación) |
| [retencion.md](retencion.md) | Política de retención de datos |
| [eliminacion-cuenta.md](eliminacion-cuenta.md) | Política de eliminación de cuenta |
| [RIESGOS-LEGALES.md](RIESGOS-LEGALES.md) | **Riesgos regulatorios detectados + acciones recomendadas** |

Refleja los requisitos de negocio: no se venden datos · perfiles públicos · ubicación pública (con control del usuario) · acceso administrativo interno (diario excluido).

La **pantalla de consentimiento** está en `mobile/app/consent.tsx` (informa qué es público antes de pedir permisos).

## Acciones críticas antes de producción (de RIESGOS-LEGALES)
1. Default de ubicación → `city` o consentimiento explícito para `exact`.
2. Mover DB a región UE (está en `us-east-1`).
3. Registrar consentimientos de forma auditable.
4. Gate de edad.
5. Completar `[pendiente]` con abogado.
