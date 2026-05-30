# Fitness Evolution Gym

Aplicacion web para la gestion operativa de un gimnasio.

Incluye:

- autenticacion por roles
- administracion de miembros y membresias
- panel de recepcion
- panel de entrenador
- panel de cliente
- modulo financiero completo
- seguimiento fisico y progreso
- clases, reservas y rutinas

Documentacion principal:

- [DOCUMENTACION_COMPLETA.md](DOCUMENTACION_COMPLETA.md)
- [Credenciales_de_prueba.md](Credenciales_de_prueba.md)

## Requisitos

- Node.js 18 o superior
- MySQL Server
- Git

## Instalacion

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
cd fitness-evolution-gym
npm install
```

## Configuracion

Crear `.env` a partir de `.env.example`:

```env
PORT=3000
DATABASE_URL=
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=fit_focus_db
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
AUTH_SECRET=cambia-esta-clave
```

## Arranque local

```bash
npm run init-db
npm start
```

Rutas utiles:

- `http://localhost:3000/`
- `http://localhost:3000/login.html`
- `http://localhost:3000/api/health`

## Scripts

```bash
npm run init-db
npm run init-db:prod
npm start
```

## Usuarios de prueba

| Rol | Correo | Contrasena |
| --- | --- | --- |
| Administrador | `admin@victorsgym.com` | `admin123` |
| Cliente | `jhoscar@correo.com` | `cliente123` |
| Recepcionista | `recepcion@fitnessgym.com` | `recep123` |
| Entrenador | `entrenador@fitnessgym.com` | `train123` |

## Modulo de finanzas

El ecosistema financiero del proyecto se divide en:

- `finanzas-general.html`: vista general financiera
- `finanzas.html`: ingresos
- `pagos-personal.html`: pagos al personal
- `egresos.html`: egresos

Endpoints principales:

```text
GET    /api/admin/finance/summary
GET    /api/admin/finance/overview?month=YYYY-MM
GET    /api/admin/payments
POST   /api/admin/payments
PUT    /api/admin/payments/:paymentId
DELETE /api/admin/payments/:paymentId
GET    /api/admin/staff-payments/summary?period=YYYY-MM
GET    /api/admin/expenses/summary?month=YYYY-MM
```

## Estructura base

```text
backend/
  db.js
  init-db.js
  init-db-prod.js
  security.js
  server.js

admin.html / admin.js
miembros.html / miembros.js
finanzas-general.html / finanzas-general.js
finanzas.html / finanzas.js
pagos-personal.html / pagos-personal.js
egresos.html / egresos.js
recepcionista.html / recepcionista.js
entrenador.html / entrenador.js
cliente.html / cliente.js
common.js
styles.css
finance-module.css
database.sql
database.production.sql
```

## Nota

No subir `.env` al repositorio. Para informacion tecnica detallada, flujos, tablas y endpoints, revisar `DOCUMENTACION_COMPLETA.md`.

## Troubleshooting rapido

- Si `http://localhost:3000/api/health` falla, revisar conexion MySQL y variables `DB_*`.
- Si el login falla con usuarios de prueba, ejecutar `npm run init-db`.
- Si una vista queda con sesion vieja, limpiar `gymSession` del navegador y volver a entrar.
