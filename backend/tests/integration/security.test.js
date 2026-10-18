'use strict';

/**
 * Pruebas de seguridad dirigidas a los puntos revisados en la auditorÃƒÂ­a:
 * autenticaciÃƒÂ³n, autorizaciÃƒÂ³n, validaciÃƒÂ³n de entradas (incluida la entrada que
 * provocaba un coste cuadrÃƒÂ¡tico en el registro), CORS y manejo de errores de
 * dependencia con recuperaciÃƒÂ³n.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { useTempDatabase } = require('../helpers/tempdb');

const temp = useTempDatabase();

const { connect, close } = require('../../src/db');
const { ensureSeed } = require('../../src/services/seed');
const { createApp } = require('../../src/app');
const config = require('../../src/config');

let server;
let base;

async function call(method, path, { body, headers, rawBody } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: rawBody !== undefined ? rawBody : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

function rawRequest(method, path, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, headers }, (res) => {
      let s = '';
      res.on('data', (c) => (s += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: s }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function login() {
  const res = await call('POST', '/api/auth/login', {
    body: { email: config.adminEmail, password: config.adminPassword },
  });
  assert.equal(res.status, 200);
  return res.data.token;
}

before(async () => {
  connect();
  ensureSeed();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  close();
  temp.cleanup();
});

test('las rutas protegidas exigen un token vÃƒÂ¡lido', async () => {
  const anon = await call('GET', '/api/auth/me');
  assert.equal(anon.status, 401);

  const bad = await call('GET', '/api/auth/me', { headers: { authorization: 'Bearer token-falso.no-firma' } });
  assert.equal(bad.status, 401);

  const token = await login();
  const ok = await call('GET', '/api/auth/me', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.email, config.adminEmail);
  assert.equal(ok.data.user.role, 'admin');
  // La contraseÃƒÂ±a (o su hash) nunca debe salir en la respuesta.
  assert.equal(ok.data.user.password, undefined);
  assert.equal(ok.data.user.passwordHash, undefined);
});

test('el login no revela si el correo existe (mismo 401 y mismo mensaje)', async () => {
  const noExiste = await call('POST', '/api/auth/login', { body: { email: 'nadie@finftech.local', password: 'loquesea123' } });
  const malaClave = await call('POST', '/api/auth/login', { body: { email: config.adminEmail, password: 'clave-incorrecta' } });

  assert.equal(noExiste.status, 401);
  assert.equal(malaClave.status, 401);
  assert.equal(noExiste.data.message, malaClave.data.message);
});

test('el registro acota las entradas antes de validarlas (entrada hostil = 400 rÃƒÂ¡pido)', async () => {
  // Entrada que hacÃƒÂ­a retroceder al validador de correo anterior (coste cuadrÃƒÂ¡tico).
  const hostile = `a@${'x.'.repeat(50000)}@`;
  const started = process.hrtime.bigint();
  const res = await call('POST', '/api/auth/register', {
    body: { email: hostile, name: 'Hostil', password: 'contrasena-larga-1' },
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  assert.equal(res.status, 400);
  assert.match(res.data.message, /no puede superar 254 caracteres/);
  assert.ok(elapsedMs < 500, `la respuesta debe ser inmediata (tardÃƒÂ³ ${elapsedMs.toFixed(0)} ms)`);
});

test('el registro valida el formato del correo y la contraseÃƒÂ±a', async () => {
  const sinPunto = await call('POST', '/api/auth/register', {
    body: { email: 'admin@localhost', name: 'X', password: 'contrasena-larga-1' },
  });
  assert.equal(sinPunto.status, 400);
  assert.match(sinPunto.data.message, /Correo electrÃƒÂ³nico invÃƒÂ¡lido/);

  const claveCorta = await call('POST', '/api/auth/register', {
    body: { email: 'nuevo@finftech.local', name: 'X', password: 'corta' },
  });
  assert.equal(claveCorta.status, 400);

  const duplicado = await call('POST', '/api/auth/register', {
    body: { email: config.adminEmail, name: 'X', password: 'contrasena-larga-1' },
  });
  assert.equal(duplicado.status, 409);

  const ok = await call('POST', '/api/auth/register', {
    body: { email: 'nuevo@finftech.local', name: 'Usuario Nuevo', password: 'contrasena-larga-1' },
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.user.role, 'member'); // el rol no se puede escalar desde el registro
});

test('las transferencias rechazan entradas no acotadas y estados de negocio invÃƒÂ¡lidos', async () => {
  const key = (n) => `sec-${n}-${Date.now()}`;

  const claveLarga = await call('POST', '/transfer', {
    headers: { 'Idempotency-Key': 'k'.repeat(5000) },
    body: { from: 'acc_alice', to: 'acc_bob', amount: 1 },
  });
  assert.equal(claveLarga.status, 400);
  assert.match(claveLarga.data.message, /no puede superar 200 caracteres/);

  const sinClave = await call('POST', '/transfer', { body: { from: 'acc_alice', to: 'acc_bob', amount: 1 } });
  assert.equal(sinClave.status, 400);

  const origenDesconocido = await call('POST', '/transfer', {
    headers: { 'Idempotency-Key': key('a') },
    body: { from: 'acc_inexistente', to: 'acc_bob', amount: 1 },
  });
  assert.equal(origenDesconocido.status, 404);

  const mismoOrigen = await call('POST', '/transfer', {
    headers: { 'Idempotency-Key': key('b') },
    body: { from: 'acc_alice', to: 'acc_alice', amount: 1 },
  });
  assert.equal(mismoOrigen.status, 422);

  const saldoInsuficiente = await call('POST', '/transfer', {
    headers: { 'Idempotency-Key': key('c') },
    body: { from: 'acc_dave', to: 'acc_bob', amount: 999999 },
  });
  assert.equal(saldoInsuficiente.status, 422);
  assert.match(saldoInsuficiente.data.message, /Saldo insuficiente/);

  const montoInvalido = await call('POST', '/transfer', {
    headers: { 'Idempotency-Key': key('d') },
    body: { from: 'acc_alice', to: 'acc_bob', amount: -5 },
  });
  assert.equal(montoInvalido.status, 400);
});

test('CORS: se permite el origen del laboratorio y se rechaza cualquier otro', async () => {
  const permitido = await rawRequest('GET', '/health', { Origin: 'http://localhost:8080' });
  assert.equal(permitido.status, 200);
  assert.equal(permitido.headers['access-control-allow-origin'], 'http://localhost:8080');

  const ajeno = await rawRequest('GET', '/health', { Origin: 'https://sitio-ajeno.example' });
  assert.equal(ajeno.status, 200); // la peticiÃƒÂ³n se atiende...
  assert.equal(ajeno.headers['access-control-allow-origin'], undefined); // ...pero sin cabecera CORS
});

test('cuerpos invÃƒÂ¡lidos y demasiado grandes producen errores controlados', async () => {
  const jsonInvalido = await call('POST', '/transfer', { rawBody: '{"from":' });
  assert.equal(jsonInvalido.status, 400);
  assert.equal(jsonInvalido.data.code, 'bad_request');

  const enorme = await call('POST', '/transfer', { rawBody: JSON.stringify({ relleno: 'x'.repeat(300000) }) });
  assert.equal(enorme.status, 413);
  assert.equal(enorme.data.code, 'payload_too_large');

  const noEncontrado = await call('GET', '/api/no-existe');
  assert.equal(noEncontrado.status, 404);
});

test('modelo de autorizaciÃƒÂ³n del laboratorio (documentado): lectura y plano de control abiertos', async () => {
  // Se deja constancia explÃƒÂ­cita para que un cambio accidental de este modelo
  // haga fallar la prueba y obligue a revisarlo.
  const cuentas = await call('GET', '/api/accounts');
  assert.equal(cuentas.status, 200);

  const chaos = await call('GET', '/api/chaos');
  assert.equal(chaos.status, 200);
  assert.ok(chaos.data.chaos);
});

test('fallo de dependencia del servicio y recuperaciÃƒÂ³n posterior', async () => {
  try {
    const activar = await call('POST', '/api/chaos/failure', { body: { rate: 1, status: 503 } });
    assert.equal(activar.status, 200);
    assert.equal(activar.data.chaos.failure.enabled, true);

    const caido = await call('POST', '/transfer', {
      headers: { 'Idempotency-Key': `dep-${Date.now()}` },
      body: { from: 'acc_alice', to: 'acc_bob', amount: 1 },
    });
    assert.equal(caido.status, 503);
    assert.equal(caido.data.code, 'injected_fault');

    const healthCaido = await call('GET', '/health');
    assert.equal(healthCaido.status, 503);
  } finally {
    await call('POST', '/api/chaos/reset');
  }

  const recuperado = await call('POST', '/transfer', {
    headers: { 'Idempotency-Key': `dep-ok-${Date.now()}` },
    body: { from: 'acc_alice', to: 'acc_bob', amount: 1 },
  });
  assert.equal(recuperado.status, 201);

  const healthOk = await call('GET', '/health');
  assert.equal(healthOk.status, 200);
  assert.equal(healthOk.data.status, 'healthy');
});

test('en producciÃƒÂ³n la API rechaza un TOKEN_SECRET de ejemplo (con salida explÃƒÂ­cita)', () => {
  const { assertSafeConfiguration } = require('../../src/server');
  const previous = {
    env: config.env,
    insecureTokenSecret: config.insecureTokenSecret,
    allowInsecureDefaults: config.allowInsecureDefaults,
  };
  try {
    config.env = 'production';
    config.insecureTokenSecret = true;
    config.allowInsecureDefaults = false;
    assert.throws(() => assertSafeConfiguration(), /TOKEN_SECRET/);

    // Salida explÃƒÂ­cita para entornos controlados.
    config.allowInsecureDefaults = true;
    assert.doesNotThrow(() => assertSafeConfiguration());

    // Con un secreto fuerte no hay objeciÃƒÂ³n.
    config.insecureTokenSecret = false;
    config.allowInsecureDefaults = false;
    assert.doesNotThrow(() => assertSafeConfiguration());
  } finally {
    Object.assign(config, previous);
  }
});
