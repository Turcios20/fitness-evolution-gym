# Documentacion Completa - Fitness Evolution Gym

## 1. Resumen del proyecto

Fitness Evolution Gym es una aplicacion web con:
- Frontend estatico (HTML + CSS + JS).
- Backend Node.js con Express.
- Base de datos MySQL.

El sistema tiene 2 roles:
- Administrador: gestiona clientes y membresias.
- Cliente: visualiza su panel y puede renovar su suscripcion.

---

## 2. Estructura principal

```text
fitness-evolution-gym/
  assets/                  # Imagenes e iconos
  backend/
    db.js                  # Conexion MySQL (pool)
    init-db.js             # Ejecuta database.sql
    server.js              # API REST + servidor de archivos estaticos
  admin.html               # Vista admin
  admin.js                 # Logica admin (CRUD clientes)
  cliente.html             # Vista cliente
  cliente.js               # Logica cliente
  login.html               # Login
  login.js                 # Autenticacion
  common.js                # Utilidades compartidas (API + sesion)
  styles.css               # Estilos
  database.sql             # Script de BD y datos iniciales
  .env.example             # Variables de entorno ejemplo
  README.md                # Guia rapida
  DOCUMENTACION_COMPLETA.md# Este documento
```

---

## 3. Requisitos

- Node.js 18+
- MySQL Server activo
- Git

---

## 4. Instalacion y arranque

### 4.1 Clonar e instalar

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
cd fitness-evolution-gym
npm install
```

### 4.2 Configurar entorno

Crear `.env` basado en `.env.example`:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=fit_focus_db
```

### 4.3 Crear base de datos

```bash
npm run init-db
```

Este comando ejecuta `database.sql`.

### 4.4 Levantar app

```bash
npm start
```

Abrir:
- `http://localhost:3000` -> login
- `http://localhost:3000/api/health` -> estado de API/DB

---

## 5. Credenciales de prueba

- Admin: `admin@victorsgym.com` / `admin123`
- Cliente: `jhoscar@correo.com` / `cliente123`

---

## 6. Base de datos

### 6.1 Tablas

- `usuarios`
- `membresias`
- `rutinas`
- `pagos`
- `asistencia`
- `inventario`

### 6.2 Relaciones relevantes

- `membresias.id_usuario -> usuarios.id_usuario`
- `rutinas.id_usuario -> usuarios.id_usuario`
- `pagos.id_usuario -> usuarios.id_usuario`
- `asistencia.id_usuario -> usuarios.id_usuario`

---

## 7. Flujo funcional actual

### 7.1 Login

1. Usuario ingresa correo y password.
2. Frontend llama `POST /api/auth/login`.
3. Si valida, se guarda sesion en `localStorage` (`gymSession`).
4. Redireccion segun rol:
- `admin` -> `admin.html`
- `cliente` -> `cliente.html`

### 7.2 Panel cliente

1. `cliente.js` toma la sesion.
2. Consulta `GET /api/client/dashboard?username=<correo>`.
3. Renderiza nombre, plan y dias restantes reales.
4. Boton renovar llama `POST /api/subscription/renew`.

### 7.3 Panel admin

`admin.js` consume endpoints admin para clientes:
- Listar clientes.
- Buscar por nombre/correo.
- Crear cliente.
- Editar cliente.
- Renovar membresia por dias.
- Eliminar cliente.

---

## 8. API REST (backend/server.js)

### 8.1 Salud

- `GET /api/health`
- Respuesta:
```json
{ "ok": true, "message": "DB conectada" }
```

### 8.2 Auth

- `POST /api/auth/login`
- Body:
```json
{ "username": "admin@victorsgym.com", "password": "admin123" }
```

### 8.3 Cliente

- `GET /api/client/dashboard?username=<correo>`
- `POST /api/subscription/renew`
- Body:
```json
{ "username": "jhoscar@correo.com" }
```

### 8.4 Admin - Miembros

