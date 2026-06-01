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

// Solo accesible por administradores (middleware requireAdmin en la ruta)
const updateRole = async (req, res) => {
  const { userId, role } = req.body;

  try {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    logger.info({
      message: 'Rol actualizado por admin',
      adminId: req.user.userId,
      targetUserId: userId,
      oldRole: target.role,
      newRole: role,
    });

    return res.status(200).json({ user: { id: updated.id, email: updated.email, role: updated.role } });
  } catch (err) {
    logger.error({ message: 'Error actualizando rol', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Solo accesible por administradores
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { decks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ users });
  } catch (err) {
    logger.error({ message: 'Error listando usuarios', error: err.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { deleteAccount, getProfile, updateRole, getUsers };
