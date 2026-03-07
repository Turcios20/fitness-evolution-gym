# Fitness Evolution Gym

Proyecto universitario (frontend HTML/CSS + backend Node.js + MySQL).

## 1) Requisitos

- Node.js 18+
- MySQL Server activo
- Git

## 2) Clonar y preparar

```bash
git clone <URL_DEL_REPO>
cd fitness-evolution-gym
npm install
```

## 3) Configurar variables de entorno

1. Copia `.env.example` como `.env`.
2. Edita `.env` con tu MySQL local.

Ejemplo:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=fit_focus_db
```

## 4) Crear base de datos y tablas

```bash
npm run init-db
```

Esto ejecuta `database.sql` (crea DB, tablas y datos de prueba).

## 5) Levantar aplicación

```bash
npm start
```

Abrir:
- `http://localhost:3000` -> login
- `http://localhost:3000/api/health` -> estado API/DB

## 6) Usuarios de prueba

- Admin: `admin@victorsgym.com` / `admin123`
- Cliente: `jhoscar@correo.com` / `cliente123`

## 7) Flujo para el equipo (pull sin romper nada)

### Subir cambios (quien desarrolla)

```bash
git add .
git commit -m "mensaje"
git push origin main
```

### Bajar cambios (compañeros)

```bash
git pull origin main
npm install
```

Luego cada compañero valida su `.env` local y ejecuta:

```bash
npm run init-db
npm start
```

`.env` no se sube al repo (está en `.gitignore`).

## 8) Agregar usuarios manualmente en MySQL Workbench

```sql
USE fit_focus_db;

INSERT INTO usuarios (nombre_completo, correo, password, rol)
VALUES ('Maria Lopez', 'maria@correo.com', 'maria123', 'Cliente');

INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
VALUES (LAST_INSERT_ID(), 'Mensual', 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Activo');
```

## 9) Endpoints actuales

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/client/dashboard?username=<correo>`
- `POST /api/subscription/renew`
