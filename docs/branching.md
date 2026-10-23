# Estrategia de ramas y trazabilidad

`main` contiene cambios integrados mediante revisión. El trabajo normal usa
`feature/*` para funcionalidades, `fix/*` para correcciones y `refactor/*`
para mejoras internas. Se utilizaron ramas `release/*` para preparar la entrega.

Cada cambio relevante referencia su Work Item mediante `AB#ID` en el commit y
PR, y se vincula explícitamente en Azure Repos. Ejemplo real:
`feature/AB#30-aprobacion-release`, commit `eeb37e1`, PR 21 y commit de
integración `96bacd7`.

El autor abre el PR con alcance y validaciones. El colaborador revisa los
archivos, registra observaciones cuando corresponda y aprueba tras verificarlos.
Los comentarios deben resolverse antes del merge. Azure usa squash según la
política configurada. La protección y el requisito de revisión deben comprobarse
en cada repositorio: copiar Git no copia sus políticas.

Repositorios Azure: `incident-hub-week-1`, `incident-hub-week-2` e
`incident-hub-week-3`. Preservan las entregas incrementales. GitHub aloja la
validación complementaria y la publicación final. Sus PR y aprobaciones son
independientes de Azure; una sincronización de código no copia esos registros.

El tag anotado `v1.0.0` conserva el commit aceptado por el pipeline final. Las
correcciones posteriores requieren otro PR y, si cambian la distribución, una
nueva versión; no se mueve el tag existente.
