const express = require('express');
const { query, param, body } = require('express-validator');
const { search, getCard, getCardPrintingsController, bulkLookup } = require('../controllers/cardsController');
const { requireAuth } = require('../middleware/auth');
const { printingsLimiter, bulkLookupLimiter } = require('../middleware/rateLimiter');

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

// POST /bulk-lookup — importación masiva de cartas por nombre
// bulkLookupLimiter: 10 req/min por IP (cada req puede lanzar 4 batches a Scryfall)
// Validación estricta del body para evitar inyección de datos
router.post(
  '/bulk-lookup',
  bulkLookupLimiter,
  [
    body('cards')
      .isArray({ min: 1, max: 300 })
      .withMessage('Envía entre 1 y 300 cartas'),
    body('cards.*.name')
      .isString()
      .withMessage('Cada carta debe tener un nombre')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('El nombre de cada carta debe tener entre 1 y 200 caracteres')
      .escape(),
    body('cards.*.quantity')
      .optional()
      .isInt({ min: 1, max: 99 })
      .withMessage('La cantidad debe ser un número entre 1 y 99'),
  ],
  bulkLookup
);

// GET /:id/printings — ediciones/arte de una carta
// printingsLimiter: 20 req/min por IP para evitar scraping y saturar Scryfall
router.get(
  '/:id/printings',
  requireAuth,
  printingsLimiter,
  [
    param('id')
      .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      .withMessage('ID de carta inválido'),
  ],
  getCardPrintingsController
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
