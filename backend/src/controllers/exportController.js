const prisma = require('../config/prisma');
const { generateProxyPdf } = require('../services/pdfService');
const { logger } = require('../config/logger');

const exportDeckPdf = async (req, res) => {
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
        message: 'Intento de exportacion no autorizada',
        userId: req.user.userId,
        deckId: id,
      });
      return res.status(403).json({ error: 'No tienes permiso para exportar este mazo' });
    }

    if (deck.cards.length === 0) {
      return res.status(400).json({ error: 'El mazo no tiene cartas' });
    }

    logger.info({
      message: 'Generando PDF',
      deckId: id,
      userId: req.user.userId,
      cardCount: deck.cards.length,
    });

    const pdfBytes = await generateProxyPdf(deck.cards);
    const safeName = deck.name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'mazo';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);

    return res.send(Buffer.from(pdfBytes));

  } catch (err) {
    logger.error({ message: 'Error generando PDF', error: err.message });
    return res.status(500).json({ error: 'Error al generar el PDF' });
  }
};

module.exports = { exportDeckPdf };
