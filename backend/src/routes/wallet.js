'use strict';

const express = require('express');
const wallet = require('../services/wallet');
const { badRequest, notFound } = require('../lib/errors');

const router = express.Router();

/** POST /transfer  y  POST /api/wallet/transfer */
function handleTransfer(req, res) {
  const { from, to, amount, currency } = req.body || {};
  const idempotencyKey = req.get('Idempotency-Key') || (req.body && req.body.idempotencyKey);
  const result = wallet.transfer({
    from,
    to,
    amount,
    currency,
    idempotencyKey,
    correlationId: req.id,
  });
  const status = result.replayed ? 200 : 201;
  res.status(status).json({
    ...result.transfer,
    idempotentReplay: result.replayed,
  });
}

router.post('/wallet/transfer', handleTransfer);

router.get('/accounts', (req, res) => {
  res.json({ accounts: wallet.listAccounts() });
});

router.get('/accounts/:id', (req, res) => {
  const acc = wallet.getAccount(req.params.id);
  if (!acc) throw notFound(`Cuenta "${req.params.id}" no encontrada.`);
  res.json({ account: acc });
});

router.get('/transfers', (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json({ transfers: wallet.listTransfers(limit) });
});

module.exports = router;
module.exports.handleTransfer = handleTransfer;
module.exports.validateTransferInput = (body) => {
  if (!body || !body.from || !body.to || body.amount === undefined) {
    throw badRequest('"from", "to" y "amount" son obligatorios.');
  }
};
