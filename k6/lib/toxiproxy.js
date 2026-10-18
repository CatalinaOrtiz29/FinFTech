// FinFTech - helpers para inyectar fallos de red con Toxiproxy.
// Deben ejecutarse desde dentro de la red Docker (o con el puerto 8474 accesible).
import http from 'k6/http';

const ADMIN = (__ENV.TOXIPROXY_ADMIN || 'http://toxiproxy:8474').replace(/\/$/, '');
const PROXY = __ENV.TOXIPROXY_PROXY || 'finftech_api';

export function listProxies() {
  return http.get(`${ADMIN}/proxies`);
}

export function addLatency(latencyMs, jitterMs) {
  const body = JSON.stringify({ name: 'latency', type: 'latency', attributes: { latency: latencyMs, jitter: jitterMs || 0 } });
  return http.post(`${ADMIN}/proxies/${PROXY}/toxics`, body, { headers: { 'Content-Type': 'application/json' } });
}

export function addBandwidthLimit(rateKb) {
  const body = JSON.stringify({ name: 'bandwidth', type: 'bandwidth', attributes: { rate: rateKb } });
  return http.post(`${ADMIN}/proxies/${PROXY}/toxics`, body, { headers: { 'Content-Type': 'application/json' } });
}

export function disableProxy() {
  return http.post(`${ADMIN}/proxies/${PROXY}`, JSON.stringify({ enabled: false }), { headers: { 'Content-Type': 'application/json' } });
}

export function enableProxy() {
  return http.post(`${ADMIN}/proxies/${PROXY}`, JSON.stringify({ enabled: true }), { headers: { 'Content-Type': 'application/json' } });
}

export function clearToxics() {
  const res = http.get(`${ADMIN}/proxies/${PROXY}/toxics`);
  try {
    const toxics = res.json();
    for (const t of toxics) {
      http.del(`${ADMIN}/proxies/${PROXY}/toxics/${t.name}`);
    }
  } catch (e) {
    // sin toxics activos
  }
}
