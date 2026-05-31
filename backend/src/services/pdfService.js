const { PDFDocument, rgb } = require('pdf-lib');
const { validateScryfallUrl } = require('./scryfallService');

const MM = 2.8346;
const A4_WIDTH = 210 * MM;
const A4_HEIGHT = 297 * MM;
const CARD_WIDTH = 63 * MM;
const CARD_HEIGHT = 88 * MM;
const COLS = 3;
const ROWS = 3;
const CARDS_PER_PAGE = COLS * ROWS;
const MARGIN_X = (A4_WIDTH - COLS * CARD_WIDTH) / 2;
const MARGIN_Y = (A4_HEIGHT - ROWS * CARD_HEIGHT) / 2;

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
    console.error('Error dibujando carta:', err.message);
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
    x: MARGIN_X + col * CARD_WIDTH,
    y: A4_HEIGHT - MARGIN_Y - (row + 1) * CARD_HEIGHT,
  };
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
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

module.exports = { generateProxyPdf };
