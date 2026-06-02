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

// Formatea una carta de Scryfall al esquema interno, minimizando datos expuestos
const formatCard = (card) => ({
  scryfallId: card.id,
  name: card.name,
  manaCost: card.mana_cost || '',
  typeLine: card.type_line || '',
  oracleText: card.oracle_text || '',
  imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
  imageUrlSmall: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || null,
  legalities: { commander: card.legalities?.commander || 'unknown' },
});

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

  const cards = data.data.map(formatCard);

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

  return formatCard(await response.json());
};

const getCardPrintings = async (scryfallId) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(scryfallId)) {
    throw new Error('ID de carta inválido');
  }

  // Primero obtenemos el nombre exacto de la carta
  const cardResponse = await fetch(`${SCRYFALL_BASE_URL}/cards/${scryfallId}`);
  if (!cardResponse.ok) throw new Error('Carta no encontrada');
  const card = await cardResponse.json();

  // Buscamos todas las ediciones por nombre exacto, paginando hasta agotar resultados.
  // Scryfall devuelve máximo 175 por página; cartas como tierras básicas tienen 400+.
  // Límite de seguridad: máximo 10 páginas (1750 ediciones) para evitar bucles infinitos.
  const formatPrinting = (p) => ({
    scryfallId: p.id,
    name: p.name,
    setCode: p.set.toUpperCase(),
    setName: p.set_name,
    collectorNumber: p.collector_number,
    releasedAt: p.released_at,
    imageUrl: p.image_uris?.normal || p.card_faces?.[0]?.image_uris?.normal || null,
    imageUrlSmall: p.image_uris?.small || p.card_faces?.[0]?.image_uris?.small || null,
    isFullArt: p.full_art || false,
    isBorderless: p.border_color === 'borderless',
    isPromo: p.promo || false,
    frameEffects: p.frame_effects || [],
  });

  const allPrintings = [];
  let nextUrl = new URL(`${SCRYFALL_BASE_URL}/cards/search`);
  nextUrl.searchParams.set('q', `!"${card.name}"`);
  nextUrl.searchParams.set('unique', 'prints');
  nextUrl.searchParams.set('order', 'released');
  nextUrl.searchParams.set('dir', 'desc');

  const MAX_PAGES = 10;
  for (let page = 0; page < MAX_PAGES; page++) {
    const printsResponse = await fetch(nextUrl.toString());
    if (!printsResponse.ok) throw new Error('Error obteniendo ediciones');
    const data = await printsResponse.json();

    allPrintings.push(...data.data.map(formatPrinting));

    if (!data.has_more || !data.next_page) break;

    nextUrl = new URL(data.next_page);
    // Pausa de 100ms entre páginas para respetar el rate limit de Scryfall
    await new Promise(r => setTimeout(r, 100));
  }

  return { printings: allPrintings };
};

// Búsqueda masiva por nombres usando el endpoint /cards/collection de Scryfall.
// Procesa en batches de 75 (límite del endpoint) con una pausa de 100 ms
// entre batches para respetar el rate limit de Scryfall (10 req/s).
const bulkLookupByNames = async (names) => {
  const BATCH_SIZE = 75;
  const found = [];
  const notFound = [];

  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);

    // Sanitizar: solo el campo name, truncado a 200 chars, sin caracteres peligrosos
    const identifiers = batch.map(({ name }) => ({
      name: String(name).trim().slice(0, 200),
    }));

    let response;
    try {
      response = await fetch(`${SCRYFALL_BASE_URL}/cards/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
      });
    } catch {
      batch.forEach(({ name }) => notFound.push({ name, reason: 'Error de red' }));
      continue;
    }

    if (!response.ok) {
      batch.forEach(({ name }) => notFound.push({ name, reason: 'Error de Scryfall' }));
      continue;
    }

    const data = await response.json();

    (data.data || []).forEach((card) => {
      const entry =
        batch.find(b => b.name.toLowerCase() === card.name.toLowerCase()) ||
        batch.find(b => card.name.toLowerCase().startsWith(b.name.toLowerCase()));
      found.push({ ...formatCard(card), quantity: entry?.quantity || 1 });
    });

    (data.not_found || []).forEach((nf) => {
      notFound.push({ name: nf.name || 'Desconocida', reason: 'No encontrada en Scryfall' });
    });

    // Pausa entre batches para no saturar la API de Scryfall
    if (i + BATCH_SIZE < names.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return { found, notFound };
};

module.exports = { searchCards, getCardById, getCardPrintings, bulkLookupByNames, validateScryfallUrl };
