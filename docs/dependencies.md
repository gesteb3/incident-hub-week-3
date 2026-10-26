# Analisis de dependencias

Fecha de última revisión: 25 de octubre de 2026.

## Alcance y metodo

Se revisaron los archivos `package-lock.json` del backend y del frontend con
`npm audit`. El pipeline repite esta verificacion y falla cuando encuentra una
vulnerabilidad de severidad alta o critica.

| Componente | Dependencias analizadas | Criticas | Altas | Moderadas | Bajas | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Backend | 219 | 0 | 0 | 0 | 0 | Mantener versiones fijadas y continuar la revision en cada pipeline. |
| Frontend | 139 | 0 | 0 | 0 | 0 | Mantener versiones fijadas y continuar la revision en cada pipeline. |

El conteo corresponde a `metadata.dependencies.total` de `npm audit --json`,
incluyendo dependencias de desarrollo. La revisión inicial del 20 de octubre
registró 68 dependencias del frontend; este cierre actualiza el inventario tras
incorporar las herramientas de pruebas. No se reportan vulnerabilidades conocidas
en esta consulta. Las categorías del inventario pueden solaparse: se utiliza el
total informado por npm, no la suma de categorías.

## Hallazgos y corrección del 25 de octubre

Una ejecución posterior del pipeline detectó dos vulnerabilidades altas que no
figuraban en el resultado anterior. Se mantuvo el bloqueo de la auditoría y se
preparó la corrección trazable mediante AB#29.

| Paquete | Hallazgo | Decisión |
| --- | --- | --- |
| body-parser | GHSA-27r3-jxmh-p828: denegación de servicio al procesar cuerpos comprimidos con bytes adicionales. | Fijar la dependencia transitiva de Express en 2.4.0 mediante `overrides`, sin cambiar la versión de Express. |
| zod | GHSA-mrhx-c7xc-m3w5: agotamiento de memoria en validación de colecciones sobredimensionadas. | Actualizar de 3.25.76 a 4.6.7 y adaptar el manejo de errores a la API de Zod 4. |

Se actualizaron `package.json` y el lockfile. La validación local completó las
41 pruebas del backend, la compilación TypeScript y `npm audit --audit-level=high`.
`npm audit --json` reportó cero vulnerabilidades y 219 dependencias totales del
backend después de la corrección. La confirmación en Azure corresponde a una
nueva ejecución del commit integrado, no a un reintento del commit vulnerable.

Referencias:

- https://github.com/advisories/GHSA-27r3-jxmh-p828
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

## Criterio de tratamiento

- Critica o alta: bloquear la entrega, crear un Work Item y corregir o justificar
  la excepcion antes de publicar.
- Moderada: evaluar impacto y programar la actualizacion en el sprint vigente.
- Baja: registrar y agrupar con el mantenimiento de dependencias.

El resultado actual permite continuar la entrega. Un resultado sin hallazgos no
elimina el riesgo futuro; los avisos pueden cambiar cuando se publica nueva
informacion sobre los paquetes instalados.
