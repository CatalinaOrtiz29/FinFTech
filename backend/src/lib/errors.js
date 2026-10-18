'use strict';

/**
 * Error de aplicaciÃƒÂ³n con cÃƒÂ³digo HTTP asociado.
 * Centraliza el tratamiento uniforme de errores de la API.
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}

const badRequest = (message, details) => new AppError(400, 'bad_request', message, details);
const unauthorized = (message) => new AppError(401, 'unauthorized', message || 'No autorizado');
const forbidden = (message) => new AppError(403, 'forbidden', message || 'Acceso denegado');
const notFound = (message) => new AppError(404, 'not_found', message || 'Recurso no encontrado');
const conflict = (message, details) => new AppError(409, 'conflict', message, details);
const unprocessable = (message, details) => new AppError(422, 'unprocessable_entity', message, details);
const serviceUnavailable = (message) => new AppError(503, 'service_unavailable', message, 'Servicio temporalmente no disponible');

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serviceUnavailable,
};
