const { PDFDocument, rgb } = require('pdf-lib');
const { validateScryfallUrl } = require('./scryfallService');
const { logger } = require('../config/logger');

const MM = 2.8346;

const A4_WIDTH  = 210 * MM;
const A4_HEIGHT = 297 * MM;

// Dimensiones estándar de carta MTG
const CARD_WIDTH  = 63 * MM;
const CARD_HEIGHT = 88 * MM;

const COLS = 3;
const ROWS = 3;
const CARDS_PER_PAGE = COLS * ROWS;

// Margen de página explícito (espacio reservado en cada borde)
const PAGE_MARGIN_H = 5 * MM;
const PAGE_MARGIN_V = 5 * MM;

// Espacio disponible dentro de los márgenes
const AREA_WIDTH  = A4_WIDTH  - 2 * PAGE_MARGIN_H;
const AREA_HEIGHT = A4_HEIGHT - 2 * PAGE_MARGIN_V;

// Espacio entre cartas distribuido uniformemente
const GAP_X = (AREA_WIDTH  - COLS * CARD_WIDTH)  / (COLS + 1);
const GAP_Y = (AREA_HEIGHT - ROWS * CARD_HEIGHT) / (ROWS + 1);

// Longitud de la marca de corte (en puntos)
const CUT_MARK_LEN = 4 * MM;
const CUT_MARK_WIDTH = 0.3;

const downloadImage = async (url) => {
  validateScryfallUrl(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error descargando imagen: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return { arrayBuffer, contentType };
};

const embedImage = async (pdfDoc, arrayBuffer, contentType) => {
  if (contentType.includes('png')) return await pdfDoc.embedPng(arrayBuffer);
  return await pdfDoc.embedJpg(arrayBuffer);
};

const drawCard = async (page, pdfDoc, card, x, y) => {
  try {
    if (card.imageUrl) {
      const { arrayBuffer, contentType } = await downloadImage(card.imageUrl);
      const image = await embedImage(pdfDoc, arrayBuffer, contentType);
      page.drawImage(image, { x, y, width: CARD_WIDTH, height: CARD_HEIGHT });
    } else {
      page.drawRectangle({
        x, y, width: CARD_WIDTH, height: CARD_HEIGHT,
        borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1,
      });
    }
  } catch (err) {
    logger.warn({ message: 'Error dibujando carta en PDF', error: err.message });
    page.drawRectangle({
      x, y, width: CARD_WIDTH, height: CARD_HEIGHT,
      borderColor: rgb(0.8, 0.2, 0.2), borderWidth: 1,
    });
  }
};

const getCardPosition = (posInPage) => {
  const col = posInPage % COLS;
  const row = Math.floor(posInPage / COLS);
  return {
    x: PAGE_MARGIN_H + GAP_X + col * (CARD_WIDTH  + GAP_X),
    y: A4_HEIGHT - PAGE_MARGIN_V - GAP_Y - row * (CARD_HEIGHT + GAP_Y) - CARD_HEIGHT,
  };
};

// Dibuja marcas de corte en las 4 esquinas de una carta para facilitar el recorte
const drawCutMarks = (page, x, y) => {
  const gray = rgb(0.6, 0.6, 0.6);
  const o = 1 * MM; // offset desde el borde de la carta

  // Esquina superior izquierda
  page.drawLine({ start: { x: x - o, y: y + CARD_HEIGHT }, end: { x: x - o - CUT_MARK_LEN, y: y + CARD_HEIGHT }, thickness: CUT_MARK_WIDTH, color: gray });
  page.drawLine({ start: { x: x, y: y + CARD_HEIGHT + o }, end: { x: x, y: y + CARD_HEIGHT + o + CUT_MARK_LEN }, thickness: CUT_MARK_WIDTH, color: gray });

  // Esquina superior derecha
  page.drawLine({ start: { x: x + CARD_WIDTH + o, y: y + CARD_HEIGHT }, end: { x: x + CARD_WIDTH + o + CUT_MARK_LEN, y: y + CARD_HEIGHT }, thickness: CUT_MARK_WIDTH, color: gray });
  page.drawLine({ start: { x: x + CARD_WIDTH, y: y + CARD_HEIGHT + o }, end: { x: x + CARD_WIDTH, y: y + CARD_HEIGHT + o + CUT_MARK_LEN }, thickness: CUT_MARK_WIDTH, color: gray });

  // Esquina inferior izquierda
  page.drawLine({ start: { x: x - o, y }, end: { x: x - o - CUT_MARK_LEN, y }, thickness: CUT_MARK_WIDTH, color: gray });
  page.drawLine({ start: { x, y: y - o }, end: { x, y: y - o - CUT_MARK_LEN }, thickness: CUT_MARK_WIDTH, color: gray });

  // Esquina inferior derecha
  page.drawLine({ start: { x: x + CARD_WIDTH + o, y }, end: { x: x + CARD_WIDTH + o + CUT_MARK_LEN, y }, thickness: CUT_MARK_WIDTH, color: gray });
  page.drawLine({ start: { x: x + CARD_WIDTH, y: y - o }, end: { x: x + CARD_WIDTH, y: y - o - CUT_MARK_LEN }, thickness: CUT_MARK_WIDTH, color: gray });
};

const generateProxyPdf = async (cards) => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('MTG Proxy Maker - Proxies para imprimir');
  pdfDoc.setAuthor('MTG Proxy Maker');
  pdfDoc.setCreationDate(new Date());

  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageCards = cards.slice(
      pageIndex * CARDS_PER_PAGE,
      (pageIndex + 1) * CARDS_PER_PAGE
    );

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    for (let i = 0; i < pageCards.length; i++) {
      const { x, y } = getCardPosition(i);
      await drawCard(page, pdfDoc, pageCards[i], x, y);
      drawCutMarks(page, x, y);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

module.exports = { generateProxyPdf };
