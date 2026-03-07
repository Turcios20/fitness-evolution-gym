# fitness-evolution-gym

## Tutorial rapido (MySQL + Backend + Frontend)

### 1. Requisitos

1. Tener MySQL Server encendido.
2. Tener Node.js instalado.
3. Estar en esta carpeta del proyecto.

### 2. Configurar credenciales

Archivo `.env` actual:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=saenz0909.
DB_NAME=fit_focus_db
```

Si tu password o usuario real es otro, corrige este archivo antes de seguir.

### 3. Crear la base y tablas

1. Instala dependencias:
   - `npm install`
2. Ejecuta el script SQL automaticamente:
   - `npm run init-db`

Esto ejecuta `database.sql` y crea:
- `usuarios`
- `membresias`
- `rutinas`
- `pagos`
- `asistencia`
- `inventario`

Si aparece `Access denied for user 'root'@'localhost'`:
1. En MySQL Workbench abre una conexion que si te funcione.
2. Ejecuta:
   - `ALTER USER 'root'@'localhost' IDENTIFIED BY 'saenz0909.';`
3. Ejecuta otra vez:
   - `npm run init-db`

### 4. Encender API

1. `npm start`
2. Probar salud de la API:
   - abrir `http://localhost:3000/api/health`

### 5. Probar login desde el frontend

Abrir `login.html` e iniciar con:

1. Admin:
   - usuario: `admin@victorsgym.com`
   - password: `admin123`
2. Cliente:
   - usuario: `jhoscar@correo.com`
   - password: `cliente123`

## Endpoints disponibles

1. `GET /api/health`
2. `POST /api/auth/login`
   - body: `{ "username": "correo@mail.com", "password": "..." }`
3. `POST /api/subscription/renew`
   - body: `{ "username": "correo@mail.com" }`
