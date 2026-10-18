'use strict';

const crypto = require('crypto');

/** Identificador corto legible, p.ej. run_3f9a1c. */
function shortId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function uuid() {
  return crypto.randomUUID();
}

module.exports = { shortId, uuid };
