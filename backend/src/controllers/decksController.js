const prisma = require('../config/prisma');
const { logger } = require('../config/logger');
const { validationResult } = require('express-validator');

const getDecks = async (req, res) => {
  try {
    const decks = await prisma.deck.findMany({
      where: { userId: req.user.userId },
      include: { _count: { select: { cards: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return res.status(200).json({ decks });
  } catch (err) {
    logger.error({ message: 'Error obteniendo mazos', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getDeck = async (req, res) => {
  const { id } = req.params;
  try {
    const deck = await prisma.deck.findUnique({
      where: { id },
      include: { cards: { orderBy: { createdAt: 'asc' } } },
    });

    if (!deck) {
      return res.status(404).json({ error: 'Mazo no encontrado' });
    }

    // Control de acceso: verificar que el mazo pertenece al usuario
    if (deck.userId !== req.user.userId) {
      logger.warn({
        message: 'Intento de acceso no autorizado a mazo',
        userId: req.user.userId,
        deckId: id,
        ownerId: deck.userId,
      });
      return res.status(403).json({ error: 'No tienes permiso para acceder a este mazo' });
    }

    return res.status(200).json({ deck });
  } catch (err) {
    logger.error({ message: 'Error obteniendo mazo', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createDeck = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  try {
    const deck = await prisma.deck.create({
      data: {
        name,
        format: 'commander',
        userId: req.user.userId,
      },
    });

    logger.info({ message: 'Mazo creado', deckId: deck.id, userId: req.user.userId });
    return res.status(201).json({ deck });
  } catch (err) {
    logger.error({ message: 'Error creando mazo', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateDeck = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, cards } = req.body;

  try {
    const deck = await prisma.deck.findUnique({ where: { id } });

    if (!deck) {
      return res.status(404).json({ error: 'Mazo no encontrado' });
    }

    if (deck.userId !== req.user.userId) {
      logger.warn({
        message: 'Intento de modificacion no autorizada de mazo',
        userId: req.user.userId,
        deckId: id,
      });
      return res.status(403).json({ error: 'No tienes permiso para modificar este mazo' });
    }

    // Validar reglas Commander
    if (cards) {
      if (cards.length > 100) {
        return res.status(400).json({ error: 'Un mazo Commander no puede tener más de 100 cartas' });
      }
      const commanders = cards.filter(c => c.isCommander);
      if (commanders.length > 1) {
        return res.status(400).json({ error: 'Solo puede haber un comandante' });
      }
    }

    // Transaccion atomica: actualizar nombre y cartas juntos
    const updatedDeck = await prisma.$transaction(async (tx) => {
      const updated = await tx.deck.update({
        where: { id },
        data: { name: name || deck.name },
      });

      if (cards !== undefined) {
        await tx.deckCard.deleteMany({ where: { deckId: id } });
        if (cards.length > 0) {
          await tx.deckCard.createMany({
            data: cards.map(card => ({
              deckId: id,
              scryfallId: card.scryfallId,
              name: card.name,
              imageUrl: card.imageUrl || '',
              isCommander: card.isCommander || false,
              quantity: 1,
            })),
          });
        }
      }

      return tx.deck.findUnique({
        where: { id },
        include: { cards: true },
      });
    });

    logger.info({ message: 'Mazo actualizado', deckId: id, userId: req.user.userId });
    return res.status(200).json({ deck: updatedDeck });
  } catch (err) {
    logger.error({ message: 'Error actualizando mazo', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteDeck = async (req, res) => {
  const { id } = req.params;

  try {
    const deck = await prisma.deck.findUnique({ where: { id } });

    if (!deck) {
      return res.status(404).json({ error: 'Mazo no encontrado' });
    }

    if (deck.userId !== req.user.userId) {
      logger.warn({
        message: 'Intento de eliminacion no autorizada de mazo',
        userId: req.user.userId,
        deckId: id,
      });
      return res.status(403).json({ error: 'No tienes permiso para eliminar este mazo' });
    }

    await prisma.deck.delete({ where: { id } });

    logger.info({ message: 'Mazo eliminado', deckId: id, userId: req.user.userId });
    return res.status(200).json({ message: 'Mazo eliminado correctamente' });
  } catch (err) {
    logger.error({ message: 'Error eliminando mazo', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getDecks, getDeck, createDeck, updateDeck, deleteDeck };
