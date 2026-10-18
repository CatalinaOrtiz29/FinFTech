'use strict';

const crypto = require('crypto');
const { getDb, transaction } = require('../db');
const { shortId } = require('../lib/ids');
const { LIMITS, withinLimit } = require('../lib/validation');
const { badRequest, notFound, conflict, unprocessable } = require('../lib/errors');

/** Hash estable de la solicitud, para detectar reutilizaciÃƒÂ³n de clave con cuerpo distinto. */
function requestHash({ from, to, amountCents, currency }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ from, to, amountCents, currency }))
    .digest('hex');
}

function toAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    currency: row.currency,
    balance: row.balance_cents / 100,
    balanceCents: row.balance_cents,
  };
}

function toTransfer(row) {
  if (!row) return null;
  return JSON.parse(row.response_json);
}

function listAccounts() {
  const rows = getDb().prepare('SELECT * FROM accounts ORDER BY name').all();
  return rows.map(toAccount);
}

function getAccount(id) {
  return toAccount(getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id));
}

function listTransfers(limit = 50) {
  const rows = getDb()
    .prepare('SELECT * FROM transfers ORDER BY created_at DESC LIMIT ?')
    .all(Math.min(Math.max(Number(limit) || 50, 1), 500));
  return rows.map(toTransfer);
}

/**
 * Transferencia idempotente y segura ante concurrencia.
 *
 * - La clave de idempotencia es ÃƒÂºnica (restricciÃƒÂ³n UNIQUE en la tabla).
 * - Toda la operaciÃƒÂ³n se ejecuta en una transacciÃƒÂ³n BEGIN IMMEDIATE, que serializa
 *   las escrituras concurrentes: dos solicitudes con la misma clave no pueden crear
 *   dos transferencias.
 * - Si la clave ya existe con el mismo cuerpo se devuelve el resultado almacenado
 *   (replay, sin efecto nuevo). Si el cuerpo difiere, se responde 409.
 */
function transfer({ from, to, amount, currency, idempotencyKey, correlationId }) {
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
    throw badRequest('Se requiere el encabezado Idempotency-Key (mÃƒÂ­nimo 8 caracteres).');
  }
  // Acotado de entradas: la clave se persiste (UNIQUE), asÃƒÂ­ que no puede ser ilimitada.
  if (!withinLimit(idempotencyKey, LIMITS.idempotencyKey)) {
    throw badRequest(`La clave de idempotencia no puede superar ${LIMITS.idempotencyKey} caracteres.`);
  }
  if (!from || !to) throw badRequest('Los campos "from" y "to" son obligatorios.');
  if (!withinLimit(from, LIMITS.accountId) || !withinLimit(to, LIMITS.accountId)) {
    throw badRequest(`Los identificadores de cuenta no pueden superar ${LIMITS.accountId} caracteres.`);
  }
  if (from === to) throw unprocessable('La cuenta de origen y destino no pueden coincidir.');

  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw badRequest('El monto debe ser un nÃƒÂºmero positivo.');
  }

  const hash = requestHash({ from, to, amountCents, currency });

  return transaction(() => {
    const conn = getDb();
    const existing = conn.prepare('SELECT * FROM transfers WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) {
      if (existing.request_hash !== hash) {
        throw conflict('La clave de idempotencia ya fue usada con una solicitud diferente.', {
          idempotencyKey,
          originalTransferId: existing.id,
        });
      }
      return { replayed: true, transfer: toTransfer(existing) };
    }

    const fromAcc = conn.prepare('SELECT * FROM accounts WHERE id = ?').get(from);
    const toAcc = conn.prepare('SELECT * FROM accounts WHERE id = ?').get(to);
    if (!fromAcc) throw notFound(`Cuenta origen "${from}" no encontrada.`);
    if (!toAcc) throw notFound(`Cuenta destino "${to}" no encontrada.`);

    const cur = currency || fromAcc.currency;
    if (fromAcc.currency !== cur || toAcc.currency !== cur) {
      throw unprocessable('Las cuentas deben operar en la misma moneda.');
    }

    // ActualizaciÃƒÂ³n condicional atÃƒÂ³mica: impide saldos negativos bajo concurrencia.
    const debit = conn
      .prepare('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ? AND balance_cents >= ?')
      .run(amountCents, from, amountCents);
    if (debit.changes !== 1) {
      throw unprocessable('Saldo insuficiente.', {
        account: from,
        balance: fromAcc.balance_cents / 100,
        requested: amountCents / 100,
      });
    }
    conn.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(amountCents, to);

    const fromAfter = conn.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(from);
    const toAfter = conn.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(to);

    const now = new Date().toISOString();
    const response = {
      id: shortId('trf'),
      status: 'completed',
      from,
      to,
      amount: amountCents / 100,
      currency: cur,
      idempotencyKey,
      balances: {
        from: fromAfter.balance_cents / 100,
        to: toAfter.balance_cents / 100,
      },
      createdAt: now,
    };

    conn
      .prepare(
        `INSERT INTO transfers
         (id, idempotency_key, request_hash, from_account, to_account, amount_cents, currency, status, response_json, correlation_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        response.id,
        idempotencyKey,
        hash,
        from,
        to,
        amountCents,
        cur,
        response.status,
        JSON.stringify(response),
        correlationId || null,
        now
      );

    return { replayed: false, transfer: response };
  });
}

module.exports = { listAccounts, getAccount, listTransfers, transfer, toAccount };
