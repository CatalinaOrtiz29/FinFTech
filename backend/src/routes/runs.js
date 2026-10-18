'use strict';

const express = require('express');
const runner = require('../services/runner');
const scenarios = require('../services/scenarios');
const reports = require('../services/reports');
const settings = require('../services/settings');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/scenarios', (req, res) => {
  res.json({ scenarios: scenarios.list(), defaultScenario: settings.get('defaultScenario') });
});

router.get('/runs', (req, res) => {
  const limit = req.query.limit || settings.get('historyLimit');
  const runs = runner.listRuns({ scenario: req.query.scenario, status: req.query.status, limit });
  res.json({ runs, count: runs.length });
});

router.get('/runs/active', (req, res) => {
  res.json({ runs: runner.activeList() });
});

router.post('/runs', optionalAuth, (req, res) => {
  const body = req.body || {};
  const scenario = body.scenario || settings.get('defaultScenario');
  const run = runner.start({ scenario, config: body.config, label: body.label, user: req.user });
  res.status(202).json({ run });
});

router.get('/runs/:id', (req, res) => res.json({ run: runner.getRun(req.params.id) }));

router.post('/runs/:id/cancel', (req, res) => res.json({ run: runner.cancel(req.params.id) }));

router.get('/runs/:id/report.json', (req, res) => {
  const report = reports.exportRun(req.params.id);
  res.set('Content-Disposition', `attachment; filename="finftech-run-${req.params.id}.json"`);
  res.json(report);
});

router.get('/runs/:id/report.csv', (req, res) => {
  const csv = reports.runsToCsv([runner.getRun(req.params.id)]);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="finftech-run-${req.params.id}.csv"`);
  res.send(csv);
});

router.get('/history', (req, res) => {
  const limit = req.query.limit || settings.get('historyLimit');
  const runs = runner.listRuns({ scenario: req.query.scenario, status: req.query.status, limit });
  res.json({ runs, count: runs.length });
});

router.get('/history/export.json', (req, res) => {
  res.set('Content-Disposition', 'attachment; filename="finftech-history.json"');
  res.json({ product: 'FinFTech', generatedAt: new Date().toISOString(), runs: runner.listRuns({ limit: 200 }) });
});

router.get('/history/export.csv', (req, res) => {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="finftech-history.csv"');
  res.send(reports.exportHistoryCsv({}));
});

/** Compara dos o mÃƒÂ¡s ejecuciones y calcula deltas de las mÃƒÂ©tricas clave. */
router.get('/history/compare', (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length < 2) throw require('../lib/errors').badRequest('Se requieren al menos dos IDs: ?ids=a,b');
  const runs = ids.map((id) => runner.getRun(id));
  const delta = (a, b) => (a === 0 || a == null ? null : Math.round(((b - a) / a) * 1000) / 10);
  const first = runs[0];
  const last = runs[runs.length - 1];
  res.json({
    runs,
    deltas: {
      p95Pct: delta(first.metrics?.latencyMs?.p95, last.metrics?.latencyMs?.p95),
      errorRatePct: delta(first.metrics?.errorRatePct, last.metrics?.errorRatePct),
      rpsPct: delta(first.metrics?.rps, last.metrics?.rps),
    },
  });
});

router.get('/summary', (req, res) => res.json(reports.summary()));

module.exports = router;
