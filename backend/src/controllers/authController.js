const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logger } = require('../config/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

const register = async (req, res) => {
  const { email, password, role: requestedRole } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const desiredRole = requestedRole || 'CLIENT';
    let user;
    try {
      user = await prisma.user.create({
        data: { email, password: hashedPassword, role: desiredRole },
      });
    } catch (err) {
      if (err.message?.includes('role')) {
        // Migración pendiente: crear sin role, el campo aún no existe en la BD
        user = await prisma.user.create({
          data: { email, password: hashedPassword },
        });
      } else {
        throw err;
      }
    }

    const role = user.role || desiredRole;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info({
      message: 'Usuario registrado',
      userId: user.id,
    });

    return res.status(201).json({ user: { id: user.id, email: user.email, role } });

  } catch (error) {
    logger.error({ message: 'Error en registro', error: error.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn({ message: 'Login fallido - usuario no existe', ip: req.ip });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.warn({
        message: 'Login fallido - contraseña incorrecta',
        ip: req.ip,
        userId: user.id,
      });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const role = user.role || 'CLIENT';
    const token = jwt.sign(
      { userId: user.id, email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info({ message: 'Login exitoso', userId: user.id });

    return res.status(200).json({
      user: { id: user.id, email: user.email, role }
    });

  } catch (error) {
    logger.error({ message: 'Error en login', error: error.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  logger.info({ message: 'Logout', userId: req.user?.userId });
  return res.status(200).json({ message: 'Sesión cerrada correctamente' });
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({ user: { ...user, role: req.user.role || 'CLIENT' } });
  } catch (error) {
    logger.error({ message: 'Error en /me', error: error.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { register, login, logout, me };
