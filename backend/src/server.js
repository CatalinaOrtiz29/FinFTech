'use strict';

const config = require('./config');
const { connect, close } = require('./db');
const { ensureSeed } = require('./services/seed');
const { createApp } = require('./app');
const logger = require('./lib/logger');

/**
 * Comprueba la configuraciÃƒÂ³n de seguridad. Lanza un error si, en producciÃƒÂ³n,
 * TOKEN_SECRET es un valor de ejemplo (con un secreto conocido cualquiera podrÃƒÂ­a
 * firmar tokens vÃƒÂ¡lidos). Los entornos de desarrollo/pruebas solo registran un
 * aviso y existe una salida explÃƒÂ­cita (ALLOW_INSECURE_DEFAULTS=1).
 */
function assertSafeConfiguration() {
  if (!config.insecureTokenSecret) return;
  if (config.env !== 'production') {
    logger.warn('insecure_token_secret', { reason: 'valor de ejemplo o demasiado corto', env: config.env });
    return;
  }
  if (config.allowInsecureDefaults) {
    logger.warn('insecure_token_secret_allowed', { reason: 'ALLOW_INSECURE_DEFAULTS=1' });
    return;
  }
  throw new Error(
    'TOKEN_SECRET es un valor de ejemplo o tiene menos de 16 caracteres. ' +
      'Define un secreto propio (p. ej. `openssl rand -hex 32`) o acepta el riesgo con ALLOW_INSECURE_DEFAULTS=1.'
  );
}

function main() {
  try {
    assertSafeConfiguration();
  } catch (err) {
    logger.error('insecure_token_secret_in_production', { message: err.message });
    process.exit(1);
  }
  connect();
  const seeded = ensureSeed();
  if (seeded.admin || seeded.accounts) {
    logger.info('seed_applied', { adminCreated: seeded.admin, accountsCreated: seeded.accounts });
  }

  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    logger.info('server_started', {
      product: 'FinFTech',
      url: `http://localhost:${config.port}`,
      env: config.env,
      version: config.version,
      commit: config.commitSha,
    });
  });

  const shutdown = (signal) => {
    logger.info('shutting_down', { signal });
    server.close(() => {
      close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  main();
}

module.exports = { main, assertSafeConfiguration };
