# Política de Retención de Datos — 1212

**Última actualización:** 24 de junio de 2026

> ⚠️ Borrador técnico, no asesoramiento legal.

| Dato | Retención | Al eliminar la cuenta |
|------|-----------|------------------------|
| Cuenta de acceso (`auth_users`, identidades) | Mientras la cuenta esté activa | **Borrado** |
| Perfil, enlaces, ubicación | Mientras la cuenta esté activa | **Borrado** (cascade) |
| Hábitos, tareas, diario | Mientras la cuenta esté activa | **Borrado** (cascade) |
| Mensajes en comunidades | Permanecen en el hilo | **Anonimizados** (autor → null), no borrados, para no romper conversaciones |
| Sesiones / refresh tokens | Hasta caducar o revocarse | **Borrado** |
| Eventos de analítica | _[definir, p. ej. 14 meses]_ | Se desvinculan del usuario (autor → null) |
| Logs de auditoría / seguridad | _[definir, p. ej. 12 meses]_ por seguridad y obligaciones legales | Se conservan anonimizados |
| Copias de seguridad | Según el proveedor (Neon) | Se sobrescriben en el ciclo de backups |

## Notas
- El borrado en cascada está garantizado por las claves foráneas (`on delete cascade`); la anonimización de mensajes por `on delete set null`.
- _[Pendiente: fijar los plazos concretos de analítica y auditoría con criterio legal.]_
- Las imágenes en almacenamiento (R2) deben borrarse en el mismo flujo de eliminación de cuenta (pendiente de implementar al activar R2).
