const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    logger.warn({
      message: 'Intento de acceso sin token',
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn({
      message: 'Token inválido o expirado',
      ip: req.ip,
      path: req.path,
      error: error.message,
    });
    res.clearCookie('token');
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const requirePremium = (req, res, next) => {
  if (req.user?.role !== 'PREMIUM') {
    logger.warn({
      message: 'Acceso a recurso Premium denegado',
      ip: req.ip,
      userId: req.user?.userId,
      path: req.path,
    });
    return res.status(403).json({ error: 'Se requiere cuenta Premium' });
  }
  next();
};

module.exports = { requireAuth, requirePremium };
