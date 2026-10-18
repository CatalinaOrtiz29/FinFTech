'use strict';

const express = require('express');
const fs = require('node:fs');
const metrics = require('../lib/metrics');
const chaos = require('../services/chaos');
const runner = require('../services/runner');
const { getDb } = require('../db');
const config = require('../config');

const router = express.Router();

const TOXIPROXY_ADMIN = (process.env.TOXIPROXY_ADMIN || 'http://toxiproxy:8474').replace(/\/$/, '');

/** Ã‚Â¿Se ejecuta la API dentro del entorno Docker del laboratorio? */
function inDocker() {
  try {
    return fs.existsSync('/.dockerenv');
  } catch (_) {
    return false;
  }
}

/**
 * Sondea el API de administraciÃƒÂ³n de Toxiproxy.
 * Es una comprobaciÃƒÂ³n REAL (peticiÃƒÂ³n de red), no un valor simulado.
 */
async function probeToxiproxy() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const res = await fetch(`${TOXIPROXY_ADMIN}/proxies`, { signal: controller.signal });
    if (!res.ok) return { status: 'error', detail: `admin HTTP ${res.status}` };
    const proxies = (await res.json()) || {};
    const names = Object.keys(proxies);
    const enabled = names.filter((n) => proxies[n].enabled).length;
    return { status: 'ok', detail: `${names.length} proxy(s), ${enabled} activo(s) en ${TOXIPROXY_ADMIN}` };
  } catch (_) {
    return {
      status: 'external',
      detail: inDocker()
        ? `no accesible en ${TOXIPROXY_ADMIN}`
        : 'Requiere Docker. Ver toxiproxy/toxiproxy.json.',
    };
  } finally {
    clearTimeout(timer);
  }
}

router.get('/metrics', (req, res) => res.json(metrics.snapshot()));

/** Estado de los componentes del laboratorio. */
router.get('/services', async (req, res) => {
  let database = 'ok';
  try {
    getDb().prepare('SELECT 1 AS n').get();
  } catch (_) {
    database = 'error';
  }

  const chaosState = chaos.getState();
  const chaosStatus = chaosState.enabled ? 'degraded' : 'ok';
  const docker = inDocker();
  const toxiproxy = await probeToxiproxy();

  res.json({
    services: [
      { name: 'api', label: 'FinFTech API', status: 'ok', detail: `v${config.version}` },
      { name: 'database', label: 'Base de datos (SQLite)', status: database, detail: config.dbPath },
      { name: 'runner', label: 'Ejecutor de pruebas', status: 'ok', detail: `${runner.activeRuns.size} ejecuciÃƒÂ³n(es) activa(s)` },
      {
        name: 'chaos',
        label: 'InyecciÃƒÂ³n de fallos (aplicaciÃƒÂ³n)',
        status: chaosStatus,
        detail: chaosState.enabled ? 'activa' : 'inactiva',
      },
      {
        name: 'k6',
        label: 'k6 (pruebas de carga)',
        status: docker ? 'ok' : 'external',
        detail: docker
          ? 'Servicio k6-run (perfil "load") contra http://api:3000.'
          : 'Se ejecuta como contenedor/servicio; requiere Docker. Ver carpeta /k6.',
      },
      {
        name: 'toxiproxy',
        label: 'Toxiproxy (fallos de red)',
        status: toxiproxy.status,
        detail: toxiproxy.detail,
      },
    ],
  });
});

module.exports = router;
