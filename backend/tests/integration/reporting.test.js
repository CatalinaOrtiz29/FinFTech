'use strict';

/**
 * Pruebas de los endpoints de observabilidad y reporte: metricas, estado de los
 * servicios, configuracion persistente, historial y exportacion CSV/JSON.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const { connect, close } = require('../../src/db');
const { ensureSeed } = require('../../src/services/seed');
const { createApp } = require('../../src/app');
const runner = require('../../src/services/runner');
const config = require('../../src/config');

let server;
let base;

async function call(method, path, { body, headers } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

before(async () => {
  connect();
  ensureSeed();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  close();
  temp.cleanup();
});

test('GET /api/metrics devuelve contadores y percentiles coherentes', async () => {
  const res = await call('GET', '/api/metrics');
  assert.equal(res.status, 200);
  assert.ok(res.data.requests && typeof res.data.requests.total === 'number');
  assert.ok(res.data.latency && typeof res.data.latency.p95 === 'number');
  assert.ok(res.data.throughput && typeof res.data.throughput.rps === 'number');
  assert.ok(res.data.uptimeSeconds >= 0);
});

test('GET /api/services informa del estado real de la API y de Docker', async () => {
  const res = await call('GET', '/api/services');
  assert.equal(res.status, 200);
  const s = res.data.services;
  const byName = (name) => s.find((x) => x.name === name);
  assert.ok(byName('api'));
  assert.equal(byName('api').status, 'ok');
  assert.equal(byName('database').status, 'ok');
  assert.ok(byName('toxiproxy'));
  assert.ok(byName('k6'));
});

test('GET/PUT /api/settings lee los valores por defecto y persiste los permitidos', async () => {
  const get = await call('GET', '/api/settings');
  assert.equal(get.status, 200);
  assert.equal(get.data.settings.defaultScenario, 'load');
  assert.deepEqual(get.data.supportedKeys.sort(), ['autoResetChaosMs', 'defaultScenario', 'historyLimit']);

  const put = await call('PUT', '/api/settings', { body: { defaultScenario: 'concurrency', historyLimit: '10' } });
  assert.equal(put.status, 200);
  assert.equal(put.data.settings.defaultScenario, 'concurrency');
  assert.equal(put.data.settings.historyLimit, '10');

  const rechazado = await call('PUT', '/api/settings', { body: { claveInventada: 'x' } });
  assert.equal(rechazado.status, 200); // se ignora la clave no soportada
  assert.equal(rechazado.data.settings.claveInventada, undefined);
});

test('GET /api/history filtra por escenario y estado', async () => {
  const r = await runner.start({ scenario: 'load', config: { vus: 1, durationMs: 300, rampUpMs: 0, thinkTimeMs: 0 } });
  // esperar a que termine
  let run = runner.getRun(r.id);
  while (run.live) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    run = runner.getRun(r.id);
  }

  const all = await call('GET', '/api/history');
  assert.equal(all.status, 200);
  assert.ok(all.data.count >= 1);

  const porEscenario = await call('GET', '/api/history?scenario=load');
  assert.equal(porEscenario.status, 200);
  assert.ok(porEscenario.data.runs.every((x) => x.scenario === 'load'));

  const porEstado = await call('GET', '/api/history?status=passed');
  assert.equal(porEstado.status, 200);
  assert.ok(porEstado.data.runs.every((x) => x.status === 'passed'));
});

test('GET /api/runs/:id/report.csv devuelve CSV con cabecera y la ejecucion', async () => {
  const r = await runner.start({ scenario: 'load', config: { vus: 1, durationMs: 300, rampUpMs: 0, thinkTimeMs: 0 } });
  let run = runner.getRun(r.id);
  while (run.live) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    run = runner.getRun(r.id);
  }

  const res = await fetch(`${base}/api/runs/${run.id}/report.csv`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/csv/);
  const csv = await res.text();
  const lines = csv.trim().split(/\r?\n/);
  assert.ok(lines.length >= 2, 'cabecera + al menos una fila');
  assert.match(lines[0], /^id,scenario,label,status,result,/);
  assert.ok(lines[1].startsWith(run.id + ','));

  const json = await fetch(`${base}/api/runs/${run.id}/report.json`);
  assert.equal(json.status, 200);
  const j = await json.json();
  assert.equal(j.product, 'FinFTech');
  assert.equal(j.run.id, run.id);
});

test('GET /api/summary agrega ejecuciones recientes', async () => {
  const res = await call('GET', '/api/summary');
  assert.equal(res.status, 200);
  assert.ok(typeof res.data.totalRuns === 'number');
  assert.ok(Array.isArray(res.data.latest));
});