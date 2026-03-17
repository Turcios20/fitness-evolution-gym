# Fitness Evolution Gym

Aplicacion web para gestionar miembros, membresias e inicio de sesion de un gimnasio. El proyecto sirve frontend estatico y API Express desde una sola aplicacion Node.js.

Documentacion adicional: [DOCUMENTACION_COMPLETA.md](DOCUMENTACION_COMPLETA.md)

## Requisitos

- Node.js 18 o superior
- MySQL Server disponible
- Git

## Estructura principal

- `backend/server.js`: servidor Express y endpoints de la API
- `backend/db.js`: pool de conexion MySQL
- `backend/init-db.js`: inicializacion local con `database.sql`
- `backend/init-db-prod.js`: inicializacion remota con `database.production.sql`
- `render.yaml`: configuracion de despliegue en Render

## Instalacion local

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
cd fitness-evolution-gym
npm install
```

## Variables de entorno

1. Copia `.env.example` a `.env`.
2. Ajusta los valores para tu entorno MySQL.

Ejemplo para desarrollo local:

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

Descripcion de variables:

- `PORT`: puerto del servidor Express
- `DB_HOST`: host de MySQL
- `DB_PORT`: puerto de MySQL
- `DB_USER`: usuario de la base
- `DB_PASSWORD`: password de la base
- `DB_NAME`: nombre de la base de datos
- `DB_SSL`: activa SSL para conexiones remotas
- `DB_SSL_REJECT_UNAUTHORIZED`: valida o no el certificado SSL

## Base de datos local

Para crear la base, tablas y datos de prueba:

```bash
npm run init-db
```

Este comando ejecuta `database.sql`. Ese archivo recrea la base completa, por lo que debe usarse solo en desarrollo local.

## Ejecutar la aplicacion

```bash
npm start
```

Rutas principales:

- `http://localhost:3000/` carga `login.html`
- `http://localhost:3000/api/health` valida conexion con la base

## Usuarios de prueba

- Admin: `admin@victorsgym.com` / `admin123`
- Cliente: `jhoscar@correo.com` / `cliente123`

## API disponible

### Salud del servicio

- `GET /api/health`

### Autenticacion

- `POST /api/auth/login`

Body:

```json
{
  "username": "admin@victorsgym.com",
  "password": "admin123"
}
```

### Cliente

- `GET /api/client/dashboard?username=<correo>`
- `POST /api/subscription/renew`

Body:

```json
{
  "username": "jhoscar@correo.com"
}
```

### Administracion de miembros

- `GET /api/admin/members`
- `POST /api/admin/members`
- `PUT /api/admin/members/:id`
- `POST /api/admin/members/:id/renew`
- `DELETE /api/admin/members/:id`

Ejemplo de creacion:

```json
{
  "name": "Maria Lopez",
  "email": "maria@correo.com",
  "password": "maria123",
  "role": "cliente",
  "plan": "Mensual",
  "price": 20
}
```

Ejemplo de renovacion:

```json
{
  "days": 30
}
```

## Despliegue en Render

El proyecto ya incluye `render.yaml` para desplegar una sola app Node.js en Render.

URL publica actual:

- `https://fitness-evolution-gym.onrender.com/`

Pasos sugeridos:

1. Sube la rama de despliegue a GitHub.
2. Crea una base MySQL remota.
3. Crea el servicio web en Render usando este repositorio.
4. Configura las variables `DB_*` del servicio.
5. Ejecuta `npm run init-db:prod` contra la base remota.
6. Verifica `/api/health` y luego abre la URL publica.

Variables recomendadas para produccion:

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

Notas de despliegue:

- `database.production.sql` no elimina la base y esta pensado para servidor.
- `npm run init-db:prod` usa la base indicada en `DB_NAME`.
- En proveedores remotos normalmente necesitas `DB_SSL=true`.

## Flujo del equipo

Para traer cambios:

```bash
git pull origin main
npm install
```

Si hay cambios de base o variables:

```bash
npm run init-db
npm start
```

No subas secretos reales en `.env`. El archivo que debe compartirse en el repositorio es `.env.example`.
