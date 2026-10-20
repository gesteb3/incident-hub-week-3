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

## Reversión

Si la validación posterior detecta un problema, se conserva el artefacto anterior,
se detiene la promoción y se revierte al tag estable previo. La corrección se
realiza en una rama `fix/*` y vuelve a pasar por PR y pipeline antes de publicar.
