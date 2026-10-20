# Catálogo de técnicos para la demostración

El catálogo de usuarios inicial contiene dos perfiles solicitantes/operativos,
un administrador y tres técnicos disponibles para repartir la atención:

| Nombre | Correo técnico local | Rol |
| --- | --- | --- |
| Técnico de Soporte | tecnico@incident-hub.local | TECHNICIAN |
| Ana López | ana.lopez@incident-hub.local | TECHNICIAN |
| Carlos Méndez | carlos.mendez@incident-hub.local | TECHNICIAN |

Estas identidades son datos locales de demostración. No son cuentas de correo,
no tienen contraseña y no representan usuarios reales. La API expone solamente
identificador, nombre y rol en `/api/catalogs`; el correo nunca se envía al
frontend. El inicio de sesión y la identidad autenticada continúan registrados
como deuda técnica DT-02.

La carga es idempotente: `database/seeds/002_users.sql` funciona en una base
nueva y `database/migrations/002_demo_technicians.sql` incorpora los dos
técnicos cuando la migración inicial ya estaba aplicada.
