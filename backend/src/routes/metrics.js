'use strict';

const express = require('express');
const metrics = require('../lib/metrics');
const chaos = require('../services/chaos');
const runner = require('../services/runner');
const { getDb } = require('../db');
const config = require('../config');

const router = express.Router();

router.get('/metrics', (req, res) => res.json(metrics.snapshot()));

/** Estado de los componentes del laboratorio. */
router.get('/services', (req, res) => {
  let database = 'ok';
  try {
    getDb().prepare('SELECT 1 AS n').get();
  } catch (_) {
    database = 'error';
  }

  const chaosState = chaos.getState();
  const chaosStatus = chaosState.enabled ? 'degraded' : 'ok';

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
        status: 'external',
        detail: 'Se ejecuta como contenedor/servicio; requiere Docker. Ver carpeta /k6.',
      },
      {
        name: 'toxiproxy',
        label: 'Toxiproxy (fallos de red)',
        status: 'external',
        detail: 'Requiere Docker. Ver toxiproxy/toxiproxy.json.',
      },
    ],
  });
});

module.exports = router;
