import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Validates the downloaded build artifact, without rebuilding it.
const root = resolve(process.argv[2] ?? '.');
const required = [
  'backend/dist/server.js',
  'backend/package.json',
  'backend/package-lock.json',
  'backend/prisma/schema.prisma',
  'frontend/dist/index.html',
  'database/migrations/001_initial_schema.sql',
  'devops/artifact-manifest.txt',
];

try {
  for (const file of required) {
    const path = resolve(root, file);
    if (!statSync(path).isFile() || statSync(path).size === 0) {
      throw new Error(`Archivo requerido vacío o inválido: ${file}`);
    }
    const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
    console.log(`${digest}  ${file}`);
  }
  const pkg = JSON.parse(readFileSync(resolve(root, 'backend/package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(resolve(root, 'backend/package-lock.json'), 'utf8'));
  if (pkg.version !== '1.0.0' || lock.version !== pkg.version || lock.packages[''].version !== pkg.version) {
    throw new Error('El paquete y su lockfile deben declarar la versión 1.0.0');
  }
  console.log(`Paquete ${pkg.version} verificado después de la aprobación del ambiente.`);
} catch (error) {
  console.error(`Validación de release fallida: ${error.message}`);
  process.exitCode = 1;
}
