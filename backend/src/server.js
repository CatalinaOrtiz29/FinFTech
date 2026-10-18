'use strict';

const config = require('./config');
const { connect, close } = require('./db');
const { ensureSeed } = require('./services/seed');
const { createApp } = require('./app');
const logger = require('./lib/logger');

function main() {
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

module.exports = { main };
