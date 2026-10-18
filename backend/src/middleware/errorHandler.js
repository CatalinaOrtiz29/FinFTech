'use strict';

const { AppError } = require('../lib/errors');
const logger = require('../lib/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', code: 'not_found', message: `Ruta no encontrada: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'bad_request', code: 'bad_request', message: 'JSON invÃƒÂ¡lido en el cuerpo de la peticiÃƒÂ³n.' });
  }

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large', code: 'payload_too_large', message: 'El cuerpo de la peticiÃƒÂ³n es demasiado grande.' });
  }

  logger.error('unhandled_error', { id: req.id, message: err && err.message, stack: err && err.stack });
  return res.status(500).json({ error: 'internal_error', code: 'internal_error', message: 'Error interno del servidor.' });
}

module.exports = { notFoundHandler, errorHandler };
