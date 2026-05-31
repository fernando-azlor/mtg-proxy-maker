require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { logger } = require('./config/logger');
const authRoutes = require('./routes/auth');
const cardsRoutes = require('./routes/cards');
const decksRoutes = require('./routes/decks');
const exportRoutes = require('./routes/export');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - siempre primero
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://cards.scryfall.io"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://mtg-proxy-maker.onrender.com'
    : 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Rutas
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/decks', decksRoutes);
app.use('/api/decks', exportRoutes);
app.use('/api/users', usersRoutes);

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  logger.error({ message: 'Error no controlado', error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
