// Variables de entorno mínimas para los tests (sin BD real)
process.env.JWT_SECRET      = 'test-secret-only-for-testing-not-production';
process.env.JWT_EXPIRES_IN  = '1h';
process.env.NODE_ENV        = 'test';
process.env.PORT            = '0'; // Puerto aleatorio — Supertest lo gestiona
