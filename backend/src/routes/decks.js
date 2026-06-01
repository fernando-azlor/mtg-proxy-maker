const express = require('express');
const { body, param } = require('express-validator');
const { getDecks, getDeck, createDeck, updateDeck, deleteDeck } = require('../controllers/decksController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', getDecks);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID de mazo inválido')],
  getDeck
);

router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('El nombre debe tener entre 1 y 100 caracteres')
      .escape(),
  ],
  createDeck
);

router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('ID de mazo inválido'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .escape(),
    body('cards')
      .optional()
      .isArray({ max: 100 })
      .withMessage('Máximo 100 cartas'),
    body('cards.*.scryfallId')
      .optional()
      .isUUID()
      .withMessage('ID de carta inválido'),
    // Nombre de carta: trim + longitud, sin .escape() porque React
    // renderiza como texto (no innerHTML) y .escape() causa doble codificación
    // al recargar cartas que ya tenían entidades HTML de Scryfall.
    body('cards.*.name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 }),
    // Metadatos de Scryfall — solo longitud, sin escapado
    body('cards.*.manaCost')
      .optional({ nullable: true })
      .isLength({ max: 200 })
      .withMessage('manaCost demasiado largo'),
    body('cards.*.typeLine')
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage('typeLine demasiado largo'),
    body('cards.*.oracleText')
      .optional({ nullable: true })
      .isLength({ max: 8000 })
      .withMessage('oracleText demasiado largo'),
    body('cards.*.imageUrlSmall')
      .optional({ nullable: true })
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('imageUrlSmall inválida'),
  ],
  updateDeck
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('ID de mazo inválido')],
  deleteDeck
);

module.exports = router;
