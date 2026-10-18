'use strict';

const { uuid } = require('../lib/ids');
const metrics = require('../lib/metrics');
const logger = require('../lib/logger');

/**
 * Asigna un identificador de correlaciÃƒÂ³n a cada peticiÃƒÂ³n, mide su latencia,
 * alimenta el registro de mÃƒÂ©tricas y emite un log estructurado sin datos sensibles.
 */
module.exports = function requestContext() {
  return function (req, res, next) {
    req.id = req.get('X-Request-Id') || uuid();
    res.set('X-Request-Id', req.id);
    const started = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      const route = req.route ? req.baseUrl + req.route.path : req.path;
      metrics.observe({ route, method: req.method, status: res.statusCode, durationMs });
      logger.info('request', {
        id: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
};
