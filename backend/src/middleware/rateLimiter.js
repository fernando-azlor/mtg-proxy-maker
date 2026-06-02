const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Demasiados intentos de login. Espera 1 minuto antes de intentarlo de nuevo.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Rate limit alcanzado en login',
      ip: req.ip,
      email: req.body.email || 'no proporcionado',
    });
    res.status(429).json(options.message);
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Demasiados registros desde esta IP. Espera 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limita exportaciones de visitantes: 10 PDFs por IP cada 15 minutos
// Evita abuso del endpoint público /api/decks/guest/export
const guestExportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Demasiadas exportaciones. Espera 15 minutos o inicia sesión para mayor límite.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Rate limit alcanzado en guest export',
      ip: req.ip,
    });
    res.status(429).json(options.message);
  },
});

// Limita consultas de ediciones/arte por carta: 20 req/min por IP.
// Una carta popular (Lightning Bolt, Sol Ring) puede tener 80+ ediciones,
// cada consulta hace 2 peticiones a Scryfall. Sin este límite un usuario
// podría saturar nuestra IP contra Scryfall o hacer scraping masivo.
const printingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: 'Estás cargando demasiadas ediciones seguidas. Espera un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Rate limit alcanzado en printings',
      ip: req.ip,
      cardId: req.params.id || 'desconocido',
    });
    res.status(429).json(options.message);
  },
});

// Limita importaciones masivas: 10 bulk-lookups/min por IP.
// Cada petición puede lanzar hasta 4 batches de 75 cartas contra Scryfall.
const bulkLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Demasiadas importaciones seguidas. Espera un minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Rate limit alcanzado en bulk-lookup',
      ip: req.ip,
    });
    res.status(429).json(options.message);
  },
});

module.exports = { loginLimiter, registerLimiter, guestExportLimiter, printingsLimiter, bulkLookupLimiter };
