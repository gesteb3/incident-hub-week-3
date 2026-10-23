# Plan de release v1.0.0

## Alcance

La versión `v1.0.0` consolida el flujo completo de IT Incident Hub:

- registro y consulta de incidentes;
- asignación de técnicos y transiciones de estado;
- comentarios e historial trazable;
- filtros operativos;
- indicadores y dashboard;
- validaciones automatizadas de backend y frontend.

## Controles previos

La publicación se habilita únicamente cuando se cumplen estas condiciones:

1. El Pull Request de release tiene revisión aprobada y todos los comentarios resueltos.
2. Azure Pipelines completa instalación, pruebas, compilación, análisis de dependencias y publicación del artefacto.
3. GitHub Actions valida el Pull Request y no reporta vulnerabilidades de severidad alta.
4. La aplicación se valida en escritorio y móvil con los escenarios documentados en `docs/qa-operacion-frontend.md` y `docs/qa-dashboard.md`.
5. No existen secretos en el repositorio; los valores de entorno se mantienen fuera de Git.

## Secuencia de publicación

1. Abrir el PR `release/AB#30-v1.0.0` hacia `main`.
2. Obtener la aprobación de un segundo usuario y completar los checks automáticos.
3. Hacer merge con historial lineal/squash según la política del repositorio.
4. Crear el tag anotado `v1.0.0` sobre el commit mergeado.
5. Asociar el tag al artefacto generado por Azure Pipelines y registrar la evidencia de la ejecución.

## Ambientes y aprobación

El entorno local de desarrollo ejecuta la aplicación y PostgreSQL. El ambiente
Azure `incident-hub-release` registra la aceptación del paquete de entrega.
Este último no es un servidor de producción ni publica una URL de la aplicación.

En `main`, el pipeline ejecuta Validar, Empaquetar y Aprobar entrega. Antes del
deployment job, Azure exige la aprobación configurada en el ambiente por Daniel.
Las ramas de trabajo no ejecutan esta fase. El check de aprobación se administra
en Azure y no puede sustituirse por modificar este YAML.

Tras aprobar, el job descarga el artefacto de la misma ejecución, comprueba
archivos obligatorios, versión y lockfile y registra hashes SHA-256 en el log.
No reconstruye el paquete. El historial del ambiente vincula ejecución, commit y
aprobación. Si se rechaza o falla la verificación, no se considera aceptada la entrega.

Para la evidencia, conservar: ejecución esperando aprobación, aprobación real,
tres fases exitosas, log de verificación y registro del ambiente. El tag final
debe apuntar al commit validado y referenciar esa ejecución.

## Control posterior de integridad

La mejora vinculada a AB#29 añade firma HMAC del paquete en `main`, utilizando
una variable secreta de Library, y comprobación después de la aprobación.
Su evidencia corresponde a una nueva ejecución, no a `20261023.5`. El tag
`v1.0.0` permanece sobre el commit originalmente validado. Consultar
`security.md` para configuración, alcance y permisos del secreto.

## Reversión operativa

Si la validación posterior detecta un problema, se conserva el artefacto anterior,
se detiene la promoción y se revierte al tag estable previo. La corrección se
realiza en una rama `fix/*` y vuelve a pasar por PR y pipeline antes de publicar.
