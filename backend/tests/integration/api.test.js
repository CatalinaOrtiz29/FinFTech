'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const { connect, close } = require('../../src/db');
const { ensureSeed } = require('../../src/services/seed');
const { createApp } = require('../../src/app');

let server;
let base;

async function call(method, path, { body, headers } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

before(async () => {
  connect();
  ensureSeed();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((r) => server.close(r));
  close();
  temp.cleanup();
});

test('GET /health responde healthy', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'healthy');
  assert.equal(r.data.product, 'FinFTech');
});

test('POST /login devuelve token con credenciales vÃƒÂ¡lidas', async () => {
  const r = await call('POST', '/login', { body: { email: 'admin@finftech.local', password: 'finftech-admin' } });
  assert.equal(r.status, 200);
  assert.ok(r.data.token);
});

test('POST /login rechaza credenciales invÃƒÂ¡lidas con 401', async () => {
  const r = await call('POST', '/login', { body: { email: 'admin@finftech.local', password: 'wrong' } });
  assert.equal(r.status, 401);
});

test('reintentos concurrentes con la misma clave crean una ÃƒÂºnica transferencia', async () => {
  const key = `http-concurrent-${Date.now()}`;
  const before = (await call('GET', '/api/accounts/acc_alice')).data.account.balanceCents;
  const responses = await Promise.all(
    Array.from({ length: 30 }, () =>
      call('POST', '/transfer', {
        headers: { 'Idempotency-Key': key },
        body: { from: 'acc_alice', to: 'acc_bob', amount: 1 },
      })
    )
  );
  const created = responses.filter((r) => r.status === 201).length;
  const replayed = responses.filter((r) => r.status === 200).length;
  const after = (await call('GET', '/api/accounts/acc_alice')).data.account.balanceCents;
  assert.equal(created, 1, 'solo una creaciÃƒÂ³n');
  assert.equal(replayed, 29, 'el resto son replays');
  assert.equal(before - after, 100, 'el saldo se debita exactamente una vez');
});

test('transferencias concurrentes con claves distintas no generan saldo negativo', async () => {
  const acc = 'acc_dave';
  const amount = 100; // 100.00
  const before = (await call('GET', `/api/accounts/${acc}`)).data.account.balanceCents;
  const expectedSuccess = Math.floor(before / (amount * 100));
  const responses = await Promise.all(
    Array.from({ length: 60 }, (_, i) =>
      call('POST', '/transfer', {
        headers: { 'Idempotency-Key': `http-distinct-${Date.now()}-${i}` },
        body: { from: acc, to: 'acc_bob', amount },
      })
    )
  );
  const ok = responses.filter((r) => r.status === 201).length;
  const after = (await call('GET', `/api/accounts/${acc}`)).data.account.balanceCents;
  assert.equal(ok, expectedSuccess);
  assert.ok(after >= 0, 'el saldo nunca es negativo');
  assert.equal(after, before - expectedSuccess * amount * 100);
});

test('Idempotency-Key con cuerpo distinto responde 409', async () => {
  const key = `http-conflict-${Date.now()}`;
  await call('POST', '/transfer', { headers: { 'Idempotency-Key': key }, body: { from: 'acc_alice', to: 'acc_bob', amount: 1 } });
  const r = await call('POST', '/transfer', { headers: { 'Idempotency-Key': key }, body: { from: 'acc_alice', to: 'acc_bob', amount: 2 } });
  assert.equal(r.status, 409);
});

test('ruta inexistente devuelve 404 uniforme', async () => {
  const r = await call('GET', '/no-existe');
  assert.equal(r.status, 404);
  assert.equal(r.data.error, 'not_found');
});
