'use strict';

/**
 * Coherencia de las ejecuciones internas: las mÃƒÂ©tricas deben proceder de las
 * muestras reales de las peticiones y el estado persistido debe coincidir con el
 * resultado de los criterios (checks), que se guardan por separado.
 *
 * El ejecutor interno realiza peticiones HTTP contra la propia API, por lo que la
 * prueba levanta un servidor real en un puerto libre.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const config = require('../../src/config');
const { connect, close } = require('../../src/db');
const { ensureSeed } = require('../../src/services/seed');
const { createApp } = require('../../src/app');
const runner = require('../../src/services/runner');
const reports = require('../../src/services/reports');

let server;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForRun(id, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const run = runner.getRun(id);
    if (!run.live) return run;
    if (Date.now() > deadline) throw new Error(`la ejecuciÃƒÂ³n ${id} no terminÃƒÂ³ a tiempo`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

before(async () => {
  config.port = await freePort();
  connect();
  ensureSeed();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(config.port, '127.0.0.1', resolve);
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  close();
  temp.cleanup();
});

test('la ejecuciÃƒÂ³n de carga produce mÃƒÂ©tricas coherentes con muestras reales', async () => {
  const started = runner.start({
    scenario: 'load',
    config: { vus: 3, durationMs: 700, rampUpMs: 0, thinkTimeMs: 5 },
  });
  const run = await waitForRun(started.id);

  assert.equal(run.status, 'passed');
  assert.equal(run.result, run.status, 'el resultado persistido debe coincidir con el estado');

  const m = run.metrics;
  assert.ok(m.requests > 0, 'debe haber peticiones reales');
  assert.equal(m.requests, m.successful + m.errors);

  // Los recuentos por estado y por tiempo cubren exactamente las peticiones observadas.
  assert.equal(
    Object.values(m.statusCounts).reduce((a, b) => a + b, 0),
    m.requests
  );
  assert.equal(
    m.timeline.reduce((a, b) => a + b.requests, 0),
    m.requests
  );
  assert.equal(m.latencyMs.count, m.requests, 'una muestra de latencia por peticiÃƒÂ³n');

  // Percentiles monÃƒÂ³tonos y coherentes con el rango observado.
  assert.ok(m.latencyMs.min <= m.latencyMs.avg);
  assert.ok(m.latencyMs.avg <= m.latencyMs.p95);
  assert.ok(m.latencyMs.p50 <= m.latencyMs.p95);
  assert.ok(m.latencyMs.p95 <= m.latencyMs.p99);
  assert.ok(m.latencyMs.p99 <= m.latencyMs.max);

  assert.ok(m.rps > 0, 'el throughput debe ser positivo');
  assert.equal(m.errorRatePct, Math.round((m.errors / m.requests) * 100 * 100) / 100);

  // Carga sana: todas las transferencias se crean (201), sin errores.
  assert.deepEqual(Object.keys(m.statusCounts), ['201']);
  assert.equal(m.errors, 0);

  // Los criterios se guardan con la ejecuciÃƒÂ³n y se cumplen.
  assert.ok(Array.isArray(m.checks) && m.checks.length > 0);
  for (const c of m.checks) {
    assert.equal(typeof c.name, 'string');
    assert.equal(typeof c.ok, 'boolean');
  }
  assert.ok(m.checks.every((c) => c.ok), 'todos los criterios deben cumplirse');
});

test('la prueba funcional solo obtiene respuestas 2xx (login con credenciales reales)', async () => {
  const started = runner.start({
    scenario: 'functional',
    config: { vus: 1, durationMs: 1200, thinkTimeMs: 0 },
  });
  const run = await waitForRun(started.id);

  assert.equal(run.status, 'passed');
  const m = run.metrics;

  // /health y /login -> 200; /transfer -> 201. NingÃƒÂºn 401/422/500.
  const statuses = Object.keys(m.statusCounts).map(Number).sort();
  assert.deepEqual(statuses, [200, 201]);
  assert.equal(m.errors, 0);

  const check = m.checks.find((c) => c.name === 'all_responses_2xx');
  assert.ok(check, 'debe existir el criterio all_responses_2xx');
  assert.equal(check.ok, true);
});

test('la ejecuciÃƒÂ³n de idempotencia registra un ÃƒÂºnico efecto y ningÃƒÂºn conflicto', async () => {
  const started = runner.start({ scenario: 'idempotency', config: { repeats: 8 } });
  const run = await waitForRun(started.id);

  assert.equal(run.status, 'passed');
  const m = run.metrics;

  assert.equal(m.requests, 8);
  assert.equal(m.statusCounts[201], 1, 'solo la primera solicitud crea la transferencia');
  assert.equal(m.statusCounts[200], 7, 'los reintentos reproducen el resultado');
  assert.deepEqual(
    m.checks.map((c) => c.name),
    ['single_effect', 'no_duplicate_effects', 'no_conflicts']
  );
  assert.ok(m.checks.every((c) => c.ok));

  // Resultado exportable y reproducible (JSON del informe).
  const json = reports.exportRun(run.id);
  assert.equal(json.product, 'FinFTech');
  assert.equal(json.run.id, run.id);
  assert.equal(json.run.result, 'passed');

  // La ejecuciÃƒÂ³n completada aparece en el historial persistido.
  const history = runner.listRuns({ scenario: 'idempotency', limit: 5 });
  assert.ok(history.some((r) => r.id === run.id));
});

test('el lanzamiento de ejecuciones valida la peticiÃƒÂ³n', async () => {
  assert.throws(() => runner.start({ scenario: 'no-existe' }), /Escenario no soportado/);
  assert.throws(() => runner.start({ scenario: 'load', config: { durationMs: 0 } }), /duraciÃƒÂ³n debe ser mayor/);
  assert.throws(() => runner.cancel('run_inexistente'), /no estÃƒÂ¡ activa/);
});
