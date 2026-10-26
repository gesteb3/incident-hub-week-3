# Historial de versiones

| Versión | Evidencia del historial | Alcance |
| --- | --- | --- |
| 0.1.0 | Commit `3c13da4`, `backend/package.json` y `frontend/package.json` | Versión de desarrollo de ambos paquetes. No se publicó un tag 0.1.0. |
| 1.0.0 | PR 20, commit `9e20f53`: actualización de paquetes y lockfiles | Preparación de la versión estable. |
| v1.0.0 | Tag anotado sobre `96bacd7`, PR 21; pipeline `20261023.5`, build 15 | Entrega validada con artefacto y aceptación del ambiente `incident-hub-release`. |

Se pasó de una versión de desarrollo anterior a 1.0 a una primera entrega
estable. No existen releases intermedios adicionales en el historial comprobado.
El mismo tag y commit se publicaron en los repositorios finales de Azure y GitHub.

La firma HMAC del artefacto se incorporó después mediante AB#29, PR 23 de Azure
y commit `f0ad87e`; GitHub recibió la mejora en el PR 4. Esta mejora de pipeline
se valida en su propia ejecución y no forma parte del árbol etiquetado como
`v1.0.0`. El tag publicado se conserva sin moverlo.

En futuras entregas, se incrementa PATCH para correcciones compatibles, MINOR
para funcionalidades compatibles y MAJOR para cambios incompatibles del contrato
público. Cada versión publicada debe identificar su commit y ejecución validada.
