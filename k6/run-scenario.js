// FinFTech - escenario k6 unificado.
//
// Selecciona el escenario con K6_SCENARIO:
//   functional | load | concurrency | ramp | latency | outage | recovery | idempotency
//   toxiproxy-baseline | toxiproxy-latency | toxiproxy-outage | toxiproxy-recovery
//
// Los escenarios con prefijo `toxiproxy-` envÃƒÂ­an el trÃƒÂ¡fico OBLIGATORIAMENTE a
// travÃƒÂ©s del proxy de red (variable K6_PROXY_URL), de modo que el fallo es un
// fallo de red real. El resto inyecta el fallo a nivel de aplicaciÃƒÂ³n (/api/chaos).
//
// Uso:
//   k6 run k6/run-scenario.js
//   K6_SCENARIO=concurrency K6_LOAD_VUS=50 K6_BASE_URL=http://api:3000 k6 run k6/run-scenario.js
//   K6_SCENARIO=toxiproxy-latency k6 run k6/run-scenario.js
//
// Las pruebas se ejecutan SIEMPRE contra el laboratorio aislado (nunca contra sistemas externos).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE, SCENARIO, VUS, DURATION, P95_MS, ERROR_RATE, RAMP, JSON_HEADERS, idempotencyKey, transferBody, durationSeconds } from './lib/config.js';
import { applyLatency, applyFailure, resetChaos } from './lib/chaos.js';
import { addLatency as addNetworkLatency, addBandwidthLimit as addNetworkBandwidth, disableProxy, enableProxy, clearToxics } from './lib/toxiproxy.js';

// Destino de las peticiones:
//  - escenarios `toxiproxy-*`: a travÃƒÂ©s del proxy de red (Toxiproxy).
//  - resto: directo contra la API.
const PROXY_BASE = (__ENV.K6_PROXY_URL || 'http://toxiproxy:8666').replace(/\/$/, '');
const TARGET = SCENARIO.indexOf('toxiproxy') === 0 ? PROXY_BASE : BASE;

