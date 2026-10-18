'use strict';

/**
 * Script de siembra manual: `npm run seed`.
 * Crea el administrador y las cuentas de demostraciÃƒÂ³n si no existen.
 */
const { connect, close } = require('./db');
const { ensureSeed } = require('./services/seed');

connect();
const created = ensureSeed();
console.log(JSON.stringify({ ok: true, ...created }, null, 2));
close();
