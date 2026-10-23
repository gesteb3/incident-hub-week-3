# IT Incident Hub

Sistema web trazable para registrar, operar y dar seguimiento a incidentes de TI.

## Estado

Versión `v1.0.0` publicada. Commit etiquetado: `96bacd7`.
Validación de entrega: Azure Pipelines `20261023.5`, con aprobación del ambiente
`incident-hub-release`. La aplicación se demuestra localmente.

## Requisitos y responsables

- Node.js 22 y npm; Docker con Docker Compose para PostgreSQL 16.
- Gustavo Adolfo Esteban Batres: implementación y operación del proyecto.
- Jorge Daniel Achij López: colaboración en revisión de cambios y aprobación de entrega.

## Arquitectura

- `backend/`: API REST con Node.js, Express y TypeScript.
- `frontend/`: aplicación web con React y TypeScript.
- `database/`: migraciones y datos iniciales de PostgreSQL.
- `backend/tests/`: pruebas automatizadas de la API con dependencias simuladas.
- `frontend/tests/`: pruebas de componentes y flujos de interfaz.
- `tests/`: pruebas de integridad del artefacto; no incluye pruebas extremo a extremo de la aplicación.
- `devops/`: recursos de automatización y despliegue.
- `docs/`: documentación técnica y evidencias verificables.

## Base de datos local

1. Copia `.env.example` como `.env` y cambia sus valores locales.
2. Inicia PostgreSQL:

```bash
docker compose up -d database
```

La migración y los datos iniciales se aplican automáticamente al crear el volumen por primera vez.

Si otro proyecto utiliza el puerto 5432, configura `POSTGRES_PORT=5435` en `.env`
y usa ese mismo puerto en `DATABASE_URL`. Después ejecuta `docker compose up -d database`.

## Interfaz web local

Primero, desde la raíz del repositorio, prepara y ejecuta la API:

```powershell
cd backend
npm ci
npm run prisma:generate
npm run prisma:validate
npm run dev
```

La API lee el archivo `.env` de la raíz. Configura `DATABASE_URL` con el mismo
usuario, contraseña y puerto definidos para PostgreSQL. Comprueba
`http://localhost:3000/health`. Para validar el backend ejecuta `npm test` y
`npm run build` desde `backend/`.

Con la API disponible en `http://localhost:3000`, inicia la interfaz en otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Abre `http://localhost:5173`. Puedes registrar incidentes, asignar responsables,
iniciar su atención, resolverlos y cerrarlos con un motivo. El detalle incluye
comentarios paginados e historial de cambios. Los indicadores están en
`http://localhost:5173/?view=dashboard`.

El selector **Trabajar como** usa los usuarios activos de la base de datos para
la demostración local. La autenticación está registrada como deuda pendiente.

Desde `frontend/`, ejecuta `npm test` para las pruebas de componentes y
`npm run build` para validar la compilación de producción.

- [Uso y validación de la operación web](docs/qa-operacion-frontend.md)

## Trazabilidad

El trabajo se realiza en ramas `feature/*`, `fix/*` o `refactor/*`. Los commits y Pull Requests deben incluir el identificador de Azure Boards con la sintaxis `AB#ID`.

## Calidad y seguridad

- [Análisis de dependencias](docs/dependencies.md)
- [Controles de seguridad](docs/security.md)
- [Registro de deuda técnica](docs/technical-debt.md)
- [Validación con GitHub Actions](docs/github-actions.md)
- [Plan de release `v1.0.0`](docs/release-v1.0.0.md)
- [Estrategia de ramas](docs/branching.md)
- [Estado de la entrega](docs/cierre-entrega.md)
- [Historial de versiones](docs/versiones.md)
