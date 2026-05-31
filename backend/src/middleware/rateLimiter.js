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

module.exports = { loginLimiter, registerLimiter, guestExportLimiter };
