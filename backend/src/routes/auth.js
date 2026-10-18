'use strict';

const express = require('express');
const users = require('../services/users');
const { issueToken } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');
const { LIMITS, withinLimit, isEmail } = require('../lib/validation');
const { badRequest, unauthorized, conflict } = require('../lib/errors');

const router = express.Router();

/** POST /login y POST /api/auth/login (mismo contrato). */
function handleLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw badRequest('"email" y "password" son obligatorios.');
  // Se acota antes de tocar la base de datos o derivar la contraseÃƒÂ±a (scrypt).
  if (!withinLimit(email, LIMITS.email) || !withinLimit(password, LIMITS.password)) {
    throw unauthorized('Credenciales invÃƒÂ¡lidas.');
  }
  const user = users.authenticate(email, password);
  if (!user) throw unauthorized('Credenciales invÃƒÂ¡lidas.');
  res.json({ token: issueToken(user), user: users.toPublic(user) });
}

router.post('/login', handleLogin);

router.post('/register', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) throw badRequest('"email", "name" y "password" son obligatorios.');
  // Los lÃƒÂ­mites se comprueban ANTES de la validaciÃƒÂ³n de formato: evita que un
  // cuerpo grande llegue al validador (ver lib/validation.js).
  if (!withinLimit(email, LIMITS.email)) throw badRequest(`El correo no puede superar ${LIMITS.email} caracteres.`);
  if (!withinLimit(name, LIMITS.name)) throw badRequest(`El nombre no puede superar ${LIMITS.name} caracteres.`);
  if (String(password).length < 8) throw badRequest('La contraseÃƒÂ±a debe tener al menos 8 caracteres.');
  if (!withinLimit(password, LIMITS.password)) throw badRequest(`La contraseÃƒÂ±a no puede superar ${LIMITS.password} caracteres.`);
  if (!isEmail(email)) throw badRequest('Correo electrÃƒÂ³nico invÃƒÂ¡lido.');
  if (users.findByEmail(email)) throw conflict('Ya existe una cuenta con ese correo.');
  const user = users.create({ email, name, password, role: 'member' });
  res.status(201).json({ token: issueToken(user), user: users.toPublic(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) throw unauthorized('Usuario no encontrado.');
  res.json({ user: users.toPublic(user) });
});

module.exports = router;
module.exports.handleLogin = handleLogin;
