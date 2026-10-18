'use strict';

const config = require('../config');
const { getDb } = require('../db');
const runner = require('./runner');

/** ExportaciÃƒÂ³n de resultados de ejecuciones a JSON y CSV. */

function reportJson(run) {
  return {
    product: 'FinFTech',
    version: config.version,
    commit: config.commitSha,
    generatedAt: new Date().toISOString(),
    run,
  };
}

const CSV_COLUMNS = [
  'id',
  'scenario',
  'label',
  'status',
  'result',
  'startedAt',
  'endedAt',
  'durationMs',
  'requests',
  'successful',
  'errors',
  'errorRatePct',
  'rps',
  'p50Ms',
  'p95Ms',
  'p99Ms',
  'config',
];

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function runsToCsv(runs) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of runs) {
    const m = r.metrics || {};
    const lat = m.latencyMs || {};
    lines.push(
      CSV_COLUMNS.map((c) =>
        csvCell({
          id: r.id,
          scenario: r.scenario,
          label: r.label,
          status: r.status,
          result: r.result,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
          durationMs: r.durationMs,
          requests: m.requests,
          successful: m.successful,
          errors: m.errors,
          errorRatePct: m.errorRatePct,
          rps: m.rps,
          p50Ms: lat.p50,
          p95Ms: lat.p95,
          p99Ms: lat.p99,
          config: JSON.stringify(r.config || {}),
        }[c])
      ).join(',')
    );
  }
  return lines.join('\n');
}

function exportRun(id) {
  const run = runner.getRun(id);
  return reportJson(run);
}

function exportHistoryCsv(filter) {
  return runsToCsv(runner.listRuns({ ...filter, limit: 200 }));
}

/** EstadÃƒÂ­sticas agregadas para el panel de control. */
function summary() {
  const total = getDb().prepare('SELECT COUNT(*) AS n FROM test_runs').get().n;
  const byResult = getDb().prepare('SELECT status, COUNT(*) AS n FROM test_runs GROUP BY status').all();
  const latest = runner.listRuns({ limit: 5 });
  return {
    totalRuns: total,
    byStatus: byResult.reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {}),
    latest,
  };
}

module.exports = { reportJson, runsToCsv, exportRun, exportHistoryCsv, summary };
