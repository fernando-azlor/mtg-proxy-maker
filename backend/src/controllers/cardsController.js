const { searchCards, getCardById, getCardPrintings, bulkLookupByNames } = require('../services/scryfallService');
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

const bulkLookup = async (req, res) => {
  const { cards } = req.body;

  // Validación de seguridad del array (la ruta ya valida tipos con express-validator,
  // pero hacemos doble comprobación aquí para mayor robustez)
  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'Envía un array "cards" con los nombres' });
  }
  if (cards.length > 300) {
    return res.status(400).json({ error: 'Máximo 300 cartas por importación' });
  }

  try {
    const result = await bulkLookupByNames(cards);
    return res.status(200).json(result);
  } catch (err) {
    logger.error({ message: 'Error en bulk lookup', error: err.message });
    return res.status(500).json({ error: 'Error al buscar las cartas' });
  }
};

module.exports = { search, getCard, getCardPrintingsController, bulkLookup };
