# Política de Privacidad — 1212

**Última actualización:** 24 de junio de 2026

> ⚠️ **Borrador técnico, no asesoramiento legal.** Antes de publicar en producción debe revisarlo un profesional legal (especialmente por el carácter público de perfil y ubicación). Ver `legal/RIESGOS-LEGALES.md`.

## 1. Quién es el responsable

1212 ("la App", "nosotros"). Responsable del tratamiento: el propietario de 1212. Contacto: _[pendiente: email de contacto / DPO si aplica]_.

## 2. Qué datos tratamos

| Dato | Origen | Finalidad |
|------|--------|-----------|
| Identidad de acceso (email, id del proveedor) | Google / Apple al iniciar sesión | Autenticación |
| Perfil (nombre de usuario, nombre, foto, bio, ciudad, enlaces) | Tú | Mostrar tu perfil **público** |
| Ubicación geográfica | Tu dispositivo (con tu permiso) | Mostrarte en el **mapa público** y descubrir personas cerca |
| Hábitos, tareas | Tú | Funcionalidad de la App |
| Diario | Tú | Funcionalidad **privada** (solo tú accedes) |
| Actividad en comunidades (mensajes, archivos) | Tú | Funcionalidad social |
| Eventos de uso (analítica propia) | Uso de la App | Mejorar el producto |
| Datos técnicos (IP, user-agent, logs de seguridad) | Automático | Seguridad y prevención de abuso |

## 3. Datos PÚBLICOS (importante)

Por diseño del producto, son **públicos y visibles para otros usuarios**:

- Tu **perfil**: nombre de usuario, nombre, foto, bio, ciudad y enlaces.
- Tu **ubicación** en el mapa global.

**Tú controlas la exposición de tu ubicación** desde Ajustes:
- **Exacta:** tu posición precisa es visible.
- **Solo ciudad:** se muestra tu ciudad, no tu posición exacta.
- **Desactivada:** no apareces en el mapa.

Tu **diario es privado**: nadie más (ni el equipo de 1212 en su acceso administrativo ordinario) lo lee.

## 4. NO vendemos tus datos

1212 **no vende ni cede tus datos personales a terceros con fines comerciales.**

## 5. Acceso administrativo

El propietario de 1212 tiene acceso administrativo a datos internos para operar la App, dar soporte, moderar y cumplir la ley. **El diario personal queda excluido** de ese acceso. Las acciones administrativas sensibles quedan registradas en un log de auditoría.

## 6. Base legal (RGPD)

- **Ejecución del contrato** (prestarte el servicio): perfil, hábitos, tareas, diario, comunidades.
- **Consentimiento**: ubicación y permisos del dispositivo (cámara, fotos). Revocable en cualquier momento.
- **Interés legítimo**: seguridad, prevención de fraude y abuso, analítica de producto agregada.

## 7. Conservación

Ver `legal/retencion.md`. En resumen: mientras tu cuenta esté activa; tras eliminarla, se borra o anonimiza según se describe ahí.

## 8. Tus derechos (RGPD)

Acceso, rectificación, supresión, oposición, limitación y portabilidad. Puedes **eliminar tu cuenta** desde la App (Ajustes → Eliminar cuenta). Para otros derechos: _[email de contacto]_.

## 9. Encargados / proveedores

- **Neon** (base de datos, UE/EE. UU. según región — actual: EE. UU.).
- **Google / Apple** (autenticación).
- **Cloudflare R2** (almacenamiento de imágenes), cuando se active.

_[Pendiente: revisar transferencias internacionales — la DB está en `us-east-1`. Ver RIESGOS-LEGALES.]_

## 10. Menores

1212 no está dirigida a menores de _[edad por definir, p. ej. 16 en UE]_. No recopilamos conscientemente sus datos.

## 11. Seguridad

Autenticación segura, cifrado en tránsito, control de acceso por roles, rate limiting, logs de auditoría. Ver `docs/09-seguridad.md`.

## 12. Cambios

Publicaremos cualquier cambio aquí y, si es sustancial, te avisaremos en la App.
