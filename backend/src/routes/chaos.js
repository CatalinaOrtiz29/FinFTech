'use strict';

const express = require('express');
const chaos = require('../services/chaos');
const settings = require('../services/settings');
const { badRequest } = require('../lib/errors');

const router = express.Router();

let autoResetTimer = null;

function scheduleAutoReset() {
  if (autoResetTimer) clearTimeout(autoResetTimer);
  const ms = settings.getNumber('autoResetChaosMs');
  if (ms > 0) {
    autoResetTimer = setTimeout(() => chaos.reset(), ms);
    autoResetTimer.unref?.();
  }
}

router.get('/', (req, res) => res.json({ chaos: chaos.getState() }));

router.post('/latency', (req, res) => {
  const { ms, jitterMs } = req.body || {};
  if (ms === undefined) throw badRequest('"ms" es obligatorio.');
  const state = chaos.setLatency({ ms, jitterMs });
  scheduleAutoReset();
  res.json({ chaos: state });
});

router.post('/failure', (req, res) => {
  const { rate, status } = req.body || {};
  if (rate === undefined) throw badRequest('"rate" es obligatorio (0..1).');
  const state = chaos.setFailure({ rate, status });
  scheduleAutoReset();
  res.json({ chaos: state });
});

router.post('/reset', (req, res) => {
  if (autoResetTimer) clearTimeout(autoResetTimer);
  res.json({ chaos: chaos.reset() });
});

module.exports = router;
