const { searchCards, getCardById, getCardPrintings } = require('../services/scryfallService');
const { validationResult } = require('express-validator');
const { logger } = require('../config/logger');

const search = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { q, page = 1, colors, cmc } = req.query;

  // colors llega como string separado por comas "W,U,R" → convertir a array
  const colorsArray = colors ? colors.split(',').filter(Boolean) : [];

  try {
    const result = await searchCards(q, parseInt(page), colorsArray, cmc);
    return res.status(200).json(result);
  } catch (err) {
    if (err.message?.includes('filtro') || err.message?.includes('caracteres')) {
      return res.status(400).json({ error: err.message });
    }
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

const getCardPrintingsController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  try {
    const result = await getCardPrintings(id);
    return res.status(200).json(result);
  } catch (err) {
    logger.error({ message: 'Error obteniendo ediciones', error: err.message });
    return res.status(500).json({ error: 'Error al obtener las ediciones' });
  }
};

module.exports = { search, getCard, getCardPrintingsController };
