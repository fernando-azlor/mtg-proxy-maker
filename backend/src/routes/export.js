const express = require('express');
const { param, body } = require('express-validator');
const { exportDeckPdf, exportGuestPdf } = require('../controllers/exportController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/:id/export',
  requireAuth,
  [param('id').isUUID().withMessage('ID de mazo inválido')],
  exportDeckPdf
);

router.post(
  '/guest/export',
  [
    body('cards')
      .isArray({ min: 1, max: 100 })
      .withMessage('El mazo debe tener entre 1 y 100 cartas'),
    body('cards.*.scryfallId')
      .isUUID()
      .withMessage('ID de carta inválido'),
    body('cards.*.imageUrl')
      .optional({ nullable: true })
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('URL de imagen inválida'),
    body('cards.*.name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .escape(),
  ],
  exportGuestPdf
);

module.exports = router;
