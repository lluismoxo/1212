# Política de Eliminación de Cuenta — 1212

**Última actualización:** 24 de junio de 2026

## Cómo eliminar tu cuenta

Desde la App: **Ajustes → Eliminar cuenta**. Es inmediato e irreversible.

Técnicamente: `DELETE /auth/account` → borra tu `auth_user`. Por las claves foráneas:
- **Se borra:** perfil, enlaces, ubicación, hábitos, tareas, **diario**, membresías, sesiones.
- **Se anonimiza:** tus mensajes en comunidades (dejan de estar asociados a ti, pero permanecen en el hilo para no romper conversaciones de otros).

## Qué NO se borra inmediatamente

- **Logs de auditoría/seguridad:** se conservan (anonimizados) por seguridad y obligaciones legales, durante el plazo de retención.
- **Copias de seguridad:** se sobrescriben en el ciclo normal de backups del proveedor.
- **Imágenes en R2** (cuando esté activo): pendiente de añadir su borrado al flujo.

## Verificación

El borrado en cascada está cubierto por tests (Fase 3: "eliminar cuenta borra usuario y perfil"). 

## Pendiente
- Borrado de objetos en R2 dentro del flujo de eliminación.
- Confirmación en la UI (doble confirmación) antes de ejecutar.
