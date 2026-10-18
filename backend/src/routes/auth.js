'use strict';

const express = require('express');
const users = require('../services/users');
const { issueToken } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');
const { badRequest, unauthorized, conflict } = require('../lib/errors');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw badRequest('"email" y "password" son obligatorios.');
  const user = users.authenticate(email, password);
  if (!user) throw unauthorized('Credenciales invÃƒÂ¡lidas.');
  res.json({ token: issueToken(user), user: users.toPublic(user) });
});

router.post('/register', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) throw badRequest('"email", "name" y "password" son obligatorios.');
  if (String(password).length < 8) throw badRequest('La contraseÃƒÂ±a debe tener al menos 8 caracteres.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) throw badRequest('Correo electrÃƒÂ³nico invÃƒÂ¡lido.');
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
