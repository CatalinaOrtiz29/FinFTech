'use strict';

const crypto = require('crypto');

/**
 * Identificador corto legible, p.ej. trf_3f9a1c0d2e4b6a8c.
 *
 * MOTIVO (defecto reproducido): con 4 bytes (32 bits) la probabilidad de colisiÃƒÂ³n
 * por cumpleaÃƒÂ±os es apreciable a la escala de este laboratorio: medido sobre
 * 100 000 identificadores, `randomBytes(4)` produjo 1 colisiÃƒÂ³n. `transfers.id` es
 * clave primaria, asÃƒÂ­ que una colisiÃƒÂ³n aparecerÃƒÂ­a como un error 500 al insertar.
 * La base de datos ya contiene mÃƒÂ¡s de 80 000 transferencias generadas por las
 * pruebas de carga. Con 8 bytes (64 bits) la probabilidad es despreciable
 * (misma mediciÃƒÂ³n: 0 colisiones en 100 000).
 */
function shortId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function uuid() {
  return crypto.randomUUID();
}

module.exports = { shortId, uuid };
