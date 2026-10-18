'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const { connect, close } = require('../../src/db');
const { ensureSeed } = require('../../src/services/seed');
const wallet = require('../../src/services/wallet');

before(() => {
  connect();
  ensureSeed();
});

after(() => {
  close();
  temp.cleanup();
});

test('una transferencia vÃƒÂ¡lida debita y acredita una sola vez', () => {
  const before = wallet.getAccount('acc_alice').balanceCents;
  const res = wallet.transfer({
    from: 'acc_alice',
    to: 'acc_bob',
    amount: 10,
    idempotencyKey: `unit-simple-${Date.now()}`,
  });
  assert.equal(res.replayed, false);
  assert.equal(res.transfer.status, 'completed');
  assert.equal(wallet.getAccount('acc_alice').balanceCents, before - 1000);
});

test('la misma clave con el mismo cuerpo hace replay sin doble efecto', () => {
  const key = `unit-replay-${Date.now()}`;
  const before = wallet.getAccount('acc_alice').balanceCents;
  const first = wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 5, idempotencyKey: key });
  const second = wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 5, idempotencyKey: key });
  assert.equal(first.transfer.id, second.transfer.id);
  assert.equal(second.replayed, true);
  assert.equal(wallet.getAccount('acc_alice').balanceCents, before - 500);
});

test('la misma clave con cuerpo distinto produce conflicto 409', () => {
  const key = `unit-conflict-${Date.now()}`;
  wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 1, idempotencyKey: key });
  assert.throws(
    () => wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 2, idempotencyKey: key }),
    (err) => err.status === 409
  );
});

test('saldo insuficiente produce 422 y no altera saldos', () => {
  const before = wallet.getAccount('acc_dave').balanceCents;
  assert.throws(
    () => wallet.transfer({ from: 'acc_dave', to: 'acc_bob', amount: 999999, idempotencyKey: `unit-nsf-${Date.now()}` }),
    (err) => err.status === 422
  );
  assert.equal(wallet.getAccount('acc_dave').balanceCents, before);
});

test('montos invÃƒÂ¡lidos son rechazados con 400', () => {
  assert.throws(
    () => wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: -1, idempotencyKey: `unit-bad-${Date.now()}` }),
    (err) => err.status === 400
  );
});

test('sin clave de idempotencia se rechaza con 400', () => {
  assert.throws(() => wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 1 }), (err) => err.status === 400);
});
