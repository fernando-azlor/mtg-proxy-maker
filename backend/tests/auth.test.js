/**
 * Tests de integración — Autenticación y control de acceso por rol
 *
 * Estrategia: Supertest levanta la app Express en memoria.
 * Prisma se mockea completamente para no necesitar BD.
 * Los tests cubren los requisitos del enunciado:
 *   - Registro / login / logout
 *   - Protección de rutas por rol (CLIENT, PREMIUM)
 *   - Respuestas ante credenciales incorrectas
 */

const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// ─── Mock de Prisma (sin BD real) ───────────────────────────────────────────
jest.mock('../src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    delete:     jest.fn(),
  },
  deck: {
    findMany:  jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const app    = require('../src/index');

// ─── Utilidades ─────────────────────────────────────────────────────────────
const makeToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

const clientToken  = makeToken({ userId: 'user-1', email: 'cliente@test.com',  role: 'CLIENT'  });
const premiumToken = makeToken({ userId: 'user-2', email: 'premium@test.com',  role: 'PREMIUM' });

// ─── REGISTER ────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => jest.resetAllMocks());

  test('201 — registro exitoso con rol CLIENT', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id:    'new-user-id',
      email: 'nuevo@test.com',
      role:  'CLIENT',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nuevo@test.com', password: 'Password1', role: 'CLIENT' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'nuevo@test.com', role: 'CLIENT' });
    // El token debe llegar como cookie httpOnly
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/token=/);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  test('201 — registro exitoso con rol PREMIUM', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'premium-id', email: 'vip@test.com', role: 'PREMIUM',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'vip@test.com', password: 'Password1', role: 'PREMIUM' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('PREMIUM');
  });

  test('409 — email ya registrado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'dup@test.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  test('400 — contraseña demasiado corta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  test('400 — email inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-es-email', password: 'Password1' });

    expect(res.status).toBe(400);
  });
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  const hashedPwd = bcrypt.hashSync('Password1', 1); // salt 1 para velocidad en tests

  beforeEach(() => jest.resetAllMocks());

  test('200 — login exitoso', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'cliente@test.com', password: hashedPwd, role: 'CLIENT',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@test.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'cliente@test.com', role: 'CLIENT' });
    expect(res.headers['set-cookie'][0]).toMatch(/token=/);
  });

  test('401 — contraseña incorrecta', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'cliente@test.com', password: hashedPwd, role: 'CLIENT',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@test.com', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    // No debe revelar si el usuario existe
    expect(res.body.error).toBe('Credenciales incorrectas');
  });

  test('401 — usuario no existe (mismo mensaje que contraseña incorrecta)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales incorrectas');
  });

  test('400 — email vacío', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: 'Password1' });

    expect(res.status).toBe(400);
  });
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  test('200 — logout limpia la cookie', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'cliente@test.com', role: 'CLIENT',
    });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `token=${clientToken}`);

    expect(res.status).toBe(200);
    // La cookie debe haber sido eliminada: sin maxAge positivo y con Expires en el pasado
    const cookie = res.headers['set-cookie']?.[0] || '';
    expect(cookie).toMatch(/token=/);
    // Express clearCookie sin maxAge establece Expires en el pasado (1970) o Max-Age=0
    // En Express 4 sin pasar maxAge, la cookie expira inmediatamente
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0|expires=Thu, 01 Jan 1970/i);
  });

  test('401 — logout sin sesión devuelve 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ─── CONTROL DE ACCESO POR ROL ───────────────────────────────────────────────
describe('Control de acceso — rutas protegidas', () => {
  beforeEach(() => jest.resetAllMocks());

  test('401 — GET /api/decks sin token', async () => {
    const res = await request(app).get('/api/decks');
    expect(res.status).toBe(401);
  });

  test('200 — GET /api/decks con token CLIENT válido', async () => {
    prisma.deck.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/decks')
      .set('Cookie', `token=${clientToken}`);

    expect(res.status).toBe(200);
  });

  test('401 — GET /api/auth/me sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('200 — GET /api/auth/me con token válido', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'cliente@test.com', createdAt: new Date(),
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('cliente@test.com');
  });

  test('401 — token manipulado (firma inválida)', async () => {
    const fakeToken = clientToken.slice(0, -5) + 'XXXXX'; // corrompe la firma

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${fakeToken}`);

    expect(res.status).toBe(401);
  });
});

// ─── RATE LIMITING (login) ────────────────────────────────────────────────────
describe('Rate limiting — login', () => {
  beforeEach(() => jest.resetAllMocks());

  test('429 tras 5 intentos fallidos en un minuto', async () => {
    prisma.user.findUnique.mockResolvedValue(null); // usuario no existe siempre

    // Los primeros 5 intentos deben dar 401 (credenciales incorrectas)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'brute@test.com', password: 'Password1' });
    }

    // El sexto debe ser bloqueado por rate limiting
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'brute@test.com', password: 'Password1' });

    expect(res.status).toBe(429);
  });
});
