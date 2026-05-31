const express = require('express');
const { deleteAccount, getProfile } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.delete('/me', deleteAccount);

module.exports = router;
