'use strict';

/**
 * Persistencia real en disco: los datos y la idempotencia deben sobrevivir a un
 * reinicio del proceso (se cierra y se vuelve a abrir la misma base de datos).
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const { connect, close } = require('../../src/db');
const { ensureSeed } = require('../../src/services/seed');
const wallet = require('../../src/services/wallet');

const KEY = `persist-${Date.now()}`;
let originalBalance;
let transferId;

before(() => {
  connect();
  ensureSeed();
});

after(() => {
  close();
  temp.cleanup();
});

test('una transferencia se escribe en disco (saldo y registro)', () => {
  originalBalance = wallet.getAccount('acc_bob').balanceCents;
  const res = wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 2.5, idempotencyKey: KEY });

  assert.equal(res.replayed, false);
  assert.equal(res.transfer.status, 'completed');
  transferId = res.transfer.id;
  assert.equal(wallet.getAccount('acc_bob').balanceCents, originalBalance + 250);
});

test('tras reiniciar el proceso el saldo y la transferencia siguen ahÃƒÂ­', () => {
  close(); // simula el final del proceso
  connect(); // y su rearranque sobre el mismo fichero

  assert.equal(wallet.getAccount('acc_bob').balanceCents, originalBalance + 250);

  const transfers = wallet.listTransfers(500);
  const found = transfers.find((t) => t.id === transferId);
  assert.ok(found, 'la transferencia debe seguir almacenada tras el reinicio');
  assert.equal(found.idempotencyKey, KEY);
});

test('la clave de idempotencia sigue vigente tras el reinicio (replay, no duplicado)', () => {
  const res = wallet.transfer({ from: 'acc_alice', to: 'acc_bob', amount: 2.5, idempotencyKey: KEY });

  assert.equal(res.replayed, true);
  assert.equal(res.transfer.id, transferId);
  // Ni el saldo ni el nÃƒÂºmero de transferencias con esa clave cambian.
  assert.equal(wallet.getAccount('acc_bob').balanceCents, originalBalance + 250);
  const conMismaClave = wallet.listTransfers(500).filter((t) => t.idempotencyKey === KEY);
  assert.equal(conMismaClave.length, 1);
});
