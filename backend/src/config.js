'use strict';

const path = require('path');

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

const ROOT = path.resolve(__dirname, '..');
const pkg = require('../package.json');

const config = {
  env: env('NODE_ENV', 'development'),
  version: pkg.version,
  commitSha: env('APP_COMMIT', 'unknown'),
  port: Number(env('PORT', '3000')),
  host: env('HOST', '0.0.0.0'),
  dbPath: env('DB_PATH', path.join(ROOT, 'data', 'finftech.db')),
  defaultCurrency: env('DEFAULT_CURRENCY', 'USD'),

  // CORS: por defecto restringido a los orÃƒÂ­genes locales del laboratorio.
  corsOrigins: env('CORS_ORIGINS', 'http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // AutenticaciÃƒÂ³n (token HMAC propio, sin dependencias externas).
  tokenSecret: env('TOKEN_SECRET', 'finftech-dev-secret-change-me-in-env'),
  tokenTtlSeconds: Number(env('TOKEN_TTL_SECONDS', String(60 * 60 * 8))),

  // Usuario administrador sembrado ÃƒÂºnicamente si no existe.
  adminEmail: env('ADMIN_EMAIL', 'admin@finftech.local'),
  adminPassword: env('ADMIN_PASSWORD', 'finftech-admin'),
  adminName: env('ADMIN_NAME', 'FinFTech Admin'),

  logLevel: env('LOG_LEVEL', 'info'),

  // LÃƒÂ­mites del generador de carga interno (protegen el propio proceso).
  runner: {
    maxVus: Number(env('RUNNER_MAX_VUS', '100')),
    maxDurationMs: Number(env('RUNNER_MAX_DURATION_MS', String(60 * 1000))),
    requestTimeoutMs: Number(env('RUNNER_REQUEST_TIMEOUT_MS', '5000')),
  },

  metricsWindowSeconds: Number(env('METRICS_WINDOW_SECONDS', '60')),
};

module.exports = config;
