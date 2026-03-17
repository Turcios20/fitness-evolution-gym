# Fitness Evolution Gym

Documentacion completa: `DOCUMENTACION_COMPLETA.md`



## 1) Requisitos

- Node.js 18+
- MySQL Server activo
- Git

## 2) Clonar y preparar

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
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
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
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

## 5.1) Preparado para despliegue

El proyecto ya incluye archivos para desplegarse como una sola app Node.js:

- `render.yaml` para crear el servicio web en Render.
- `database.production.sql` para crear tablas y datos base sin borrar la base remota.
- `npm run init-db:prod` para inicializar una base de datos ya creada en un proveedor externo.

Variables de entorno recomendadas para produccion:

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

Notas:

- `database.sql` sigue siendo solo para local porque elimina y recrea la base completa.
- `database.production.sql` no elimina la base y puede usarse en servidores.
- Para proveedores como Aiven suele ser necesario `DB_SSL=true`.

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

## 10) Flujo sugerido de despliegue

1. Subir la rama de despliegue a GitHub.
2. Crear una base MySQL remota.
3. Crear el servicio web en Render usando este repositorio.
4. Configurar las variables `DB_*` en Render.
5. Ejecutar `npm run init-db:prod` apuntando a la base remota.
6. Abrir la URL publica generada por Render.
