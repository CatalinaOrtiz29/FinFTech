'use strict';

const config = require('../config');

/**
 * Registro de mÃƒÂ©tricas en memoria de la API.
 * Guarda contadores por estado/ruta, muestras de latencia y buckets por segundo.
 */
class MetricsRegistry {
  constructor() {
    this.reset();
  }

  reset() {
    this.startedAt = Date.now();
    this.total = 0;
    this.errors = 0;
    this.byStatus = new Map();
    this.byRoute = new Map();
    this.samples = [];
    this.maxSamples = 10000;
    this.buckets = new Map();
  }

  observe({ route, status, durationMs, method }) {
    this.total += 1;
    if (status >= 500) this.errors += 1;

    const statusKey = String(status);
    this.byStatus.set(statusKey, (this.byStatus.get(statusKey) || 0) + 1);

    const routeKey = `${method} ${route}`;
    const r = this.byRoute.get(routeKey) || { count: 0, errors: 0, totalMs: 0 };
    r.count += 1;
    if (status >= 500) r.errors += 1;
    r.totalMs += durationMs;
    this.byRoute.set(routeKey, r);

    this.samples.push(durationMs);
    if (this.samples.length > this.maxSamples) this.samples.shift();

    const sec = Math.floor(Date.now() / 1000);
    const b = this.buckets.get(sec) || { count: 0, errors: 0 };
    b.count += 1;
    if (status >= 500) b.errors += 1;
    this.buckets.set(sec, b);

    // Purga buckets fuera de la ventana.
    const cutoff = sec - config.metricsWindowSeconds - 5;
    for (const key of this.buckets.keys()) {
      if (key < cutoff) this.buckets.delete(key);
    }
  }

  static percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
  }

  latencyStats() {
    if (this.samples.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      count: sorted.length,
      avg: round(sum / sorted.length),
      min: round(sorted[0]),
      max: round(sorted[sorted.length - 1]),
      p50: round(MetricsRegistry.percentile(sorted, 50)),
      p90: round(MetricsRegistry.percentile(sorted, 90)),
      p95: round(MetricsRegistry.percentile(sorted, 95)),
      p99: round(MetricsRegistry.percentile(sorted, 99)),
    };
  }

  throughput(windowSeconds = 10) {
    const nowSec = Math.floor(Date.now() / 1000);
    const from = nowSec - windowSeconds + 1;
    let count = 0;
    let errors = 0;
    for (let s = from; s <= nowSec; s += 1) {
      const b = this.buckets.get(s);
      if (b) {
        count += b.count;
        errors += b.errors;
      }
    }
    return {
      windowSeconds,
      requests: count,
      errors,
      rps: round(count / windowSeconds, 2),
    };
  }

  snapshot() {
    return {
      uptimeSeconds: round((Date.now() - this.startedAt) / 1000, 1),
      requests: {
        total: this.total,
        errors: this.errors,
        errorRate: this.total ? round((this.errors / this.total) * 100, 3) : 0,
        byStatus: Object.fromEntries(this.byStatus),
        byRoute: Object.fromEntries(
          [...this.byRoute.entries()].map(([k, v]) => [
            k,
            { count: v.count, errors: v.errors, avgMs: v.count ? round(v.totalMs / v.count) : 0 },
          ])
        ),
      },
      latency: this.latencyStats(),
      throughput: this.throughput(),
    };
  }
}

function round(n, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

module.exports = new MetricsRegistry();
module.exports.round = round;
