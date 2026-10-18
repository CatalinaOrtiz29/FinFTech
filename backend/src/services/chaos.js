'use strict';

/**
 * InyecciÃƒÂ³n de fallos a nivel de aplicaciÃƒÂ³n.
 *
 * Esta es la alternativa ejecutable (sin Docker) a la inyecciÃƒÂ³n a nivel de red de
 * Toxiproxy. Aplica latencia artificial y fallos controlados a las rutas de negocio
 * para poder medir el comportamiento y la recuperaciÃƒÂ³n del servicio desde el propio
 * laboratorio. En un entorno con Docker, Toxiproxy actÃƒÂºa ademÃƒÂ¡s a nivel de red.
 */

const state = {
  enabled: false,
  latency: { enabled: false, ms: 0, jitterMs: 0 },
  failure: { enabled: false, rate: 0, status: 503 },
  updatedAt: new Date().toISOString(),
};

// Rutas afectadas por la inyecciÃƒÂ³n (plano de datos, no de control).
const AFFECTED = [/^\/health$/, /^\/transfer$/, /^\/api\/wallet\//, /^\/api\/accounts/];

function isAffected(pathname) {
  return AFFECTED.some((re) => re.test(pathname));
}

function touch() {
  state.updatedAt = new Date().toISOString();
}

function getState() {
  return JSON.parse(JSON.stringify(state));
}

function setLatency({ ms, jitterMs = 0 }) {
  state.latency = { enabled: Number(ms) > 0, ms: Math.max(0, Number(ms) || 0), jitterMs: Math.max(0, Number(jitterMs) || 0) };
  state.enabled = state.latency.enabled || state.failure.enabled;
  touch();
  return getState();
}

function setFailure({ rate = 1, status = 503 }) {
  const r = Math.min(1, Math.max(0, Number(rate)));
  state.failure = { enabled: r > 0, rate: r, status: Number(status) || 503 };
  state.enabled = state.latency.enabled || state.failure.enabled;
  touch();
  return getState();
}

function reset() {
  state.enabled = false;
  state.latency = { enabled: false, ms: 0, jitterMs: 0 };
  state.failure = { enabled: false, rate: 0, status: 503 };
  touch();
  return getState();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Middleware de Express que aplica la inyecciÃƒÂ³n configurada. */
function middleware() {
  return async function chaos(req, res, next) {
    if (!state.enabled || !isAffected(req.path)) return next();

    if (state.latency.enabled) {
      const jitter = state.latency.jitterMs ? Math.random() * state.latency.jitterMs : 0;
      await sleep(state.latency.ms + jitter);
    }

    if (state.failure.enabled && Math.random() < state.failure.rate) {
      res.set('X-FinFTech-Fault', 'injected');
      return res.status(state.failure.status).json({
        error: 'injected_fault',
        code: 'injected_fault',
        message: 'Fallo inyectado por el laboratorio de resiliencia de FinFTech.',
      });
    }

    return next();
  };
}

module.exports = { middleware, getState, setLatency, setFailure, reset };
