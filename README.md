# MTG Proxy Maker

Aplicación web para crear e imprimir proxies de cartas Magic: The Gathering.
Los usuarios pueden buscar cartas en la API de Scryfall, construir mazos en formato Commander
y exportarlos como PDF listo para imprimir.

---

## Características

- 🔍 Búsqueda de cartas con filtros de color y coste de maná (Scryfall API)
- 🃏 Constructor de mazos con reglas Commander (singleton, 100 cartas, comandante)
- 🎨 Selector de edición / arte por impresión
- 📄 Exportación a PDF (proxies en tamaño real 63 × 88 mm)
- 📊 Estadísticas en tiempo real del mazo (curva de maná, colores, tipos, sinergias) — **solo PREMIUM**
- 👤 Dos roles: **CLIENT** (gratuito) y **PREMIUM**
- 🔒 Autenticación JWT segura (cookie httpOnly + bcrypt)

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 |
| Node.js *(solo desarrollo sin Docker)* | 20 LTS |

---

## Levantar el proyecto con Docker (recomendado)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd mtg-proxy-maker

# 2. Crear el fichero de entorno
cp .env.example .env
# Editar .env y cambiar JWT_SECRET por un valor seguro

# 3. Arrancar todos los servicios (BD + API + Frontend)
docker compose up --build

# 4. Ejecutar migraciones de BD (primera vez)
docker compose exec api npx prisma migrate deploy
```

Servicios disponibles:

| Servicio | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (Express) | http://localhost:3001 |
| Health check | http://localhost:3001/health |

---

## Levantar sin Docker (desarrollo local)

```bash
# Terminal 1 — Backend
cd backend
cp ../.env.example .env   # editar DATABASE_URL para apuntar a tu PostgreSQL local
npm install
npx prisma migrate dev
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar los valores:

```env
DATABASE_URL="postgresql://postgres:password@db:5432/mtgproxy"
JWT_SECRET="CAMBIA-ESTO-POR-UN-SECRETO-SEGURO-EN-PRODUCCION"
JWT_EXPIRES_IN="24h"
NODE_ENV="development"
PORT=3001
NEXT_PUBLIC_API_URL="http://localhost:3001"
SCRYFALL_API_URL="https://api.scryfall.com"
```

> ⚠️ **Nunca** subas el archivo `.env` real al repositorio.  
> `JWT_SECRET` debe ser una cadena aleatoria de al menos 32 caracteres en producción.

---

## Credenciales de prueba

Para registrar usuarios de prueba, usa el formulario en `/register` o la API directamente:

```bash
# Usuario CLIENT (gratuito)
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@demo.com","password":"Demo1234","role":"CLIENT"}'

# Usuario PREMIUM
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"premium@demo.com","password":"Demo1234","role":"PREMIUM"}'
```

| Rol | Email | Contraseña | Funcionalidades |
|---|---|---|---|
| CLIENT | `cliente@demo.com` | `Demo1234` | Mazos, exportar PDF, cambiar arte |
| PREMIUM | `premium@demo.com` | `Demo1234` | Todo lo anterior + estadísticas en vivo |
| Visitante | *(sin cuenta)* | — | Buscar cartas, exportar PDF temporal |

> Los usuarios de demo se crean al registrarlos por primera vez.  
> Si la BD está limpia (primer arranque), no existen — créalos con los comandos de arriba.

---

## Linter

```bash
# Backend
cd backend
npm run lint          # mostrar errores
npm run lint:fix      # corregir automáticamente

# Frontend
cd frontend
npm run lint
```

---

## Tests

```bash
cd backend
npm test
```

Los tests de integración cubren:

- `POST /api/auth/register` — éxito, email duplicado, validaciones
- `POST /api/auth/login` — éxito, contraseña incorrecta, usuario inexistente
- `POST /api/auth/logout` — limpia la cookie de sesión
- Rutas protegidas — 401 sin token, 200 con token válido, token manipulado
- Rate limiting — 429 tras 5 intentos fallidos de login

Prisma se mockea completamente: los tests no necesitan base de datos.

---

## CI / CD

GitHub Actions ejecuta automáticamente en cada push y pull request:

1. **Backend**: lint + tests
2. **Frontend**: lint

Ver `.github/workflows/ci.yml`.

---

## Seguridad

Medidas implementadas:
- Contraseñas hasheadas con **bcrypt** (12 rounds)
- JWT con expiración de 24 h, almacenado en cookie `HttpOnly; Secure; SameSite=strict`
- Rate limiting: 5 intentos de login/min, 10 registros/hora, 10 exports/15 min
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options vía Helmet
- CORS restrictivo (solo origen permitido)
- SSRF bloqueado: imágenes solo desde `cards.scryfall.io`
- Validación y escape de todas las entradas con `express-validator`
- Control de acceso server-side en cada endpoint (nunca solo en frontend)
- Logging de eventos de seguridad en `backend/logs/security.log`

---

## Estructura del proyecto

```
mtg-proxy-maker/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma client, logger Winston
│   │   ├── controllers/     # authController, decksController, usersController…
│   │   ├── middleware/       # auth (JWT), rateLimiter
│   │   ├── routes/          # auth, cards, decks, export, users
│   │   └── services/        # scryfallService (con SSRF guard), pdfService
│   ├── tests/               # Tests de integración (Jest + Supertest)
│   └── prisma/              # Schema + migraciones
├── frontend/
│   ├── app/                 # Páginas Next.js (App Router)
│   ├── components/          # Navbar, CardSearch, ArtSelectorModal, CookieBanner…
│   └── context/             # AuthContext
├── .github/workflows/       # CI (lint + tests)
├── docker-compose.yml
├── THREAT_MODEL.md
└── .env.example
```

---

## Licencia

Proyecto académico — Aplicación Web Segura · USJ 2025-2026.
