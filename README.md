# MTG Proxy Maker

Aplicación web para crear e imprimir proxies de cartas Magic: The Gathering.
Los usuarios pueden buscar cartas en la API de Scryfall, construir mazos en formato Commander,
elegir el arte de cada edición e exportarlos como PDF listo para imprimir con marcas de corte.

---

## Características

- 🔍 **Búsqueda de cartas** con filtros de color y coste de maná (Scryfall API)
- 📋 **Importación masiva** desde listas en formato MTGO / Moxfield / Arena (hasta 300 cartas)
- 🃏 **Constructor de mazos** con controles de cantidad (+ / −) por carta
- 🎨 **Selector de arte** por edición con lazy-load y paginación virtual (soporta cartas con 400+ ediciones)
- 📄 **Exportación a PDF** con proxies en tamaño real (63 × 88 mm) y marcas de corte para recortar
- 📊 **Estadísticas en tiempo real** del mazo — curva de maná, colores, tipos, sinergias — solo **PREMIUM**
- 👤 **Tres roles**: `CLIENT` (gratuito), `PREMIUM` y `ADMIN`
- ♿ **Skip link** de accesibilidad para navegación por teclado
- 🔒 Autenticación JWT segura (cookie `HttpOnly + Secure + SameSite=strict` + bcrypt)

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
# Editar .env y cambiar JWT_SECRET por un valor seguro (mínimo 32 caracteres)

# 3. Arrancar todos los servicios
docker compose up --build
```

Servicios disponibles tras el arranque:

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
# Base de datos
DATABASE_URL="postgresql://postgres:password@db:5432/mtgproxy"

# JWT
JWT_SECRET="CAMBIA-ESTO-POR-UN-SECRETO-ALEATORIO-DE-32-CARACTERES-MINIMO"
JWT_EXPIRES_IN="24h"

# Servidor
NODE_ENV="development"
PORT=3001

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Scryfall
SCRYFALL_API_URL="https://api.scryfall.com"
```

---

## Credenciales de prueba

| Rol | Email | Contraseña | Acceso |
|---|---|---|---|
| CLIENT | `cliente@demo.com` | `Demo1234` | Mazos, exportar PDF, cambiar arte, importar listas |
| PREMIUM | `premium@demo.com` | `Demo1234` | Todo lo anterior + estadísticas en vivo |
| ADMIN | `admin@demo.com` | `Demo1234` | Todo + panel de gestión de usuarios y roles |
| Visitante | *(sin cuenta)* | — | Buscar cartas, exportar PDF temporal |

Crear los usuarios de demo (primera vez con la BD limpia):

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@demo.com","password":"Demo1234","role":"CLIENT"}'

curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"premium@demo.com","password":"Demo1234","role":"PREMIUM"}'

curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Demo1234","role":"ADMIN"}'
```

---

## Guía de uso

### Constructor de mazos (`/builder`)

1. **Buscar cartas** — escribe el nombre o usa los filtros de color/maná
2. **Añadir al mazo** — botón `+ Añadir`; si la carta ya está usa `+ Otra copia`
3. **Ajustar cantidad** — botones `+` / `−` en cada fila del panel derecho
4. **Importar lista completa** — botón `📋 Importar lista` — pega el texto en formato MTGO:
   ```
   4 Lightning Bolt
   1x Sol Ring
   SIDEBOARD:
   2 Counterspell
   ```
5. **Cambiar arte** — botón 🎨 — abre el selector de ediciones con vista previa lateral
6. **Exportar** — botón `Exportar PDF` — descarga un PDF A4 con 9 cartas por página y marcas de corte

### Selector de arte

- Carga **todas las ediciones** de la carta (incluyendo cartas con 400+ impresiones como tierras básicas)
- Las imágenes se descargan **solo cuando son visibles** en el scroll (IntersectionObserver)
- Se muestran **30 ediciones a la vez**; al llegar al final carga 30 más automáticamente
- Pasa el ratón sobre una carta para ver el botón 🔍 y ampliarla

---

## Linter

```bash
# Backend
cd backend
npm run lint        # mostrar errores
npm run lint:fix    # corregir automáticamente

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
---

## CI / CD

GitHub Actions ejecuta automáticamente en cada push y pull request:

1. **Backend**: lint + tests
2. **Frontend**: lint

Ver `.github/workflows/ci.yml`.

---

## Estructura del proyecto

```
mtg-proxy-maker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── logger.js          # Winston (JSON, ficheros error.log + security.log)
│   │   │   ├── prisma.js          # PrismaClient singleton
│   │   │   └── tokenBlocklist.js  # Revocación de tokens JWT en logout
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── cardsController.js # + bulkLookup
│   │   │   ├── decksController.js
│   │   │   ├── exportController.js
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # requireAuth / requirePremium / requireAdmin
│   │   │   └── rateLimiter.js     # 5 limiters (login, register, export, printings, bulk)
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── cards.js           # + POST /bulk-lookup con validación de body
│   │   │   ├── decks.js
│   │   │   ├── export.js
│   │   │   └── users.js
│   │   └── services/
│   │       ├── scryfallService.js # SSRF guard + bulkLookupByNames + paginación printings
│   │       └── pdfService.js      # Márgenes, marcas de corte, tamaño real MTG
│   ├── tests/                     # Jest + Supertest (sin BD)
│   ├── logs/
│   │   ├── error.log
│   │   └── security.log
│   └── prisma/                    # Schema + migraciones versionadas
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Skip link de accesibilidad
│   │   ├── page.tsx               # Home
│   │   ├── builder/page.js        # Constructor + importación masiva + cantidades
│   │   ├── decks/[id]/page.js     # Editar mazo
│   │   ├── admin/page.js          # Panel de administración
│   │   ├── profile/page.js        # Perfil + eliminar cuenta (RGPD art. 17)
│   │   └── privacy/page.js        # Política de privacidad (RGPD art. 6)
│   ├── components/
│   │   ├── Navbar.js
│   │   ├── CardSearch.js          # Scroll interno con max-h
│   │   ├── CardItem.js            # Botones + / − de cantidad
│   │   ├── BulkImportModal.js     # Importación masiva (nuevo)
│   │   ├── ArtSelectorModal.js    # IntersectionObserver + paginación virtual
│   │   └── CookieBanner.js        # Consentimiento cookies (LSSI-CE art. 22.2)
│   └── context/
│       └── AuthContext.js
├── .github/workflows/ci.yml       # Lint + tests en cada push/PR
├── docker-compose.yml             # Migración automática al arrancar
├── .env.example
└── README.md
```

---

## Cumplimiento legal (RGPD / LSSI-CE)

| Requisito | Implementación |
|---|---|
| Política de privacidad (art. 6 RGPD) | Página `/privacy` con datos recogidos y base legal |
| Aviso de cookies (LSSI-CE art. 22.2) | `CookieBanner` con aceptar/rechazar |
| Derecho de supresión (art. 17 RGPD) | Botón "Eliminar cuenta" en `/profile` con cascade delete |
| Minimización de datos (art. 5.1.c) | Solo se recogen email y contraseña; metadatos de cartas son públicos |

---

## Licencia

Proyecto académico — Aplicación Web Segura · USJ 2025-2026.
