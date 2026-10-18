'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { LIMITS, isEmail, withinLimit, isWeakSecret } = require('../../src/lib/validation');
const { shortId } = require('../../src/lib/ids');

test('isEmail acepta las direcciones habituales del laboratorio', () => {
  for (const value of ['admin@finftech.local', 'a.b+c@sub.dominio.org', 'x@y.io']) {
    assert.equal(isEmail(value), true, `deberÃƒÂ­a aceptar ${value}`);
  }
});

test('isEmail rechaza formatos invÃƒÂ¡lidos', () => {
  const invalid = [
    '',
    'sin-arroba',
    '@finftech.local',
    'admin@',
    'admin@localhost', // sin punto en el dominio
    'a@b@c.local', // dos arrobas
    'admin@.local',
    'admin@finftech.',
    'admin@fin..ftech.local',
    'admin @finftech.local',
    'admin@finftech.local\n',
  ];
  for (const value of invalid) {
    assert.equal(isEmail(value), false, `deberÃƒÂ­a rechazar ${JSON.stringify(value)}`);
  }
});

test('isEmail es lineal: una entrada hostil no consume CPU de forma desproporcionada', () => {
  // PatrÃƒÂ³n que hacÃƒÂ­a retroceder al validador anterior (un punto por cada posible
  // separador antes de fallar): 100 002 caracteres.
  const hostile = `a@${'x.'.repeat(50000)}@`;
  assert.ok(hostile.length > LIMITS.email);

  const started = process.hrtime.bigint();
  assert.equal(isEmail(hostile), false);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  // 250 ms es un margen muy holgado para una comprobaciÃƒÂ³n de longitud + recorrido
  // lineal; el validador cuadrÃƒÂ¡tico tardaba ~4 s con esta misma entrada.
  assert.ok(elapsedMs < 250, `la validaciÃƒÂ³n debe ser lineal (tardÃƒÂ³ ${elapsedMs.toFixed(2)} ms)`);
});

test('withinLimit acota cadenas y tolera valores vacÃƒÂ­os', () => {
  assert.equal(withinLimit('abc', 3), true);
  assert.equal(withinLimit('abcd', 3), false);
  assert.equal(withinLimit(null, 3), true);
  assert.equal(withinLimit(undefined, 3), true);
  assert.equal(withinLimit(12345, 4), false);
});

test('isWeakSecret detecta valores de ejemplo y secretos cortos', () => {
  const weak = [
    '',
    'corto',
    'change-me',
    'change-me-please',
    'changeme',
    'secret',
    'finftech-dev-secret-change-me',
    'finftech-dev-secret-change-me-in-env',
    'Change-Me-Please', // sin distinguir mayÃƒÂºsculas
  ];
  for (const value of weak) assert.equal(isWeakSecret(value), true, `deberÃƒÂ­a ser dÃƒÂ©bil: ${value}`);

  const strong = ['finftech-local-verify-secret-9f2a', 'a'.repeat(32), 'Xy9-Token-Secreto-Largo-2026'];
  for (const value of strong) assert.equal(isWeakSecret(value), false, `no deberÃƒÂ­a ser dÃƒÂ©bil: ${value}`);
});

test('shortId usa 64 bits de entropÃƒÂ­a (clave primaria sin colisiones a esta escala)', () => {
  const sample = new Set();
  const n = 50000;
  for (let i = 0; i < n; i++) sample.add(shortId('trf'));

  // 8 bytes -> 16 caracteres hexadecimales (con 4 bytes eran 8).
  assert.match(shortId('trf'), /^trf_[0-9a-f]{16}$/);
  // Con 4 bytes esta muestra producÃƒÂ­a colisiones de forma reproducible.
  assert.equal(sample.size, n, 'no debe haber identificadores repetidos');
});
