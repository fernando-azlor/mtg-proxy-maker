require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { logger } = require('./config/logger');
const authRoutes = require('./routes/auth');
const cardsRoutes = require('./routes/cards');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - always first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://cards.scryfall.io"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://mtg-proxy-maker.onreader.com'
    : 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  logger.info('Server running on port ${PORT} in ${process.env.NODE_ENV} mode');
});

app.use('/api/cards', cardsRoutes);

module.exports = app;
