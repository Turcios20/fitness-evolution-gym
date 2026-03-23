# Fitness Evolution Gym

Aplicacion web para gestionar miembros, membresias e inicio de sesion de un gimnasio. El proyecto sirve frontend estatico y API Express desde una sola aplicacion Node.js.

Documentacion adicional: [DOCUMENTACION_COMPLETA.md](DOCUMENTACION_COMPLETA.md)

## Que incluye

- Gestion de miembros y renovaciones
- Login para administrador y cliente
- Frontend estatico + API Express
- Base de datos MySQL

## Requisitos

- Node.js 18 o superior
- MySQL Server
- Git

## Puesta en marcha

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
cd fitness-evolution-gym
npm install
```

1. Copia `.env.example` a `.env`.
2. Ajusta la conexion MySQL.
3. Inicializa la base local:

```bash
npm run init-db
```

4. Inicia la app:

```bash
npm start
```

Rutas principales:

- `http://localhost:3000/`
- `http://localhost:3000/api/health`

## Variables de entorno

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=fit_focus_db
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
```

- `PORT`: puerto del servidor
- `DB_HOST`, `DB_PORT`: conexion MySQL
- `DB_USER`, `DB_PASSWORD`: credenciales
- `DB_NAME`: nombre de la base
- `DB_SSL`: activa SSL en remoto
- `DB_SSL_REJECT_UNAUTHORIZED`: valida certificado SSL

`npm run init-db` ejecuta `database.sql` y recrea la base completa, asi que debe usarse solo en desarrollo local.

## Acceso y API

Usuarios de prueba:

- Admin: `admin@victorsgym.com` / `admin123`
- Cliente: `jhoscar@correo.com` / `cliente123`

Endpoints principales:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/client/dashboard?username=<correo>`
- `POST /api/subscription/renew`
- `GET /api/admin/members`
- `POST /api/admin/members`
- `PUT /api/admin/members/:id`
- `POST /api/admin/members/:id/renew`
- `DELETE /api/admin/members/:id`

Ejemplo de login:

```json
{
  "username": "admin@victorsgym.com",
  "password": "admin123"
}
```

## Estructura del proyecto

- `backend/server.js`: servidor y API
- `backend/db.js`: conexion MySQL
- `backend/init-db.js`: carga `database.sql`
- `backend/init-db-prod.js`: carga `database.production.sql`
- `render.yaml`: configuracion de despliegue

## Despliegue en Render

El proyecto incluye `render.yaml` para desplegar una sola app Node.js.

1. Sube el repositorio a GitHub.
2. Crea una base MySQL remota.
3. Crea el servicio en Render.
4. Configura las variables `DB_*`.
5. Ejecuta `npm run init-db:prod`.
6. Verifica `/api/health`.

```env
PORT=10000
DB_HOST=tu-host-remoto
DB_PORT=3306
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=tu-base
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

- `database.production.sql` esta pensado para servidor y no elimina la base.
- En remoto normalmente necesitas `DB_SSL=true`.

## Flujo del equipo

```bash
git pull origin main
npm install
```

Si cambian la base o las variables:

```bash
npm run init-db
npm start
```

No subas secretos reales en `.env`; comparte solo `.env.example`.
