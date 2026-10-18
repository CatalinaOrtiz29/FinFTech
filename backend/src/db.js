'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT PRIMARY KEY,
  owner         TEXT NOT NULL,
  name          TEXT NOT NULL,
  currency      TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfers (
  id              TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash    TEXT NOT NULL,
  from_account    TEXT NOT NULL,
  to_account      TEXT NOT NULL,
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL,
  status          TEXT NOT NULL,
  response_json   TEXT NOT NULL,
  correlation_id  TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account);
CREATE INDEX IF NOT EXISTS idx_transfers_to   ON transfers(to_account);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at);

CREATE TABLE IF NOT EXISTS test_runs (
  id             TEXT PRIMARY KEY,
  scenario       TEXT NOT NULL,
  label          TEXT,
  status         TEXT NOT NULL,
  target         TEXT NOT NULL,
  config_json    TEXT NOT NULL,
  fault_json     TEXT,
  thresholds_json TEXT,
  metrics_json   TEXT,
  result         TEXT,
  error          TEXT,
  commit_sha     TEXT,
  created_by     TEXT,
  started_at     TEXT NOT NULL,
  ended_at       TEXT,
  duration_ms    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_runs_started ON test_runs(started_at);
CREATE INDEX IF NOT EXISTS idx_runs_status ON test_runs(status);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

function connect() {
  if (db) return db;
  const dir = path.dirname(config.dbPath);
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

function getDb() {
  return db || connect();
}

/** Ejecuta una funciÃƒÂ³n dentro de una transacciÃƒÂ³n inmediata (serializa escrituras). */
function transaction(fn) {
  const conn = getDb();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(conn);
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      conn.exec('ROLLBACK');
    } catch (_) {
      /* rollback best-effort */
    }
    throw err;
  }
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { connect, getDb, transaction, close };
