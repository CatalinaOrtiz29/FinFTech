'use strict';

const { performance } = require('perf_hooks');
const config = require('../config');
const chaos = require('./chaos');
const scenarios = require('./scenarios');
const { getDb } = require('../db');
const { shortId } = require('../lib/ids');
const { badRequest, notFound, conflict } = require('../lib/errors');

/** Ejecuciones activas en memoria (mÃƒÂ©tricas en vivo). */
const activeRuns = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const selfBase = () => `http://127.0.0.1:${config.port}`;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function restoreChaos(prev) {
  if (!prev) return chaos.reset();
  if (prev.latency && prev.latency.enabled) return chaos.setLatency(prev.latency);
  if (prev.failure && prev.failure.enabled) return chaos.setFailure(prev.failure);
  return chaos.reset();
}

function computeMetrics(state) {
  const lat = [...state.metrics.latencies].sort((a, b) => a - b);
  const total = state.metrics.total;
  const errors = state.metrics.errors;
  const durationMs = Date.now() - state.startedMs;
  return {
    requests: total,
    successful: total - errors,
    errors,
    errorRatePct: total ? round((errors / total) * 100, 2) : 0,
    rps: round(total / (durationMs / 1000 || 1), 2),
    latencyMs: {
      count: lat.length,
      avg: lat.length ? round(lat.reduce((a, b) => a + b, 0) / lat.length, 1) : 0,
      min: lat.length ? round(lat[0], 1) : 0,
      max: lat.length ? round(lat[lat.length - 1], 1) : 0,
      p50: round(percentile(lat, 50), 1),
      p90: round(percentile(lat, 90), 1),
      p95: round(percentile(lat, 95), 1),
      p99: round(percentile(lat, 99), 1),
    },
    statusCounts: { ...state.metrics.statusCounts },
    durationMs,
    timeline: [...state.timeline.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([sec, v]) => ({ t: sec * 1000, requests: v.count, errors: v.errors })),
    checks: state.checks || [],
  };
}

