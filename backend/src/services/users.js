'use strict';

const { getDb } = require('../db');
const { shortId } = require('../lib/ids');
const { hashPassword, verifyPassword } = require('../lib/auth');
const config = require('../config');

function toPublic(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at };
}

function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
}

function findById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function create({ email, name, password, role = 'member' }) {
  const row = {
    id: shortId('usr'),
    email: String(email).toLowerCase(),
    name,
    role,
    password_hash: hashPassword(password),
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare('INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.id, row.email, row.name, row.role, row.password_hash, row.created_at);
  return row;
}

function authenticate(email, password) {
  const row = findByEmail(email);
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return row;
}

/** Crea el usuario administrador si no existe ninguno (idempotente). */
function ensureAdmin() {
  const count = getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return null;
  return create({
    email: config.adminEmail,
    name: config.adminName,
    password: config.adminPassword,
    role: 'admin',
  });
}

module.exports = { toPublic, findByEmail, findById, create, authenticate, ensureAdmin };
