'use strict';

const express = require('express');
const settings = require('../services/settings');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ settings: settings.all(), supportedKeys: Object.keys(settings.DEFAULTS) });
});

router.put('/', (req, res) => {
  const updated = settings.setMany(req.body || {});
  res.json({ settings: updated });
});

module.exports = router;
