'use strict';

const express = require('express');
const config = require('../config');
const { getDb } = require('../db');
const metrics = require('../lib/metrics');

const router = express.Router();

function health() {
  let db = 'ok';
  try {
    getDb().prepare('SELECT 1 AS n').get();
  } catch (err) {
    db = 'error';
  }
  const healthy = db === 'ok';
  return {
    status: healthy ? 'healthy' : 'degraded',
    product: 'FinFTech',
    service: 'finftech-api',
    version: config.version,
    commit: config.commitSha,
    env: config.env,
    uptimeSeconds: metrics.snapshot().uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks: { api: 'ok', database: db },
  };
}

router.get('/health', (req, res) => {
  const body = health();
  res.status(body.status === 'healthy' ? 200 : 503).json(body);
});

router.get('/ready', (req, res) => res.json(health()));

module.exports = router;
module.exports.health = health;
