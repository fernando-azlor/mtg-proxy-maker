const express = require('express');
const { body } = require('express-validator');
const { deleteAccount, getProfile, updateRole } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.delete('/me', deleteAccount);
router.put(
  '/role',
  [body('role').isIn(['CLIENT', 'PREMIUM']).withMessage('Rol inválido')],
  updateRole
);

module.exports = router;
