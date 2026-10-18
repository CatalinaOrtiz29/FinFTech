'use strict';

const express = require('express');
const cors = require('cors');

const config = require('./config');
const requestContext = require('./middleware/requestContext');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const chaos = require('./services/chaos');
const users = require('./services/users');
const walletRoutes = require('./routes/wallet');
const { issueToken } = require('./lib/auth');
const { unauthorized, badRequest } = require('./lib/errors');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const runsRoutes = require('./routes/runs');
const metricsRoutes = require('./routes/metrics');
const chaosRoutes = require('./routes/chaos');
const settingsRoutes = require('./routes/settings');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'X-FinFTech-Fault'],
    })
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(requestContext());
  app.use(chaos.middleware());

  // RaÃƒÂ­z: metadatos del servicio.
  app.get('/', (req, res) => {
    res.json({
      product: 'FinFTech',
      description: 'Load & Resilience Lab para una API de billetera digital',
      version: config.version,
      commit: config.commitSha,
      docs: '/api',
    });
  });

  // Ãƒndice de endpoints.
  app.get('/api', (req, res) => {
    res.json({
      endpoints: [
        'GET /health',
        'POST /login',
        'POST /transfer (Idempotency-Key)',
        'GET /api/accounts',
        'GET /api/transfers',
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET /api/auth/me',
        'GET /api/scenarios',
        'POST /api/runs',
        'GET /api/runs',
        'GET /api/runs/active',
        'GET /api/runs/:id',
        'POST /api/runs/:id/cancel',
        'GET /api/runs/:id/report.json',
        'GET /api/runs/:id/report.csv',
        'GET /api/history',
        'GET /api/history/export.csv',
        'GET /api/summary',
        'GET /api/metrics',
        'GET /api/services',
        'GET /api/chaos',
        'POST /api/chaos/latency',
        'POST /api/chaos/failure',
        'POST /api/chaos/reset',
        'GET /api/settings',
      ],
    });
  });

  // Rutas de nivel raÃƒÂ­z (contratos reportados: /health, /login, /transfer).
  app.use('/', healthRoutes);
  app.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw badRequest('"email" y "password" son obligatorios.');
    const user = users.authenticate(email, password);
    if (!user) throw unauthorized('Credenciales invÃƒÂ¡lidas.');
    res.json({ token: issueToken(user), user: users.toPublic(user) });
  });
  app.post('/transfer', walletRoutes.handleTransfer);

  // API versionada.
  app.use('/api/auth', authRoutes);
  app.use('/api', walletRoutes);
  app.use('/api', runsRoutes);
  app.use('/api', metricsRoutes);
  app.use('/api/chaos', chaosRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
