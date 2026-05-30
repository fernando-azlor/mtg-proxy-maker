const { searchCards, getCardById } = require('../services/scryfallService');
const { validationResult } = require('express-validator');
const { logger } = require('../config/logger');

const search = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { q, page = 1 } = req.query;

  try {
    const result = await searchCards(q, parseInt(page));
    return res.status(200).json(result);
  } catch (err) {
    logger.error({ message: 'Error buscando cartas', error: err.message });
    return res.status(500).json({ error: 'Error al buscar cartas' });
  }
};

const getCard = async (req, res) => {
  const { id } = req.params;

  try {
    const card = await getCardById(id);
    return res.status(200).json(card);
  } catch (err) {
    logger.error({ message: 'Error obteniendo carta', error: err.message });
    return res.status(404).json({ error: 'Carta no encontrada' });
  }
};

module.exports = { search, getCard };
