'use strict';

const { getDb } = require('../db');

/** ConfiguraciÃƒÂ³n persistente, limitada a opciones que el backend realmente aplica. */

const DEFAULTS = {
  defaultScenario: 'load',
  historyLimit: '50',
  autoResetChaosMs: '0',
};

function all() {
  const rows = getDb().prepare('SELECT key, value FROM app_settings').all();
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function get(key) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : DEFAULTS[key];
}

function getNumber(key) {
  return Number(get(key));
}

function set(key, value) {
  getDb()
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, String(value), new Date().toISOString());
}

function setMany(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (k in DEFAULTS) set(k, v);
  }
  return all();
}

module.exports = { all, get, getNumber, set, setMany, DEFAULTS };
