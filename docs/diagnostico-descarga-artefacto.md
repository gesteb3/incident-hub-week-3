# Verificación del paquete descargado

La ejecución 22 falló al verificar la firma después de descargar el artefacto.
En el agente autohospedado, `approved-package` conservaba archivos de otras
ejecuciones. En `frontend/dist/assets` coexistían `index-01SL1CqG.js`, del
22 de octubre, e `index-D-XLGJZl.js`, de la descarga actual. El HTML actual
referenciaba el segundo archivo. La descarga superponía archivos sin eliminar
los que ya no formaban parte del paquete.

Se configura `cleanDestinationFolder: true` en `DownloadBuildArtifacts@1` y
se separa el destino por `Build.BuildId`. La verificación de firma y la de
contenido utilizan el mismo destino. No se modifica la clave ni se vuelve
a firmar el contenido descargado.

Una prueba reproduce la superposición de dos entregas: la verificación rechaza
la carpeta con un archivo anterior y acepta la copia limpia del paquete firmado.
La validación final en Azure requiere una ejecución nueva con este YAML,
aprobación del ambiente y las tres etapas exitosas.
