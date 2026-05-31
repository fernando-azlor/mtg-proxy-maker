const SCRYFALL_BASE_URL = 'https://api.scryfall.com';
const ALLOWED_IMAGE_HOST = 'cards.scryfall.io';

// Proteccion SSRF: validar que la URL pertenece exactamente a Scryfall
const validateScryfallUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== ALLOWED_IMAGE_HOST) {
      throw new Error(`URL no permitida: ${parsed.hostname}`);
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Solo se permiten URLs HTTPS');
    }
    return true;
  } catch (err) {
    throw new Error(`URL de imagen inválida: ${err.message}`);
  }
};

const searchCards = async (query, page = 1, colors = [], cmc = null) => {
  const parts = [];

  const sanitizedQuery = (query || '').trim().slice(0, 100);
  if (sanitizedQuery.length >= 2) {
    parts.push(sanitizedQuery);
  }

  // Filtro de colores: color:WUBRGC
  const validColors = (colors || []).filter(c => /^[WUBRGC]$/.test(c));
  if (validColors.length > 0) {
    parts.push(`color:${validColors.join('')}`);
  }

  // Filtro de coste de maná
  const cmcNum = parseInt(cmc, 10);
  if (!isNaN(cmcNum) && cmcNum >= 0 && cmcNum <= 20) {
    parts.push(`mv=${cmcNum}`);
  }

  if (parts.length === 0) {
    throw new Error('Introduce un nombre o selecciona al menos un filtro');
  }

  const scryfallQuery = parts.join(' ');

  const url = new URL(`${SCRYFALL_BASE_URL}/cards/search`);
  url.searchParams.set('q', scryfallQuery);
  url.searchParams.set('page', page);
  url.searchParams.set('order', 'name');

  const response = await fetch(url.toString());

  if (response.status === 404) {
    return { cards: [], hasMore: false, totalCards: 0 };
  }

  if (!response.ok) {
    throw new Error(`Error de Scryfall: ${response.status}`);
  }

  const data = await response.json();

  // Devolver solo los campos necesarios - minimizacion de datos
  const cards = data.data.map((card) => ({
    scryfallId: card.id,
    name: card.name,
    manaCost: card.mana_cost || '',
    typeLine: card.type_line || '',
    oracleText: card.oracle_text || '',
    imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
    imageUrlSmall: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || null,
    legalities: {
      commander: card.legalities?.commander || 'unknown',
    },
  }));

  return {
    cards,
    hasMore: data.has_more,
    totalCards: data.total_cards,
  };
};

const getCardById = async (scryfallId) => {
  // Validar formato UUID antes de llamar a la API
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(scryfallId)) {
    throw new Error('ID de carta inválido');
  }

  const response = await fetch(`${SCRYFALL_BASE_URL}/cards/${scryfallId}`);

  if (!response.ok) {
    throw new Error(`Carta no encontrada: ${scryfallId}`);
  }

  const card = await response.json();

  return {
    scryfallId: card.id,
    name: card.name,
    manaCost: card.mana_cost || '',
    typeLine: card.type_line || '',
    oracleText: card.oracle_text || '',
    imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
    imageUrlSmall: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || null,
    legalities: {
      commander: card.legalities?.commander || 'unknown',
    },
  };
};

module.exports = { searchCards, getCardById, validateScryfallUrl };