function isNetworkScenario() {
  return SCENARIO.indexOf('toxiproxy') === 0;
}

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
    // ---- Fallos de RED reales mediante Toxiproxy -------------------------
    // El trÃƒÂ¡fico atraviesa el proxy; el fallo lo inyecta Toxiproxy, no la API.
    case 'toxiproxy-baseline':
      // LÃƒÂ­nea base: mismo camino (proxy) sin tÃƒÂ³xicos -> todo debe ir bien.
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_failed: ['rate==0'],
        },
      };
    case 'toxiproxy-latency':
      // Se exige que la latencia de RED aparezca en las mÃƒÂ©tricas.
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_duration: ['p(95)>200'],
          http_req_failed: ['rate==0'],
        },
      };
    case 'toxiproxy-outage':
      // Proxy deshabilitado: el trÃƒÂ¡fico de red se corta -> caÃƒÂ­da observable.
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_failed: ['rate>=0.5'],
        },
      };
    case 'toxiproxy-bandwidth':
      // Ancho de banda limitado a nivel de red: la latencia debe crecer.
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_duration: ['p(95)>50'],
        },
      };
    case 'toxiproxy-recovery':
      // Se corta el proxy y una VU lo restaura a mitad: fallo y recuperaciÃƒÂ³n.
      return {
        vus: VUS,
        duration: DURATION,
        thresholds: {
          http_req_failed: ['rate>0.02'],
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
  // Estado de red sano garantizado antes de empezar cualquier escenario de Toxiproxy.
  if (isNetworkScenario()) {
    enableProxy();
    clearToxics();
  }

  if (SCENARIO === 'latency') {
    applyLatency(Number(__ENV.K6_LATENCY_MS || 300), Number(__ENV.K6_JITTER_MS || 100));
  }
  if (SCENARIO === 'outage' || SCENARIO === 'recovery') {
    applyFailure(1);
  }

  // --- Fallos de RED (Toxiproxy) ---
  if (SCENARIO === 'toxiproxy-latency') {
    const ms = Number(__ENV.K6_TOXIPROXY_LATENCY_MS || 300);
    const jitter = Number(__ENV.K6_TOXIPROXY_JITTER_MS || 0);
    const res = addNetworkLatency(ms, jitter);
    console.log(`setup: toxic 'latency' aplicado (${ms}ms jitter ${jitter}ms) -> HTTP ${res.status}`);
  }
  if (SCENARIO === 'toxiproxy-bandwidth') {
    const rateKb = Number(__ENV.K6_TOXIPROXY_RATE_KB || 32);
    const res = addNetworkBandwidth(rateKb);
    console.log(`setup: toxic 'bandwidth' aplicado (${rateKb}KB/s) -> HTTP ${res.status}`);
  }
  if (SCENARIO === 'toxiproxy-outage' || SCENARIO === 'toxiproxy-recovery') {
    const res = disableProxy();
    console.log(`setup: proxy 'finftech_api' deshabilitado -> HTTP ${res.status}`);
  }
  return { startedAt: Date.now() };
}

export function teardown() {
  // Restaura SIEMPRE el laboratorio, aunque el escenario haya fallado.
  if (isNetworkScenario()) {
    clearToxics();
    const res = enableProxy();
    console.log(`teardown: tÃƒÂ³xicos eliminados y proxy rehabilitado -> HTTP ${res.status}`);
  }
  resetChaos();
}

// ---------------------------------------------------------------------------
// Escenarios
// ---------------------------------------------------------------------------
function healthCheck() {
  const res = http.get(`${TARGET}/health`);
  check(res, { 'health 200': (r) => r.status === 200 });
}

function transferRequest(amount) {
  const res = http.post(`${TARGET}/transfer`, transferBody(amount), {
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
  const health = http.get(`${TARGET}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const login = http.post(`${TARGET}/login`, JSON.stringify({ email: 'admin@finftech.local', password: 'finftech-admin' }), { headers: JSON_HEADERS });
  check(login, { 'login 200': (r) => r.status === 200 });

  const { from, to } = { from: 'acc_alice', to: 'acc_bob' };
  const transfer = http.post(`${TARGET}/transfer`, JSON.stringify({ from, to, amount: 0.1 }), {
    headers: { ...JSON_HEADERS, 'Idempotency-Key': idempotencyKey('k6-func') },
  });
  check(transfer, { 'transfer 201': (r) => r.status === 201 });
  sleep(0.1);
}

function idempotency() {
  // Repite las mismas N solicitudes con la MISMA clave dentro de una iteraciÃƒÂ³n.
  // Importe pequeÃƒÂ±o para que el laboratorio sea repetible sin agotar el saldo.
  const key = `k6-idem-${__ITER}-${Date.now()}`;
  const body = JSON.stringify({ from: 'acc_alice', to: 'acc_bob', amount: 0.1 });
  const first = http.post(`${TARGET}/transfer`, body, { headers: { ...JSON_HEADERS, 'Idempotency-Key': key } });
  const firstCreated = first.status === 201;
  check(first, { 'primera transferencia 201': (r) => r.status === 201 });

  let extraCreated = 0;
  let replayed = 0;
  for (let i = 0; i < 5; i++) {
    const res = http.post(`${TARGET}/transfer`, body, { headers: { ...JSON_HEADERS, 'Idempotency-Key': key } });
    if (res.status === 201) extraCreated++;
    if (res.status === 200) replayed++;
    check(res, { 'reintento 200 (replay)': (r) => r.status === 200 });
  }
  transfersCreated.add(firstCreated ? 1 : 0);
  transfersReplayed.add(replayed);
  // Efecto duplicado = un reintento creÃƒÂ³ una transferencia NUEVA (201) en vez de
  // reproducir la existente (200). Debe ser 0 en todo momento.
  duplicatesDetected.add(extraCreated);
}

function recovery() {
  // Una ÃƒÂºnica VU restaura el servicio a mitad de la ejecuciÃƒÂ³n.
  if (__VU === 1 && __ITER === 0) {
    sleep(durationSeconds() / 2);
    resetChaos();
  }
  transferRequest(0.25);
}

function toxiproxyRecovery() {
  // Una ÃƒÂºnica VU rehabilita el proxy de red a mitad del escenario.
  if (__VU === 1 && __ITER === 0) {
    sleep(durationSeconds() / 2);
    clearToxics();
    enableProxy();
  }
  transferRequest(0.25);
}

export default function () {
  if (SCENARIO === 'functional') return functional();
  if (SCENARIO === 'idempotency') return idempotency();
  if (SCENARIO === 'recovery') return recovery();
  if (SCENARIO === 'toxiproxy-recovery') return toxiproxyRecovery();
  if (SCENARIO === 'outage' || SCENARIO === 'latency') return transferRequest(0.25);
  if (SCENARIO === 'load' || SCENARIO === 'concurrency' || SCENARIO === 'ramp') {
    if (Math.random() < 0.2) return healthCheck();
    return transferRequest(0.25);
  }
  return transferRequest(0.25);
}
