const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, me } = require('../controllers/authController');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe contener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('La contraseña debe contener al menos un número'),
  body('role')
    .optional()
    .isIn(['CLIENT', 'PREMIUM'])
    .withMessage('Rol inválido'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/register', registerLimiter, registerValidation, register);
router.post('/login', loginLimiter, loginValidation, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

module.exports = router;
