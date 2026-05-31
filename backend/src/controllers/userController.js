const prisma = require('../config/prisma');
const { logger } = require('../config/logger');

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

module.exports = { deleteAccount, getProfile };
