# IT Incident Hub

Sistema web trazable para registrar, operar y dar seguimiento a incidentes de TI.

## Estado

Entrega final - versión candidata `v1.0.0`.

## Arquitectura

- `backend/`: API REST con Node.js, Express y TypeScript.
- `frontend/`: aplicación web con React y TypeScript.
- `database/`: migraciones y datos iniciales de PostgreSQL.
- `tests/`: pruebas de integración y extremo a extremo.
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

Con la API disponible en `http://localhost:3000`, inicia la interfaz en otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
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
