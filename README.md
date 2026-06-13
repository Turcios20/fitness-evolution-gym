# Fitness Evolution Gym

Aplicacion web para la gestion operativa de un gimnasio. El proyecto integra frontend en HTML, CSS y JavaScript vanilla con un backend en Node.js, Express y MySQL.

## Web en produccion

- Login publico: https://fitness-evolution-gym.pro/login

## Funcionalidades principales

- autenticacion por roles
- recuperacion y cambio de contrasena
- gestion de miembros y renovaciones
- panel administrativo
- panel de recepcion con control de asistencia
- panel de entrenador con progreso, medidas y rutinas
- panel de cliente con calendario, progreso y rutinas asignadas
- configuracion del gimnasio y planes de membresia
- modulo financiero con ingresos, pagos al personal y egresos
- clases y reservas

## Documentacion complementaria

- [DOCUMENTACION_COMPLETA.md](DOCUMENTACION_COMPLETA.md)
- [Credenciales_de_prueba.md](Credenciales_de_prueba.md)

## Stack tecnico

- Frontend: HTML, CSS, JavaScript vanilla
- Backend: Node.js, Express
- Base de datos: MySQL
- Librerias principales: `mysql2`, `dotenv`, `cors`, `nodemailer`, `pdfkit`

## Requisitos

- Node.js 18 o superior
- MySQL Server
- Git

## Instalacion local

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
cd fitness-evolution-gym
npm install
```

## Configuracion

Crea un archivo `.env` a partir de `.env.example`.

Ejemplo base:

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
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@fitness-evolution-gym.pro
SMTP_PASS=tu_password_email
SMTP_FROM=no-reply@fitness-evolution-gym.pro
MAIL_FROM_NO_REPLY="Fitness Evolutions Gym <no-reply@fitness-evolution-gym.pro>"
MAIL_FROM_ADMIN="Fitness Evolutions Gym Admin <admin@fitness-evolution-gym.pro>"
```

Variables importantes:

- `AUTH_SECRET`: secreto para autenticacion y tokens.
- `DB_*`: conexion a la base de datos local o remota.
- `SMTP_*` y `MAIL_FROM_*`: configuracion para recuperacion de contrasena y correos del sistema.

## Arranque local

```bash
npm run init-db
npm start
```

Esto:

1. crea o reinicia la base local con `database.sql`
2. carga usuarios de prueba
3. levanta el servidor en `backend/server.js`

## Rutas utiles

Local:

- `http://localhost:3000/`
- `http://localhost:3000/login`
- `http://localhost:3000/api/health`

Produccion:

- `https://fitness-evolution-gym.pro/login`

## Scripts disponibles

```bash
npm run init-db
npm run init-db:prod
npm start
```

- `npm run init-db`: inicializa la base local con `database.sql`.
- `npm run init-db:prod`: prepara la base de produccion con `database.production.sql`.
- `npm start`: inicia la aplicacion.

## Usuarios de prueba

Estas credenciales se cargan al ejecutar `npm run init-db` en local.

| Rol | Correo | Contrasena |
| --- | --- | --- |
| Administrador | `admin@victorsgym.com` | `admin123` |
| Cliente | `jhoscar@correo.com` | `cliente123` |
| Recepcionista | `recepcion@fitnessgym.com` | `recep123` |
| Entrenador | `entrenador@fitnessgym.com` | `train123` |

## Estructura principal

```text
backend/
  db.js
  init-db.js
  init-db-prod.js
  security.js
  server.js

assets/
uploads/

login.html
admin.html
recepcionista.html
entrenador.html
cliente.html
miembros.html
finanzas-general.html
finanzas.html
pagos-personal.html
egresos.html
entrenador-rutinas.html
entrenador-medidas.html
entrenador-progreso.html
calendario-cliente.html
progreso-cliente.html
mis-rutinas-cliente.html
ajustes.html
database.sql
database.production.sql
render.yaml
```

## Despliegue

El repositorio incluye `render.yaml` para despliegue y una base SQL separada para produccion.

Sugerencias:

1. Configurar las variables `DB_*`, `AUTH_SECRET` y `SMTP_*`.
2. Ejecutar `npm run init-db:prod` sobre la base remota.
3. Verificar `https://fitness-evolution-gym.pro/login` y `/api/health`.

## Nota

No subas secretos reales en `.env`. Para detalle tecnico de pantallas, flujos, endpoints y estructura de datos, revisa `DOCUMENTACION_COMPLETA.md`.
