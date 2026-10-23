# Registro de deuda tecnica

Fecha de identificacion: 20 de octubre de 2026.

| ID | Deuda comprobada | Riesgo | Prioridad | Estado | Tratamiento previsto |
| --- | --- | --- | --- | --- | --- |
| DT-01 | El frontend no tenía pruebas automatizadas. | Una regresión de integración puede llegar a `main`. | Alta | Resuelta | AB#29 y AB#20, PR 17, commit `55f11cd`: nueve pruebas de registro, asignación, motivos, permisos de presentación, errores, enlaces directos y paginación de comentarios; ejecución con `npm test` añadida a Azure Pipelines y GitHub Actions. |
| DT-02 | La API comprueba usuarios activos y roles operativos, pero recibe la identidad declarada en el cuerpo sin autenticarla. | Un despliegue público permitiría suplantar al actor de una operación. | Alta | Pendiente | Incorporar autenticación y obtener la identidad desde una sesión verificada. El selector de usuario actual corresponde a la demostración local. |
| DT-03 | El frontend solicitaba hasta 100 incidentes y no permitía recorrer páginas. | Los incidentes posteriores al límite no eran accesibles desde la interfaz. | Media | Resuelta | AB#24, PR 14, commit de integración `7502e74`: navegación Anterior/Siguiente, tamaño de página y total filtrado usando la paginación de la API. |
| DT-04 | No se publican metricas de cobertura de pruebas. | No existe una medida objetiva de codigo ejercitado por las pruebas. | Media | Pendiente | Generar cobertura y publicarla como resultado del pipeline. |
| DT-05 | Los registros de la API no tienen formato estructurado ni correlacion. | El diagnostico de incidentes en produccion sera lento. | Media | Pendiente | Agregar logging JSON e identificador por solicitud. |

DT-01 y DT-03 están resueltas mediante cambios revisados e integrados. Las otras
tres deudas permanecen abiertas con su riesgo y tratamiento documentados.
