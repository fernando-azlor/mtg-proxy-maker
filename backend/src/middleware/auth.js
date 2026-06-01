const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const { isBlocked } = require('../config/tokenBlocklist');

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

  // Rechazar tokens que fueron invalidados explícitamente en logout
  if (isBlocked(token)) {
    logger.warn({
      message: 'Uso de token revocado',
      ip: req.ip,
      path: req.path,
    });
    res.clearCookie('token');
    return res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token; // disponible para logout
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
  if (req.user?.role !== 'PREMIUM' && req.user?.role !== 'ADMIN') {
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

// Solo administradores pueden acceder
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    logger.warn({
      message: 'Acceso a ruta de admin denegado',
      ip: req.ip,
      userId: req.user?.userId,
      path: req.path,
    });
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
};

module.exports = { requireAuth, requirePremium, requireAdmin };
