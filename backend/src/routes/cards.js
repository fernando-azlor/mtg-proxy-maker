const express = require('express');
const { query, param } = require('express-validator');
const { search, getCard } = require('../controllers/cardsController');

const router = express.Router();

router.get(
  '/search',
  [
    query('q')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('La búsqueda no puede superar 100 caracteres')
      .escape(),
    query('page')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Página inválida'),
    query('colors')
      .optional()
      .matches(/^[WUBRGC,]+$/)
      .withMessage('Colores inválidos'),
    query('cmc')
      .optional()
      .isInt({ min: 0, max: 20 })
      .withMessage('Coste de maná inválido'),
  ],
  search
);

router.get(
  '/:id',
  [
    param('id')
      .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      .withMessage('ID de carta inválido'),
  ],
  getCard
);

module.exports = router;
