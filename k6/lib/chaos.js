// FinFTech - inyecciÃƒÂ³n de fallos a nivel de aplicaciÃƒÂ³n desde k6.
// Permite reproducir los escenarios de latencia e interrupciÃƒÂ³n incluso cuando
// Toxiproxy (nivel de red) no estÃƒÂ¡ disponible.
import http from 'k6/http';
import { BASE, JSON_HEADERS } from './config.js';

export function applyLatency(ms, jitterMs) {
  return http.post(`${BASE}/api/chaos/latency`, JSON.stringify({ ms, jitterMs: jitterMs || 0 }), { headers: JSON_HEADERS });
}

export function applyFailure(rate) {
  return http.post(`${BASE}/api/chaos/failure`, JSON.stringify({ rate }), { headers: JSON_HEADERS });
}

export function resetChaos() {
  return http.post(`${BASE}/api/chaos/reset`, null, { headers: JSON_HEADERS });
}