- `GET /api/admin/members`
- `POST /api/admin/members`
- Body ejemplo:
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
- `PUT /api/admin/members/:id`
- Body ejemplo:
```json
{
  "name": "Maria Lopez Editada",
  "email": "maria2@correo.com",
  "plan": "Trimestral",
  "status": "Activo"
}
```
- `POST /api/admin/members/:id/renew`
- Body ejemplo:
```json
{ "days": 30 }
```
- `DELETE /api/admin/members/:id`

---

## 9. Frontend por archivo

### 9.1 `common.js`

- Define `GymApp.api()` para consumir la API.
- Maneja sesion local: `getSession`, `setSession`, `clearSession`.

### 9.2 `login.js`

- Validacion minima de campos.
- Login contra backend.
- Redireccion por rol.
- Fallback local si no hay backend.

### 9.3 `cliente.js`

- Proteccion por sesion.
- Carga dashboard de cliente.
- Renovacion de membresia.

### 9.4 `admin.js`

- Proteccion por sesion admin.
- Render dinamico de clientes.
- CRUD y renovacion de membresias.

---

### 10.2 Toasts (`gym-toast-*`)

```
#gym-toast-container    Contenedor fixed inferior derecho
.gym-toast              Toast base (oculto por defecto)
.gym-toast--show        Visible con animacion
.gym-toast--hide        Salida con animacion
.gym-toast--success     Borde verde
.gym-toast--error       Borde rojo
.gym-toast--info        Borde naranja
```

### 10.3 Badges de estado

```
.member-badge     Base
.badge-ok         Verde (>15 dias)
.badge-warn       Amarillo (8–15 dias)
.badge-danger     Rojo (≤7 dias)
.badge-expired    Gris (vencido)
.badge-inactive   Gris (inactivo)
```

### 10.4 Skeleton loaders

```
.skeleton-card      Tarjeta fantasma
.sk-circle          Avatar animado
.sk-line            Linea de texto animada
.sk-line--w70       70% de ancho
.sk-line--w50       50% de ancho
```

### 10.5 Kebab menu movil

```
.kebab-wrap           Contenedor del boton
.kebab-btn            Boton ⋮
.kebab-menu           Menu flotante (display: none por defecto)
.kebab-menu--fixed    Version anclada al body con position: fixed
.kebab-menu.open      Visible
.kebab-item           Opcion del menu
.kebab-item--danger   Opcion de eliminar (rojo)
```

### 10.6 Animaciones

```
@keyframes shimmer       Efecto de carga de skeletons
@keyframes cardFadeOut   Fade + scale al eliminar una tarjeta
.card-fade-out           Aplica la animacion
```

### 10.7 Avatar de iniciales

```
.member-avatar-initials   Circulo con iniciales en tarjetas de admin
.user-avatar              Circulo del topbar del cliente
.user-avatar-wrap         Contenedor con dropdown de sesion
.avatar-dropdown          Menu desplegable del avatar
.avatar-dropdown.open     Visible
.dropdown-name            Nombre del usuario
.dropdown-divider         Separador
.dropdown-item            Opcion del menu
.dropdown-logout          Opcion de cerrar sesion (rojo)
```

---

## 11. Troubleshooting

### 11.1 `Cannot GET /`

- Asegurarse de correr `npm start`.
- Abrir `http://localhost:3000`.

### 11.2 `Access denied for user 'root'@'localhost'`

- Revisar usuario/password en `.env`.
- Confirmar puerto real (`3306` normalmente).

### 11.3 `ER_BAD_DB_ERROR` o DB inexistente

- Ejecutar `npm run init-db`.

### 11.4 Login no entra

- Verificar datos de prueba.
- Revisar consola del servidor para errores SQL.

---

## 12. Mejoras recomendadas (siguiente iteracion)

- Hash de passwords con `bcrypt`.
- Autenticacion con JWT.
- Middleware de autorizacion por rol en endpoints admin.
- Validaciones robustas (email, password, etc.).
- Modales UI en lugar de `prompt/confirm`.
- Tests de API (Jest/Supertest).

---

## 13. Estado actual

El proyecto ya permite:
- Login por roles.
- Panel cliente con datos reales.
- Panel admin con gestion real de clientes y membresias.
- Inicializacion automatica de BD.

