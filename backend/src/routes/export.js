const express = require('express');
const { param } = require('express-validator');
const { exportDeckPdf } = require('../controllers/exportController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/:id/export',
  requireAuth,
  [param('id').isUUID().withMessage('ID de mazo inválido')],
  exportDeckPdf
);

module.exports = router;
