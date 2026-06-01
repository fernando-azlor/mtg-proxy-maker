const express = require('express');
const { body, param } = require('express-validator');
const { deleteAccount, getProfile, updateRole, getUsers } = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.delete('/me', deleteAccount);

// ── Rutas de administración ───────────────────────────────────────────────────
// Cómo obtener rol ADMIN:
//   docker exec -it mtg_db psql -U postgres mtgproxy \
//     -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'tu@email.com';"
// Luego cierra sesión y vuelve a entrar para que el JWT refleje el nuevo rol.

// Listar todos los usuarios (solo admin)
router.get('/', requireAdmin, getUsers);

// Cambiar el rol de cualquier usuario (solo admin)
router.put(
  '/role',
  requireAdmin,
  [
    body('userId').isUUID().withMessage('userId inválido'),
    body('role').isIn(['CLIENT', 'PREMIUM', 'ADMIN']).withMessage('Rol inválido'),
  ],
  updateRole
);

module.exports = router;
