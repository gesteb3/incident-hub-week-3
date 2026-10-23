import { createHmac, timingSafeEqual } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const receiptName = 'artifact-integrity.json';

function inventory(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true })
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .flatMap(entry => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (name === receiptName) return [];
      if (entry.isSymbolicLink()) throw new Error('No se admiten enlaces simbólicos en el paquete');
      if (entry.isDirectory()) return inventory(root, name);
      if (!entry.isFile()) throw new Error('Tipo de archivo no admitido');
      return [name];
    });
}

function signature(root, key) {
  if (!key || !/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key, 'base64').length !== 32) {
    throw new Error('ARTIFACT_SIGNING_KEY debe contener una clave Base64 de 32 bytes');
  }
  const files = inventory(root);
  if (!files.length) throw new Error('El paquete está vacío');
  const mac = createHmac('sha256', Buffer.from(key, 'base64'));
  for (const file of files) {
    const bytes = readFileSync(join(root, file));
    mac.update(JSON.stringify([file, bytes.length]) + '\n');
    mac.update(bytes);
  }
  return mac.digest();
}

export function signArtifact(root, key) {
  const digest = signature(root, key).toString('hex');
  writeFileSync(join(root, receiptName), JSON.stringify({ algorithm: 'HMAC-SHA256', digest }) + '\n');
}

export function verifyArtifact(root, key) {
  const actual = signature(root, key);
  const receipt = JSON.parse(readFileSync(join(root, receiptName), 'utf8'));
  if (receipt.algorithm !== 'HMAC-SHA256' || !/^[a-f0-9]{64}$/.test(receipt.digest ?? '')) {
    throw new Error('Firma de integridad inválida');
  }
  if (!timingSafeEqual(actual, Buffer.from(receipt.digest, 'hex'))) {
    throw new Error('El contenido del artefacto no coincide con su firma');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [mode, folder] = process.argv.slice(2);
    if (!folder || !['sign', 'verify'].includes(mode)) throw new Error('Uso: artifact-integrity.mjs sign|verify carpeta');
    (mode === 'sign' ? signArtifact : verifyArtifact)(resolve(folder), process.env.ARTIFACT_SIGNING_KEY);
    console.log(mode === 'sign' ? 'Firma del artefacto generada.' : 'Integridad del artefacto verificada.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
