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
    body('cards.*.name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .escape(),
  ],
  updateDeck
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('ID de mazo inválido')],
  deleteDeck
);

module.exports = router;
