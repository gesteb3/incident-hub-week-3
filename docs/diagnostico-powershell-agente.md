# Conflicto de módulos de PowerShell en el agente

## Síntoma

En la ejecución de Azure build 20, `Instalar dependencias del backend` falla
antes de ejecutar `npm ci`. El SDK de la tarea Command Line no puede cargar
`Microsoft.PowerShell.Security`; aparecen miembros duplicados de
`System.Security.AccessControl.ObjectSecurity` y un error de `ConvertTo-SecureString`.

## Diagnóstico

El log del agente confirma que Command Line 2.280.0 inicia Windows PowerShell
mediante `PowerShell3Handler`. El módulo de seguridad se carga correctamente
en una comprobación aislada local. El error coincide con el caso documentado
por Microsoft al heredar rutas de módulos de PowerShell Core en Windows PowerShell.
No es un fallo de npm ni de las pruebas de la aplicación.

## Corrección y comprobación

Se añade al YAML la variable no secreta
`AZP_AGENT_CLEANUP_PSMODULES_IN_POWERSHELL: 'true'`, que indica al agente limpiar
`PSModulePath` antes de ejecutar las tareas. No se cambian credenciales ni reglas
de validación del pipeline.

La comprobación definitiva requiere ejecutar el commit corregido en Azure y
confirmar que pasa la instalación y las fases posteriores. Reintentar una ejecución
anterior al cambio no incorpora el YAML nuevo. Conservar el fallo y la nueva ejecución.

Referencia: https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/windows-agent?view=azure-devops#run-interactively
