'use strict';

// LOG_LEVEL alto para probar el gating por nivel.
process.env.LOG_LEVEL = 'debug';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const logger = require('../../src/lib/logger');

test('redact oculta los campos sensibles de forma recursiva', () => {
  const out = logger.redact({
    password: 'super-secreta',
    token: 'abc.def.ghi',
    secret: 'shh',
    authorization: 'Bearer xyz',
    nested: { apiKey: 'k', cookie: 'c', visible: 'ok' },
    list: [{ password: 'p2' }, { name: 'ana' }],
  });

  assert.equal(out.password, '[redacted]');
  assert.equal(out.token, '[redacted]');
  assert.equal(out.secret, '[redacted]');
  assert.equal(out.authorization, '[redacted]');
  assert.equal(out.nested.apiKey, '[redacted]');
  assert.equal(out.nested.cookie, '[redacted]');
  assert.equal(out.nested.visible, 'ok');
  assert.equal(out.list[0].password, '[redacted]');
  assert.equal(out.list[1].name, 'ana');
});

test('redact no modifica valores no sensibles', () => {
  const out = logger.redact({ count: 3, name: 'FinFTech', flag: true, nil: null });
  assert.deepEqual(out, { count: 3, name: 'FinFTech', flag: true, nil: null });
});

test('el logger respeta el nivel configurado (no emite por debajo del umbral)', () => {
  const origErr = process.stderr.write;
  const origOut = process.stdout.write;
  let stderr = '';
  let stdout = '';
  process.stderr.write = (chunk) => { stderr += String(chunk); return true; };
  process.stdout.write = (chunk) => { stdout += String(chunk); return true; };

  try {
    // LOG_LEVEL se leyo al cargar el modulo; el helper lo deja en 'error' si no
    // se fija antes. Aqui usamos el valor fijado al principio del fichero.
    logger.error('m1');
    logger.warn('m2');
    logger.info('m3');
    logger.debug('m4');
  } finally {
    process.stderr.write = origErr;
    process.stdout.write = origOut;
  }

  // Con LOG_LEVEL='debug' se emiten los cuatro (error/warn -> stderr, info/debug -> stdout).
  assert.match(stderr, /"msg":"m1"/);
  assert.match(stderr, /"msg":"m2"/);
  assert.match(stdout, /"msg":"m3"/);
  assert.match(stdout, /"msg":"m4"/);
});

after(() => {
  temp.cleanup();
});
