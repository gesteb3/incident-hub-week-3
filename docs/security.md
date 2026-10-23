# Controles de seguridad

## Secretos y configuracion

- Los archivos `.env` y `.env.test` estan excluidos mediante `.gitignore`.
- `.env.example` contiene solamente valores de ejemplo y sirve como contrato de
  configuracion local.
- La aplicacion obtiene la conexion de PostgreSQL y el origen permitido de CORS
  desde variables de entorno.
- El repositorio no contiene archivos de claves privadas ni patrones conocidos
  de tokens revisados durante esta entrega.
- Los pipelines no imprimen ni almacenan credenciales en sus archivos YAML.

En ambientes compartidos, los valores reales deben configurarse como variables
secretas de Azure Pipelines o mediante un grupo de variables conectado a Azure
Key Vault. En GitHub deben almacenarse como Actions secrets.

## Controles automatizados

### Integridad del paquete de entrega

El grupo Azure Library `incident-hub-secrets` contiene `ARTIFACT_SIGNING_KEY`
como variable secreta. Su valor es una clave aleatoria de 32 bytes codificada
en Base64, generada fuera del repositorio. Autorizar únicamente el pipeline
`incident-hub-week-3` en los permisos del grupo.

En `main`, el empaquetado calcula HMAC-SHA256 sobre nombres, tamaños y contenido
de todos los archivos. Solo publica la firma en `artifact-integrity.json`, nunca
la clave. Después de la aprobación del ambiente, el job descarga el paquete de
la misma ejecución y verifica la firma desde el código del checkout antes de
validar la versión. Un archivo modificado, añadido o eliminado invalida la firma.
Las ramas de trabajo ejecutan pruebas con claves efímeras y no firman la entrega.

La clave se entrega al proceso mediante `env`, sin incorporarla a comandos o
archivos publicados. Los editores del pipeline y administradores del grupo son
usuarios de confianza y deben tener acceso restringido. HMAC verifica integridad
con una clave compartida; no es una firma pública de un editor externo.

Conservar como evidencia la variable enmascarada, autorización del pipeline y
logs de firma/verificación exitosos. La integración y autorización deben
comprobarse con una ejecución real. Este control se incorpora después del tag
`v1.0.0`; no modifica el contenido de esa versión ya publicada.

- Instalacion reproducible mediante `npm ci` y archivos lock versionados.
- Compilacion de TypeScript para detectar incompatibilidades.
- Validacion del esquema y generacion del cliente Prisma.
- Pruebas automatizadas del backend.
- `npm audit --audit-level=high` para backend y frontend.
- Permiso `contents: read` para el token del workflow de GitHub Actions.

## Riesgos pendientes

La version actual no implementa autenticacion ni autorizacion por rol. Durante
la demostracion se utilizan usuarios de datos iniciales. Esta limitacion se
registra como deuda tecnica y debe resolverse antes de exponer la aplicacion en
Internet.
