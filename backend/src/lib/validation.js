'use strict';

/**
 * ValidaciÃƒÂ³n y acotado de entradas.
 *
 * MOTIVO (defecto reproducido y medido): el validador anterior de correo
 * (`/^[^@\s]+@[^@\s]+\.[^@\s]+$/`) tenÃƒÂ­a coste **cuadrÃƒÂ¡tico** con entradas largas
 * que hacen fallar el match, porque cada "." del dominio es un punto de
 * retroceso posible. Medido sobre la API en ejecuciÃƒÂ³n:
 *
 *   1 003 caracteres -> 0,43 ms     16 003 -> 104 ms
 *   4 003            -> 6,4 ms      64 003 -> 1 676 ms
 *
 * `POST /api/auth/register` no requiere autenticaciÃƒÂ³n y acepta cuerpos de hasta
 * 256 KB, asÃƒÂ­ que una sola peticiÃƒÂ³n podÃƒÂ­a consumir decenas de segundos de CPU.
 *
 * `isEmail` es lineal (un ÃƒÂºnico recorrido, sin retroceso) y ademÃƒÂ¡s se acota la
 * longitud *antes* de validar, de modo que la validaciÃƒÂ³n nunca trabaja con
 * entradas desproporcionadas.
 */

const LIMITS = {
  email: 254, // RFC 5321 (longitud mÃƒÂ¡xima de una direcciÃƒÂ³n)
  password: 200,
  name: 120,
  accountId: 64,
  idempotencyKey: 200,
};

/** Valores de ejemplo que no deben usarse como secreto en producciÃƒÂ³n. */
const PLACEHOLDER_SECRETS = new Set([
  'finftech-dev-secret-change-me-in-env',
  'finftech-dev-secret-change-me',
  'change-me-please',
  'change-me',
  'changeme',
  'secret',
]);

function withinLimit(value, limit) {
  return String(value == null ? '' : value).length <= limit;
}

/** ValidaciÃƒÂ³n de correo en tiempo lineal: sin cuantificadores anidados ni retroceso. */
function isEmail(value) {
  const s = String(value == null ? '' : value);
  if (!s || s.length > LIMITS.email) return false;
  if (/\s/.test(s)) return false; // espacios y saltos de lÃƒÂ­nea
  const at = s.indexOf('@');
  if (at <= 0 || at !== s.lastIndexOf('@')) return false; // exactamente una "@"
  const domain = s.slice(at + 1);
  if (!domain || domain.length > 253) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return domain.includes('.'); // debe existir un dominio con punto
}

/** Ã‚Â¿El secreto es un valor de ejemplo o demasiado corto para producciÃƒÂ³n? */
function isWeakSecret(value) {
  const s = String(value == null ? '' : value).trim();
  return s.length < 16 || PLACEHOLDER_SECRETS.has(s.toLowerCase());
}

module.exports = { LIMITS, PLACEHOLDER_SECRETS, withinLimit, isEmail, isWeakSecret };
