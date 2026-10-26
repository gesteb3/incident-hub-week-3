# Analisis de dependencias

Fecha de revisión de cierre: 22 de octubre de 2026.

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

## Criterio de tratamiento

- Critica o alta: bloquear la entrega, crear un Work Item y corregir o justificar
  la excepcion antes de publicar.
- Moderada: evaluar impacto y programar la actualizacion en el sprint vigente.
- Baja: registrar y agrupar con el mantenimiento de dependencias.

El resultado actual permite continuar la entrega. Un resultado sin hallazgos no
elimina el riesgo futuro; los avisos pueden cambiar cuando se publica nueva
informacion sobre los paquetes instalados.
