'use strict';

const { verify } = require('../lib/auth');
const { unauthorized } = require('../lib/errors');

/** Extrae y valida el token Bearer. Rellena req.user o lanza 401. */
function requireAuth(req, _res, next) {
  const header = req.get('Authorization') || '';
  const [, token] = header.split(' ');
  const payload = token ? verify(token) : null;
  if (!payload) return next(unauthorized('Token ausente o invÃƒÂ¡lido.'));
  req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  return next();
}

/** AutenticaciÃƒÂ³n opcional: si hay token vÃƒÂ¡lido lo adjunta, si no continÃƒÂºa. */
function optionalAuth(req, _res, next) {
  const header = req.get('Authorization') || '';
  const [, token] = header.split(' ');
  const payload = token ? verify(token) : null;
  if (payload) req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  return next();
}

module.exports = { requireAuth, optionalAuth };
