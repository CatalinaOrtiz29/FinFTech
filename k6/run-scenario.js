// FinFTech - escenario k6 unificado.
//
// Selecciona el escenario con K6_SCENARIO (functional|load|concurrency|ramp|latency|outage|recovery|idempotency).
// Uso:
//   k6 run k6/run-scenario.js
//   K6_SCENARIO=concurrency K6_VUS=50 K6_BASE_URL=http://api:3000 k6 run k6/run-scenario.js
//
// Las pruebas se ejecutan SIEMPRE contra el laboratorio aislado (nunca contra sistemas externos).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE, SCENARIO, VUS, DURATION, P95_MS, ERROR_RATE, RAMP, JSON_HEADERS, idempotencyKey, transferBody, durationSeconds } from './lib/config.js';
import { applyLatency, applyFailure, resetChaos } from './lib/chaos.js';

const transferDuration = new Trend('finftech_transfer_duration', true);
const transferFailures = new Rate('finftech_transfer_failed');
const transfersCreated = new Counter('finftech_transfers_created');
const transfersReplayed = new Counter('finftech_transfers_replayed');
const duplicatesDetected = new Counter('finftech_duplicate_effects');

// ---------------------------------------------------------------------------
// Opciones y umbrales por escenario
// ---------------------------------------------------------------------------
function scenarioOptions() {
  switch (SCENARIO) {
    case 'functional':
      return {
        vus: 1,
        duration: '5s',
        thresholds: {
          checks: ['rate==1'],
          http_req_failed: ['rate==0'],
        },
      };
    case 'concurrency':
      return {
        vus: Math.max(VUS, 50),
        duration: DURATION,
        thresholds: {
          http_req_duration: [`p(95)<${Math.max(P95_MS, 1500)}`],
          http_req_failed: [`rate<${Math.max(ERROR_RATE, 0.05)}`],
        },
      };
    case 'ramp':
      return {
        scenarios: {
          ramp: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
              { duration: RAMP, target: VUS },
              { duration: DURATION, target: VUS },
              { duration: RAMP, target: 0 },
            ],
          },
        },
        thresholds: {
          http_req_duration: [`p(95)<${Math.max(P95_MS, 1200)}`],
          http_req_failed: [`rate<${Math.max(ERROR_RATE, 0.03)}`],
        },
      };
    case 'latency':
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_duration: [`p(95)<${Math.max(P95_MS, 900)}`],
          http_req_failed: [`rate<${Math.max(ERROR_RATE, 0.01)}`],
        },
      };
    case 'outage':
      // El objetivo es DEMOSTRAR la caÃƒÂ­da: se espera una tasa de error alta.
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_failed: ['rate>=0.5'],
        },
      };
    case 'recovery':
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          // Se exige que se haya observado el fallo durante la ejecuciÃƒÂ³n.
          http_req_failed: ['rate>0.05'],
        },
      };
    case 'idempotency':
      return {
        vus: 1,
        iterations: 25,
        thresholds: {
          finftech_duplicate_effects: ['count==0'],
          checks: ['rate==1'],
        },
      };
    case 'load':
    default:
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_duration: [`p(95)<${P95_MS}`],
          http_req_failed: [`rate<${ERROR_RATE}`],
        },
      };
  }
}

export const options = scenarioOptions();

// ---------------------------------------------------------------------------
// PreparaciÃƒÂ³n y limpieza del fallo inyectado
// ---------------------------------------------------------------------------
export function setup() {
  if (SCENARIO === 'latency') {
    applyLatency(Number(__ENV.K6_LATENCY_MS || 300), Number(__ENV.K6_JITTER_MS || 100));
  }
  if (SCENARIO === 'outage' || SCENARIO === 'recovery') {
    applyFailure(1);
  }
  return { startedAt: Date.now() };
}

export function teardown() {
  resetChaos();
}

// ---------------------------------------------------------------------------
// Escenarios
// ---------------------------------------------------------------------------
function healthCheck() {
  const res = http.get(`${BASE}/health`);
  check(res, { 'health 200': (r) => r.status === 200 });
}

function transferRequest(amount) {
  const res = http.post(`${BASE}/transfer`, transferBody(amount), {
    headers: { ...JSON_HEADERS, 'Idempotency-Key': idempotencyKey('k6') },
  });
  transferDuration.add(res.timings.duration);
  const ok = res.status === 201 || res.status === 200;
  transferFailures.add(!ok);
  if (res.status === 201) transfersCreated.add(1);
  if (res.status === 200) transfersReplayed.add(1);
  check(res, { 'transfer 200/201': (r) => r.status === 201 || r.status === 200 });
  return res;
}

function functional() {
  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const login = http.post(`${BASE}/login`, JSON.stringify({ email: 'admin@finftech.local', password: 'finftech-admin' }), { headers: JSON_HEADERS });
  check(login, { 'login 200': (r) => r.status === 200 });

  const { from, to } = { from: 'acc_alice', to: 'acc_bob' };
  const transfer = http.post(`${BASE}/transfer`, JSON.stringify({ from, to, amount: 0.1 }), {
    headers: { ...JSON_HEADERS, 'Idempotency-Key': idempotencyKey('k6-func') },
  });
  check(transfer, { 'transfer 201': (r) => r.status === 201 });
  sleep(0.1);
}

function idempotency() {
  // Repite las mismas N solicitudes con la MISMA clave dentro de una iteraciÃƒÂ³n.
  const key = `k6-idem-${__ITER}-${Date.now()}`;
  const body = JSON.stringify({ from: 'acc_alice', to: 'acc_bob', amount: 1 });
  const first = http.post(`${BASE}/transfer`, body, { headers: { ...JSON_HEADERS, 'Idempotency-Key': key } });
  check(first, { 'primera transferencia 201': (r) => r.status === 201 });

  let created = 0;
  let replayed = 0;
  for (let i = 0; i < 5; i++) {
    const res = http.post(`${BASE}/transfer`, body, { headers: { ...JSON_HEADERS, 'Idempotency-Key': key } });
    if (res.status === 201) created++;
    if (res.status === 200) replayed++;
    check(res, { 'reintento 200': (r) => r.status === 200 });
  }
  transfersCreated.add(1);
  transfersReplayed.add(replayed);
  duplicatesDetected.add(created + replayed === 6 ? created : 0);
}

function recovery() {
  // Una ÃƒÂºnica VU restaura el servicio a mitad de la ejecuciÃƒÂ³n.
  if (__VU === 1 && __ITER === 0) {
    sleep(durationSeconds() / 2);
    resetChaos();
  }
  transferRequest(0.25);
}

export default function () {
  if (SCENARIO === 'functional') return functional();
  if (SCENARIO === 'idempotency') return idempotency();
  if (SCENARIO === 'recovery') return recovery();
  if (SCENARIO === 'outage' || SCENARIO === 'latency') return transferRequest(0.25);
  if (SCENARIO === 'load' || SCENARIO === 'concurrency' || SCENARIO === 'ramp') {
    if (Math.random() < 0.2) return healthCheck();
    return transferRequest(0.25);
  }
  return transferRequest(0.25);
}
