import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { signArtifact, verifyArtifact } from '../devops/artifact-integrity.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'incident-hub-integrity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'package.txt'), 'entrega');
  return { root, key: randomBytes(32).toString('base64') };
}

test('acepta el paquete firmado y permite volver a verificarlo', t => {
  const { root, key } = fixture(t);
  signArtifact(root, key);
  verifyArtifact(root, key);
  verifyArtifact(root, key);
});

for (const change of ['modificado', 'añadido', 'eliminado']) {
  test(`rechaza archivo ${change}`, t => {
    const { root, key } = fixture(t);
    signArtifact(root, key);
    if (change === 'modificado') writeFileSync(join(root, 'package.txt'), 'alterado');
    if (change === 'añadido') writeFileSync(join(root, 'extra.txt'), 'extra');
    if (change === 'eliminado') unlinkSync(join(root, 'package.txt'));
    assert.throws(() => verifyArtifact(root, key));
  });
}

test('rechaza otra clave, clave ausente y firma malformada', t => {
  const { root, key } = fixture(t);
  signArtifact(root, key);
  assert.throws(() => verifyArtifact(root, randomBytes(32).toString('base64')));
  assert.throws(() => verifyArtifact(root, undefined));
  writeFileSync(join(root, 'artifact-integrity.json'), '{}');
  assert.throws(() => verifyArtifact(root, key));
});
