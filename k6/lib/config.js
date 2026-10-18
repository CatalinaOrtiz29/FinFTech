// FinFTech - configuraciÃƒÂ³n compartida de las pruebas k6
// Se sobreescribe mediante variables de entorno (ver .env.example).

export const BASE = (__ENV.K6_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const SCENARIO = __ENV.K6_SCENARIO || 'load';
// IMPORTANTE: no usar los nombres K6_VUS / K6_DURATION.
// k6 los interpreta como opciones globales y sobrescriben las opciones por
// escenario declaradas en run-scenario.js (p. ej. idempotency usa vus:1 y
// iterations:25). Por eso aqui se usan nombres propios del proyecto.
export const VUS = Number(__ENV.K6_LOAD_VUS || 10);
export const DURATION = __ENV.K6_LOAD_DURATION || '15s';
export const P95_MS = Number(__ENV.K6_P95_MS || 800);
export const ERROR_RATE = Number(__ENV.K6_ERROR_RATE || 0.01);
export const RAMP = __ENV.K6_RAMP || '10s';

// Cuentas de demostraciÃƒÂ³n sembradas por la API.
export const ACCOUNTS = ['acc_alice', 'acc_bob', 'acc_carol', 'acc_dave'];

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function idempotencyKey(prefix) {
  return `${prefix}-${__VU}-${__ITER}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function randomAccounts() {
  const from = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];
  let to = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];
  if (to === from) to = ACCOUNTS[(ACCOUNTS.indexOf(from) + 1) % ACCOUNTS.length];
  return { from, to };
}

export function transferBody(amount) {
  const { from, to } = randomAccounts();
  return JSON.stringify({ from, to, amount: amount || 0.5 });
}

// Duraciones en segundos para escenarios con temporizador.
export function durationSeconds() {
  const m = String(DURATION).match(/^(\d+)(s|m)?$/);
  if (!m) return 15;
  const value = Number(m[1]);
  return m[2] === 'm' ? value * 60 : value;
}
