'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Prepara una base de datos temporal y aislada antes de cargar los mÃƒÂ³dulos de la API.
 * Debe importarse ANTES que cualquier mÃƒÂ³dulo que lea la configuraciÃƒÂ³n.
 */
function useTempDatabase() {
  const file = path.join(os.tmpdir(), `finftech-test-${process.pid}-${Date.now()}.db`);
  process.env.DB_PATH = file;
  process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || 'test-secret';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
  return {
    file,
    cleanup() {
      for (const suffix of ['', '-shm', '-wal']) {
        try {
          fs.unlinkSync(file + suffix);
        } catch (_) {
          /* noop */
        }
      }
    },
  };
}

module.exports = { useTempDatabase };
