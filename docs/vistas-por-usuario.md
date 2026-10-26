# Vistas por usuario

El selector de actor determina la bandeja y los indicadores que presenta la
interfaz. Se conserva la selección en el navegador sin almacenar credenciales.

| Perfil | Bandeja e indicadores | Operación desde la interfaz |
| --- | --- | --- |
| Administrador | Todos los incidentes | Registrar para un solicitante, asignar y operar estados. |
| Técnico | Incidentes asignados a su identificador | Atender, resolver, cerrar y comentar sus asignados. |
| Solicitante | Incidentes reportados por su identificador | Registrar a su nombre, consultar y comentar. |

Cambiar de persona limpia el detalle, formularios, filtros y página anteriores;
vuelve a consultar la API con el alcance de la nueva persona. El filtro de técnico
queda fijado al propio técnico. Limpiar filtros no elimina el alcance del perfil.
El administrador conserva la navegación directa a detalles fuera de la página;
los otros perfiles abren un resultado de su propia bandeja.

La API admite `reporterId` y `technicianId` en la consulta de incidentes y métricas.
Los filtros se aplican a la consulta y al conteo en PostgreSQL antes de paginar,
y a todos los grupos de métricas. Un técnico sin asignaciones ve cero resultados.
Si todos los incidentes pertenecen al mismo solicitante, su total puede coincidir
con el del administrador sin que el filtro esté fallando.

## Validación

- Pruebas de filtros por solicitante y validación de identificadores.
- Pruebas de alcance por solicitante/técnico en todos los agregados de métricas.
- Pruebas de cambio de persona, descarte del detalle anterior, persistencia del
  perfil y conservación del alcance al limpiar filtros.
- Comprobación local de igualdad entre total de bandeja e indicadores por usuario.

## Alcance de seguridad y entrega

Es una simulación de vistas. Los filtros y los controles de interfaz no autentican
identidades ni impiden acceso directo a los endpoints. DT-02 continúa abierta:
antes de uso público se requiere sesión verificada y autorización en cada operación.

Esta funcionalidad se prepara en `feature/AB#20-vistas-por-usuario` y no modifica
el tag publicado `v1.0.0`. Requiere revisión e integración para formar parte de
una entrega posterior.
