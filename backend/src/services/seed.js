'use strict';

const { getDb } = require('../db');
const users = require('./users');
const { shortId } = require('../lib/ids');

const DEMO_ACCOUNTS = [
  { id: 'acc_alice', owner: 'alice@finftech.local', name: 'Alice Nguyen', balance: 100000 },
  { id: 'acc_bob', owner: 'bob@finftech.local', name: 'Bob Martinez', balance: 50000 },
  { id: 'acc_carol', owner: 'carol@finftech.local', name: 'Carol Smith', balance: 75000 },
  { id: 'acc_dave', owner: 'dave@finftech.local', name: 'Dave Okoro', balance: 25000 },
];

/** Crea el administrador y las cuentas de demostraciÃƒÂ³n si no existen (idempotente). */
function ensureSeed() {
  const created = { admin: false, accounts: 0 };
  if (users.ensureAdmin()) created.admin = true;

  const count = getDb().prepare('SELECT COUNT(*) AS n FROM accounts').get().n;
  if (count === 0) {
    const stmt = getDb().prepare(
      'INSERT INTO accounts (id, owner, name, currency, balance_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    for (const a of DEMO_ACCOUNTS) {
      stmt.run(a.id, a.owner, a.name, 'USD', a.balance, now);
      created.accounts += 1;
    }
  }
  return created;
}

/** Restaura los saldos de las cuentas de demostraciÃƒÂ³n a su valor inicial (para reejecutar pruebas). */
function resetBalances() {
  const stmt = getDb().prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?');
  for (const a of DEMO_ACCOUNTS) stmt.run(a.balance, a.id);
  return DEMO_ACCOUNTS.length;
}

module.exports = { ensureSeed, resetBalances, DEMO_ACCOUNTS };
