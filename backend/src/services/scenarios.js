'use strict';

/**
 * CatÃƒÂ¡logo de escenarios soportados. Los valores por defecto y los umbrales son
 * configurables desde la peticiÃƒÂ³n; aquÃƒÂ­ se documentan los valores base del laboratorio.
 */

const SCENARIOS = {
  functional: {
    key: 'functional',
    label: 'Prueba funcional',
    description: 'Verifica /health, /login y /transfer con baja carga y comprobaciones correctas.',
    defaults: { vus: 1, durationMs: 3000, rampUpMs: 0, thinkTimeMs: 100 },
    thresholds: { p95Ms: 500, errorRatePct: 0, minRps: 0 },
  },
  load: {
    key: 'load',
    label: 'Carga normal',
    description: 'Carga sostenida de usuarios concurrentes contra la API de billetera.',
    defaults: { vus: 10, durationMs: 15000, rampUpMs: 2000, thinkTimeMs: 50 },
    thresholds: { p95Ms: 800, errorRatePct: 1, minRps: 5 },
  },
  concurrency: {
    key: 'concurrency',
    label: 'Concurrencia elevada',
    description: 'Muchos usuarios realizando transferencias al mismo tiempo sobre las mismas cuentas.',
    defaults: { vus: 50, durationMs: 12000, rampUpMs: 0, thinkTimeMs: 0 },
    thresholds: { p95Ms: 1500, errorRatePct: 5, minRps: 10 },
  },
  ramp: {
    key: 'ramp',
    label: 'Incremento gradual (ramp-up)',
    description: 'Incrementa progresivamente los usuarios virtuales hasta el mÃƒÂ¡ximo configurado.',
    defaults: { vus: 40, durationMs: 20000, rampUpMs: 10000, thinkTimeMs: 20 },
    thresholds: { p95Ms: 1200, errorRatePct: 3, minRps: 8 },
  },
  latency: {
    key: 'latency',
    label: 'Latencia artificial',
    description: 'Inyecta latencia en el plano de datos y mide su impacto en P95/P99.',
    defaults: { vus: 10, durationMs: 12000, rampUpMs: 0, thinkTimeMs: 0, latencyMs: 300, jitterMs: 100 },
    thresholds: { p95Ms: 900, errorRatePct: 1, minRps: 1 },
    fault: 'latency',
  },
  outage: {
    key: 'outage',
    label: 'InterrupciÃƒÂ³n de conectividad',
    description: 'Simula la caÃƒÂ­da del servicio durante la ejecuciÃƒÂ³n y registra los errores observados.',
    defaults: { vus: 10, durationMs: 12000, rampUpMs: 0, thinkTimeMs: 0, failureRate: 1 },
    thresholds: { p95Ms: 2000, errorRatePct: 100, minRps: 0 },
    fault: 'outage',
  },
  recovery: {
    key: 'recovery',
    label: 'RecuperaciÃƒÂ³n tras fallo',
    description: 'Aplica un fallo en la primera mitad y lo retira para medir la recuperaciÃƒÂ³n del servicio.',
    defaults: { vus: 10, durationMs: 16000, rampUpMs: 0, thinkTimeMs: 0, failureRate: 1 },
    thresholds: { p95Ms: 1000, errorRatePct: 60, minRps: 1 },
    fault: 'recovery',
  },
  idempotency: {
    key: 'idempotency',
    label: 'Reintentos e idempotencia',
    description: 'Repite la misma transferencia con la misma clave de idempotencia y verifica que el efecto ocurra una sola vez.',
    defaults: { vus: 1, durationMs: 0, repeats: 25, rampUpMs: 0, thinkTimeMs: 0 },
    thresholds: { duplicateEffects: 0, conflicts: 0 },
  },
};

function list() {
  return Object.values(SCENARIOS).map((s) => ({
    key: s.key,
    label: s.label,
    description: s.description,
    defaults: s.defaults,
    thresholds: s.thresholds,
    fault: s.fault || null,
  }));
}

function get(key) {
  return SCENARIOS[key] || null;
}

module.exports = { list, get, SCENARIOS };