/** Tasas de error por ventana temporal (primera mitad vs. ÃƒÂºltimo cuarto de la ejecuciÃƒÂ³n). */
function windowedRates(metrics) {
  const tl = metrics.timeline || [];
  if (!tl.length) return { firstHalfErrorRatePct: 0, lastQuarterErrorRatePct: 0 };
  const t0 = tl[0].t;
  const t1 = tl[tl.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const mid = t0 + span / 2;
  const q3 = t0 + span * 0.75;
  let fReq = 0;
  let fErr = 0;
  let lReq = 0;
  let lErr = 0;
  for (const b of tl) {
    if (b.t < mid) {
      fReq += b.requests;
      fErr += b.errors;
    }
    if (b.t >= q3) {
      lReq += b.requests;
      lErr += b.errors;
    }
  }
  return {
    firstHalfErrorRatePct: fReq ? round((fErr / fReq) * 100, 2) : 0,
    lastQuarterErrorRatePct: lReq ? round((lErr / lReq) * 100, 2) : 0,
  };
}

/**
 * EvalÃƒÂºa la ejecuciÃƒÂ³n contra criterios explÃƒÂ­citos y devuelve el resultado.
 * Cada escenario de fallo tiene su propio criterio, para no confundir
 * "la prueba se ejecutÃƒÂ³" con "el sistema superÃƒÂ³ las validaciones".
 */
function evaluate(state, metrics) {
  const th = state.thresholds || {};
  const checks = [];
  const check = (name, ok, actual, limit, note) => checks.push({ name, ok, actual, limit, note });
  const win = windowedRates(metrics);

  if (state.scenario === 'idempotency') {
    const idem = state.idempotency || {};
    check('single_effect', idem.singleEffect === true, idem.effectCount, 1, 'El efecto sobre el saldo debe ocurrir exactamente una vez');
    check('no_duplicate_effects', (idem.duplicateEffects || 0) === 0, idem.duplicateEffects || 0, 0, 'No debe crearse mÃƒÂ¡s de una transferencia con la misma clave');
    check('no_conflicts', (idem.conflicts || 0) === 0, idem.conflicts || 0, 0, 'Reintentos con el mismo cuerpo no deben dar 409');
    state.checks = checks;
    return checks.every((c) => c.ok) ? 'passed' : 'failed';
  }

  if (state.scenario === 'outage') {
    check('fault_reproduced', metrics.errorRatePct >= 50, metrics.errorRatePct, '>=50', 'La interrupciÃƒÂ³n debe reflejarse en la tasa de errores');
    state.checks = checks;
    return checks.every((c) => c.ok) ? 'passed' : 'failed';
  }

  if (state.scenario === 'recovery') {
    check('outage_observed', win.firstHalfErrorRatePct >= 50, win.firstHalfErrorRatePct, '>=50', 'El fallo debe observarse en la primera mitad');
    check('recovered', win.lastQuarterErrorRatePct <= 5, win.lastQuarterErrorRatePct, '<=5', 'Tras retirar el fallo, la tasa de error debe volver a ~0');
    state.checks = checks;
    return checks.every((c) => c.ok) ? 'passed' : 'failed';
  }

  if (state.scenario === 'latency') {
    const injected = Number(state.config.latencyMs) || 0;
    check('latency_injected', metrics.latencyMs.p95 >= injected * 0.5, metrics.latencyMs.p95, `>=${round(injected * 0.5, 0)}`, 'La latencia inyectada debe reflejarse en P95');
    if (th.errorRatePct != null) check('error_rate', metrics.errorRatePct <= th.errorRatePct, metrics.errorRatePct, th.errorRatePct);
  } else {
    if (th.p95Ms != null) check('p95', metrics.latencyMs.p95 <= th.p95Ms, metrics.latencyMs.p95, th.p95Ms, 'Latencia P95 dentro del umbral');
    if (th.errorRatePct != null) check('error_rate', metrics.errorRatePct <= th.errorRatePct, metrics.errorRatePct, th.errorRatePct, 'Tasa de error dentro del umbral');
    if (th.minRps) check('min_rps', metrics.rps >= th.minRps, metrics.rps, th.minRps, 'Throughput mÃƒÂ­nimo alcanzado');
  }

  state.checks = checks;
  const failed = checks.filter((c) => !c.ok);
  if (failed.length === 0) return 'passed';
  // Degradado si la desviaciÃƒÂ³n es leve (hasta 1.5x el umbral); fallido si es severa.
  const severe = failed.some((c) => {
    const limit = Number(c.limit);
    const actual = Number(c.actual) || 0;
    if (!Number.isFinite(limit) || limit <= 0) return true;
    return actual > limit * 1.5;
  });
  return severe ? 'failed' : 'degraded';
}

function recordRequest(state, durationMs, status) {
  state.metrics.total += 1;
  if (status >= 500 || status === 0) state.metrics.errors += 1;
  state.metrics.statusCounts[status] = (state.metrics.statusCounts[status] || 0) + 1;
  state.metrics.latencies.push(durationMs);
  const sec = Math.floor(Date.now() / 1000);
  const b = state.timeline.get(sec) || { count: 0, errors: 0 };
  b.count += 1;
  if (status >= 500 || status === 0) b.errors += 1;
  state.timeline.set(sec, b);
}

async function doRequest(state, { path, method = 'GET', body, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.runner.requestTimeoutMs);
  const started = performance.now();
  let status = 0;
  try {
    const res = await fetch(`${selfBase()}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    status = res.status;
    await res.arrayBuffer();
  } catch (_) {
    status = 0; // timeout / red: cuenta como error
  } finally {
    clearTimeout(timer);
  }
  recordRequest(state, round(performance.now() - started, 1), status);
  return status;
}

function pickAccounts() {
  const rows = getDb().prepare('SELECT id FROM accounts ORDER BY id').all();
  return rows.map((r) => r.id);
}

async function worker(state, index, ids) {
  const { rampUpMs = 0, thinkTimeMs = 0 } = state.config;
  if (rampUpMs > 0) await sleep(Math.round((index / Math.max(1, state.vus)) * rampUpMs));
  const endAt = state.startedMs + state.config.durationMs;
  while (!state.stop && Date.now() < endAt) {
    if (state.scenario === 'functional') {
      await doRequest(state, { path: '/health' });
      if (state.stop) break;
      await doRequest(state, { path: '/login', method: 'POST', body: { email: 'demo', password: 'demo' } });
      if (state.stop) break;
      await doRequest(state, {
        path: '/transfer',
        method: 'POST',
        headers: { 'Idempotency-Key': `load-${state.id}-${shortId('k')}` },
        body: { from: ids[0], to: ids[1], amount: 0.5 },
      });
    } else {
      const from = ids[Math.floor(Math.random() * ids.length)];
      let to = ids[Math.floor(Math.random() * ids.length)];
      if (to === from) to = ids[(ids.indexOf(from) + 1) % ids.length];
      await doRequest(state, {
        path: '/transfer',
        method: 'POST',
        headers: { 'Idempotency-Key': `run-${state.id}-${shortId('k')}` },
        body: { from, to, amount: 0.25 },
      });
    }
    if (thinkTimeMs) await sleep(thinkTimeMs);
  }
}

async function runLoad(state) {
  const ids = pickAccounts();
  if (ids.length < 2) throw new Error('Se requieren al menos dos cuentas sembradas.');

  if (state.fault === 'recovery') {
    const mid = Math.round(state.config.durationMs / 2);
    state.recoveryTimer = setTimeout(() => {
      chaos.reset();
      state.faultTimeline.push({ atMs: mid, action: 'clear' });
    }, mid);
  }

  await Promise.all(Array.from({ length: state.vus }, (_, i) => worker(state, i, ids)));
}

async function runIdempotency(state) {
  const ids = pickAccounts();
  const [from, to] = ids;
  const amount = 1;
  const key = `idem-${state.id}-${shortId('k')}`;
  const repeats = Math.max(2, Number(state.config.repeats) || 10);

  const before = getDb().prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(from).balance_cents;

  const results = await Promise.all(
    Array.from({ length: repeats }, () =>
      doRequest(state, {
        path: '/transfer',
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: { from, to, amount },
      })
    )
  );

  const after = getDb().prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(from).balance_cents;
  const created = getDb().prepare('SELECT COUNT(*) AS n FROM transfers WHERE idempotency_key = ?').get(key).n;
  const effectCount = Math.round((before - after) / (amount * 100));

  state.idempotency = {
    key,
    repeats,
    createdTransfers: created,
    duplicateEffects: Math.max(0, created - 1),
    conflicts: results.filter((s) => s === 409).length,
    statuses: results.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {}),
    balanceBefore: before / 100,
    balanceAfter: after / 100,
    effectCount,
    singleEffect: effectCount === 1,
  };
}

function applyFault(state) {
  const c = state.config;
  if (state.fault === 'latency') {
    chaos.setLatency({ ms: c.latencyMs, jitterMs: c.jitterMs });
    state.faultTimeline.push({ atMs: 0, action: 'apply', latencyMs: c.latencyMs });
  } else if (state.fault === 'outage' || state.fault === 'recovery') {
    chaos.setFailure({ rate: c.failureRate ?? 1, status: 503 });
    state.faultTimeline.push({ atMs: 0, action: 'apply', failureRate: c.failureRate ?? 1 });
  }
}

async function runLoop(state) {
  let status = 'passed';
  let error = null;
  try {
    applyFault(state);
    if (state.scenario === 'idempotency') await runIdempotency(state);
    else await runLoad(state);
    if (state.stop) {
      status = 'cancelled';
    }
  } catch (err) {
    error = err.message;
    status = 'incomplete';
  } finally {
    if (state.recoveryTimer) clearTimeout(state.recoveryTimer);
    state.endedMs = Date.now();
    state.metrics.durationMs = state.endedMs - state.startedMs;
    restoreChaos(state.prevChaos);
  }

  const metrics = computeMetrics(state);
  if (status !== 'cancelled' && status !== 'incomplete') {
    status = evaluate(state, metrics);
    metrics.checks = state.checks;
  }
  if (state.stop && status !== 'incomplete') status = 'cancelled';

  persist(state, status, metrics, error);
  activeRuns.delete(state.id);
}

function persist(state, status, metrics, error) {
  getDb()
    .prepare(
      `UPDATE test_runs
       SET status = ?, metrics_json = ?, result = ?, error = ?, ended_at = ?, duration_ms = ?
       WHERE id = ?`
    )
    .run(
      status,
      JSON.stringify(metrics),
      status,
      error,
      new Date().toISOString(),
      metrics.durationMs,
      state.id
    );
}

function toPublic(state) {
  const live = computeMetrics(state);
  return {
    id: state.id,
    scenario: state.scenario,
    label: state.label,
    status: state.stop ? 'cancelling' : 'running',
    target: state.target,
    config: state.config,
    fault: state.fault
      ? { type: state.fault, config: state.faultConfig, timeline: state.faultTimeline }
      : null,
    thresholds: state.thresholds,
    metrics: live,
    result: null,
    startedAt: new Date(state.startedMs).toISOString(),
    endedAt: null,
    durationMs: live.durationMs,
    live: true,
  };
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    scenario: row.scenario,
    label: row.label,
    status: row.status,
    target: row.target,
    config: JSON.parse(row.config_json),
    fault: row.fault_json ? JSON.parse(row.fault_json) : null,
    thresholds: row.thresholds_json ? JSON.parse(row.thresholds_json) : null,
    metrics: row.metrics_json ? JSON.parse(row.metrics_json) : null,
    result: row.result,
    error: row.error,
    commitSha: row.commit_sha,
    createdBy: row.created_by,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    live: false,
  };
}

function start({ scenario, config: overrides, label, user }) {
  const def = scenarios.get(scenario);
  if (!def) throw badRequest(`Escenario no soportado: "${scenario}".`);
  const cfg = { ...def.defaults, ...(overrides || {}) };

  const vus = Math.min(Math.max(Number(cfg.vus) || 1, 1), config.runner.maxVus);
  const durationMs = Math.min(Math.max(Number(cfg.durationMs) || 0, 0), config.runner.maxDurationMs);
  if (def.key !== 'idempotency' && durationMs <= 0) throw badRequest('La duraciÃƒÂ³n debe ser mayor que cero.');

  const id = shortId('run');
  const now = new Date().toISOString();
  const target = `${selfBase()}${def.key === 'functional' ? '/health' : '/transfer'}`;
  const normalized = { ...cfg, vus, durationMs };
  const faultConfig = def.fault
    ? { latencyMs: cfg.latencyMs, jitterMs: cfg.jitterMs, failureRate: cfg.failureRate }
    : null;

  const state = {
    id,
    scenario: def.key,
    label: label || def.label,
    vus,
    config: normalized,
    target,
    thresholds: { ...(def.thresholds || {}), ...(cfg.thresholds || {}) },
    fault: def.fault || null,
    faultConfig,
    faultTimeline: [],
    startedMs: Date.now(),
    stop: false,
    metrics: { total: 0, errors: 0, statusCounts: {}, latencies: [], durationMs: 0 },
    timeline: new Map(),
    prevChaos: chaos.getState(),
    checks: [],
  };

  getDb()
    .prepare(
      `INSERT INTO test_runs
       (id, scenario, label, status, target, config_json, fault_json, thresholds_json, commit_sha, created_by, started_at)
       VALUES (?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      def.key,
      state.label,
      target,
      JSON.stringify(normalized),
      faultConfig ? JSON.stringify({ type: def.fault, config: faultConfig, timeline: [] }) : null,
      JSON.stringify(state.thresholds),
      config.commitSha,
      user ? user.email : null,
      now
    );

  activeRuns.set(id, state);
  runLoop(state);
  return toPublic(state);
}

function cancel(id) {
  const state = activeRuns.get(id);
  if (!state) throw conflict('La ejecuciÃƒÂ³n no estÃƒÂ¡ activa o ya finalizÃƒÂ³.');
  state.stop = true;
  return toPublic(state);
}

function getRun(id) {
  const state = activeRuns.get(id);
  if (state) return toPublic(state);
  const row = getDb().prepare('SELECT * FROM test_runs WHERE id = ?').get(id);
  if (!row) throw notFound(`EjecuciÃƒÂ³n "${id}" no encontrada.`);
  return fromRow(row);
}

function listRuns({ scenario, status, limit = 50 } = {}) {
  const clauses = [];
  const params = [];
  if (scenario) {
    clauses.push('scenario = ?');
    params.push(scenario);
  }
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(`SELECT * FROM test_runs ${where} ORDER BY started_at DESC LIMIT ?`)
    .all(...params, Math.min(Math.max(Number(limit) || 50, 1), 200));
  return rows.map(fromRow);
}

function activeList() {
  return [...activeRuns.values()].map(toPublic);
}

module.exports = { start, cancel, getRun, listRuns, activeList, activeRuns };
