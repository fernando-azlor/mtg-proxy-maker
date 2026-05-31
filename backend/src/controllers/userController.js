const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

const deleteAccount = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Cascade delete: elimina mazos y cartas automaticamente
    await prisma.user.delete({
      where: { id: userId },
    });

    // Limpiar cookie de sesion
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    logger.info({ message: 'Cuenta eliminada', userId });

    return res.status(200).json({ message: 'Cuenta eliminada correctamente' });

  } catch (err) {
    logger.error({ message: 'Error eliminando cuenta', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { decks: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    logger.error({ message: 'Error obteniendo perfil', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateRole = async (req, res) => {
  const { role } = req.body;
  const userId = req.user.userId;

  try {
    await prisma.user.update({ where: { id: userId }, data: { role } });

    const token = jwt.sign(
      { userId, email: req.user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info({ message: 'Rol actualizado', userId, role });

    return res.status(200).json({ user: { id: userId, email: req.user.email, role } });
  } catch (err) {
    logger.error({ message: 'Error actualizando rol', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { deleteAccount, getProfile, updateRole };
