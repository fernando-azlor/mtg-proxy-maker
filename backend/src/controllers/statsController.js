const prisma = require('../config/prisma');
const { logger } = require('../config/logger');

// URL fija de la API de Scryfall — no es input del usuario, no hay riesgo SSRF
const SCRYFALL_API = process.env.SCRYFALL_API_URL || 'https://api.scryfall.com';

// ─── Scryfall collection fetch (hasta 75 IDs por batch) ────────────────────
async function fetchScryfallCollection(scryfallIds) {
  const batchSize = 75;
  const allCards = [];

  for (let i = 0; i < scryfallIds.length; i += batchSize) {
    const batch = scryfallIds.slice(i, i + batchSize);
    const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MTGProxyMaker/1.0',
      },
      body: JSON.stringify({ identifiers: batch.map(id => ({ id })) }),
    });

    if (!response.ok) {
      throw new Error(`Scryfall API respondió ${response.status}`);
    }

    const data = await response.json();
    allCards.push(...(data.data || []));
  }

  return allCards;
}

// ─── Cálculo de estadísticas ────────────────────────────────────────────────
function computeStats(cards) {
  if (cards.length === 0) return emptyStats();

  const isLand = (c) => (c.type_line || '').includes('Land');
  const lands    = cards.filter(c => isLand(c));
  const nonLands = cards.filter(c => !isLand(c));

  // Curva de maná (no tierras)
  const manaCurve = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 };
  nonLands.forEach(c => {
    const cmc = Math.round(c.cmc ?? 0);
    const key = cmc >= 6 ? '6+' : String(cmc);
    manaCurve[key]++;
  });

  // Distribución de colores (color_identity)
  const colorCount = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  cards.forEach(c => {
    (c.color_identity || []).forEach(col => {
      if (Object.prototype.hasOwnProperty.call(colorCount, col)) colorCount[col]++;
    });
  });
  const colorless = cards.filter(c => (c.color_identity || []).length === 0).length;

  // Distribución de tipos
  const typeDistribution = {
    Criatura: 0, Instantáneo: 0, Conjuro: 0,
    Encantamiento: 0, Artefacto: 0, Planeswalker: 0,
    Tierra: lands.length, Otro: 0,
  };
  nonLands.forEach(c => {
    const tl = c.type_line || '';
    if      (tl.includes('Creature'))     typeDistribution.Criatura++;
    else if (tl.includes('Instant'))      typeDistribution.Instantáneo++;
    else if (tl.includes('Sorcery'))      typeDistribution.Conjuro++;
    else if (tl.includes('Enchantment'))  typeDistribution.Encantamiento++;
    else if (tl.includes('Artifact'))     typeDistribution.Artefacto++;
    else if (tl.includes('Planeswalker')) typeDistribution.Planeswalker++;
    else                                  typeDistribution.Otro++;
  });

  // CMC promedio (sin tierras)
  const avgCmc = nonLands.length > 0
    ? parseFloat(
        (nonLands.reduce((s, c) => s + (c.cmc ?? 0), 0) / nonLands.length).toFixed(2)
      )
    : 0;

  // Velocidad estimada del mazo
  let speed, speedLabel, speedColor;
  if      (avgCmc < 2.0) { speed = 'fast';     speedLabel = 'Agresivo';    speedColor = 'green'; }
  else if (avgCmc < 2.8) { speed = 'medium';   speedLabel = 'Equilibrado'; speedColor = 'yellow'; }
  else if (avgCmc < 3.8) { speed = 'slow';     speedLabel = 'Control';     speedColor = 'orange'; }
  else                   { speed = 'verySlow'; speedLabel = 'Combo/Big';   speedColor = 'red'; }

  // Sinergias básicas (análisis de texto de reglas en inglés, que es lo que devuelve Scryfall)
  const SYNERGY_KEYWORDS = {
    'Cementerio':         ['graveyard', 'flashback', 'unearth', 'delve', 'escape', 'dredge', 'embalm', 'eternalize'],
    '+1/+1 Contadores':   ['+1/+1 counter'],
    'Tokens':             ['create a ', 'create two', 'create three', 'token'],
    'Robo de cartas':     ['draw a card', 'draw two cards', 'draw three cards', 'draw cards'],
    'Rampa':              ['search your library for a basic land', 'search your library for a land', 'add {g}', 'add one mana'],
    'Eliminación':        ['destroy target', 'exile target creature', 'exile target permanent'],
    'Vida':               ['gain life', 'you gain ', 'lifelink'],
    'Daño directo':       ['deals damage to any target', 'deals damage to each', 'burn'],
    'Copiar hechizos':    ['copy of that spell', 'copy target', 'copies of'],
    'Sacrificio':         ['sacrifice a ', 'sacrifice another', 'when you sacrifice'],
    'Equipamiento':       ['equip {', 'equipped creature'],
    'Enchant':            ['enchant creature', 'enchant permanent', 'aura'],
  };

  const synergies = {};
  Object.entries(SYNERGY_KEYWORDS).forEach(([theme, keywords]) => {
    const count = cards.filter(c => {
      const text = (c.oracle_text || '').toLowerCase();
      return keywords.some(kw => text.includes(kw));
    }).length;
    if (count >= 2) synergies[theme] = count; // solo mostrar si hay al menos 2 cartas
  });

  // Ratio de interacción (remoción + counters)
  const interactionCount =
    (synergies['Eliminación'] || 0) +
    cards.filter(c => (c.oracle_text || '').toLowerCase().includes('counter target')).length;

  return {
    total: cards.length,
    landCount: lands.length,
    nonLandCount: nonLands.length,
    avgCmc,
    speed,
    speedLabel,
    speedColor,
    manaCurve,
    colorDistribution: { ...colorCount, Incoloro: colorless },
    typeDistribution,
    synergies,
    interactionCount,
  };
}

function emptyStats() {
  return {
    total: 0, landCount: 0, nonLandCount: 0, avgCmc: 0,
    speed: 'medium', speedLabel: 'Sin datos', speedColor: 'gray',
    manaCurve: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 },
    colorDistribution: { W: 0, U: 0, B: 0, R: 0, G: 0, Incoloro: 0 },
    typeDistribution: { Criatura: 0, Instantáneo: 0, Conjuro: 0, Encantamiento: 0, Artefacto: 0, Planeswalker: 0, Tierra: 0, Otro: 0 },
    synergies: {},
    interactionCount: 0,
  };
}

// ─── Handler del endpoint ────────────────────────────────────────────────────
const getDeckStats = async (req, res) => {
  const { id } = req.params;

  try {
    const deck = await prisma.deck.findUnique({
      where: { id },
      include: { cards: true },
    });

    if (!deck) {
      return res.status(404).json({ error: 'Mazo no encontrado' });
    }

    if (deck.userId !== req.user.userId) {
      logger.warn({
        message: 'Acceso no autorizado a estadísticas de mazo',
        userId: req.user.userId,
        deckId: id,
      });
      return res.status(403).json({ error: 'No tienes permiso para ver este mazo' });
    }

    if (deck.cards.length === 0) {
      return res.status(200).json({ deckName: deck.name, stats: emptyStats() });
    }

    const scryfallCards = await fetchScryfallCollection(
      deck.cards.map(c => c.scryfallId)
    );

    const stats = computeStats(scryfallCards);
    logger.info({ message: 'Estadísticas calculadas', deckId: id, userId: req.user.userId });

    return res.status(200).json({ deckName: deck.name, stats });
  } catch (err) {
    logger.error({ message: 'Error calculando estadísticas', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getDeckStats };
