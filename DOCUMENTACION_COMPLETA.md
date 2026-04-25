# Documentacion Completa - Fitness Evolution Gym

## 1. Resumen del proyecto

Fitness Evolution Gym es una aplicacion web con:
- Frontend estatico (HTML + CSS + JS).
- Backend Node.js con Express.
- Base de datos MySQL.

El sistema tiene 2 roles:
- **Administrador**: gestiona clientes y membresias.
- **Cliente**: visualiza su panel y puede renovar su suscripcion.

---

## 2. Estructura completa de archivos

```text
fitness-evolution-gym/
  assets/                        # Imagenes e iconos PNG
  backend/
    db.js                        # Conexion MySQL (pool)
    init-db.js                   # Ejecuta database.sql
    server.js                    # API REST + servidor de archivos estaticos
  admin.html                     # Vista principal del administrador
  admin.js                       # Logica admin (CRUD, modales, filtros, kebab)
  miembros.html                  # Dashboard completo de miembros (tabla paginada)
  miembros.js                    # Logica del dashboard de miembros
  form.html                      # Formulario para agregar nuevo cliente
  form.js                        # Validacion y envio del formulario
  finanzas.html                  # Seccion de finanzas (en desarrollo)
  ajustes.html                   # Ajustes del sistema (en desarrollo)
  cliente.html                   # Vista principal del cliente
  cliente.js                     # Logica cliente (dashboard, renovacion)
  calendario-cliente.html        # Calendario del cliente (en desarrollo)
  ajustes-cliente.html           # Ajustes del cliente (en desarrollo)
  login.html                     # Login compartido
  login.js                       # Autenticacion + modales de recuperacion
  common.js                      # Utilidades: API, sesion, toasts, guardRoute
  styles.css                     # Estilos globales + componentes
  database.sql                   # Script de BD y datos iniciales
  .env.example                   # Variables de entorno ejemplo
  README.md                      # Guia rapida
  DOCUMENTACION_COMPLETA.md      # Este documento
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

### 4.4 Levantar app

```bash
npm start
```

Abrir:
- `http://localhost:3000` → login
- `http://localhost:3000/api/health` → estado de API/DB

---

## 5. Credenciales de prueba

| Rol | Correo | Password |
|-----|--------|----------|
| Admin | `admin@victorsgym.com` | `admin123` |
| Cliente | `jhoscar@correo.com` | `cliente123` |

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

- `membresias.id_usuario → usuarios.id_usuario`
- `rutinas.id_usuario → usuarios.id_usuario`
- `pagos.id_usuario → usuarios.id_usuario`
- `asistencia.id_usuario → usuarios.id_usuario`

---

## 7. Flujo funcional

### 7.1 Login

1. Usuario ingresa correo y password (soporta tecla **Enter**).
2. Frontend llama `POST /api/auth/login`.
3. Si valida, se guarda sesion en `localStorage` (`gymSession`) con hora de login.
4. Redireccion segun rol:
   - `admin` → `admin.html`
   - `cliente` → `cliente.html`
5. Links "Olvide mi contrasena" y "Registrate" abren modales propios (no `alert()`).

### 7.2 Panel cliente

1. `cliente.js` llama `GymApp.guardRoute("cliente")` — redirige si la sesion expiro.
2. Consulta `GET /api/client/dashboard?username=<correo>`.
3. Renderiza nombre, plan y dias restantes reales.
4. El **avatar** muestra las iniciales del nombre con color unico generado.
5. Al hacer clic en el avatar se despliega un menu con opcion **Cerrar sesion**.
6. Boton renovar llama `POST /api/subscription/renew`.
7. Nav inferior funcional: Inicio, Calendario, Ajustes.

### 7.3 Panel admin

1. `admin.js` llama `GymApp.guardRoute("admin")`.
2. **Layout responsivo**: en desktop usa grid de 2 columnas (lista + sidebar).
3. En movil el sidebar se oculta y los botones de cada tarjeta se reemplazan por un menu kebab (⋮).
4. El **kebab** se ancla al `<body>` con `position: fixed` para no ser cortado por el `overflow` del card.

---

## 8. API REST

### 8.1 Salud

```
GET /api/health
→ { "ok": true, "message": "DB conectada" }
```

### 8.2 Auth

```
POST /api/auth/login
Body: { "username": "...", "password": "..." }
```

### 8.3 Cliente

```
GET  /api/client/dashboard?username=<correo>
POST /api/subscription/renew
Body: { "username": "jhoscar@correo.com" }
```

### 8.4 Admin — Miembros

```
GET    /api/admin/members
POST   /api/admin/members
PUT    /api/admin/members/:id
POST   /api/admin/members/:id/renew
DELETE /api/admin/members/:id
```

**Body POST crear:**
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

**Body PUT editar:**
```json
{
  "name": "Maria Lopez Editada",
  "email": "maria2@correo.com",
  "plan": "Trimestral",
  "status": "Activo"
}
```

**Body renovar:**
```json
{ "days": 30, "plan": "Mensual" }
```

---

## 9. Frontend — descripcion por archivo

### 9.1 `common.js`

Utilidades globales disponibles via `window.GymApp`:

| Funcion | Descripcion |
|---------|-------------|
| `GymApp.api(path, options)` | Fetch contra el backend. Adjunta token Bearer automaticamente. Si recibe `401` limpia la sesion y redirige al login. |
| `GymApp.getSession()` | Lee `gymSession` de localStorage. |
| `GymApp.setSession(session)` | Guarda sesion e incluye `_loginAt` (timestamp de inicio). |
| `GymApp.clearSession()` | Elimina la sesion. |
| `GymApp.isSessionExpired()` | Devuelve `true` si la sesion tiene mas de 8 horas. |
| `GymApp.guardRoute(rol)` | Verifica sesion, expiracion y rol. Si falla, redirige segun el caso. |
| `GymApp.toast(mensaje, tipo)` | Muestra un toast en la esquina inferior derecha. Tipos: `"success"`, `"error"`, `"info"`. |

### 9.2 `login.js`

- Soporte de tecla **Enter** en ambos campos (usuario y contrasena).
- Modal **"Olvide mi contrasena"**: pide correo, valida formato, muestra confirmacion.
- Modal **"Registrate"**: informa que el registro lo realiza el administrador.
- Fallback local si no hay backend activo.

### 9.3 `admin.js`

- Proteccion via `GymApp.guardRoute("admin")`.
- **Skeleton loaders** mientras carga la lista de miembros.
- **Badges de estado** con colores:
  - 🟢 Verde: mas de 15 dias
  - 🟡 Amarillo: 8–15 dias
  - 🔴 Rojo: 7 dias o menos
  - Gris: vencido o inactivo
- **Filtros** por plan y estado con pills combinables con la busqueda.
- **Modales personalizados** (sin `prompt`/`confirm`/`alert`):
  - **Eliminar**: muestra avatar con iniciales, nombre y advertencia. Animacion fade-out de la tarjeta al confirmar.
  - **Renovar**: grid de 4 planes; Mensual activo, los demas con badge "Proximamente".
  - **Editar**: formulario con nombre, correo, plan y estado. Con validacion antes de guardar.
- **Toasts** de confirmacion tras cada accion.
- **Kebab menu (⋮)** en movil: ancla al `body` con `position: fixed`.

### 9.4 `miembros.js` + `miembros.html`

Dashboard completo accesible desde el nav del admin.

- **4 stats superiores**: Total, Activos, Por vencer, Vencidos/Inactivos.
- **Tabla** con ordenamiento por columna (click en cabecera → ↑↓).
- **Tabs de filtro rapido**: Todos / Activos / Por vencer / Vencidos / Inactivos.
- **Busqueda** en tiempo real combinada con tabs.
- **Paginacion**: 12 filas por pagina con botones numerados e indicador de rango.
- **Exportar CSV**: descarga todos los miembros del filtro activo.
- Mismos modales de Editar, Renovar y Eliminar que `admin.js`.

### 9.5 `form.js` + `form.html`

Formulario dedicado para agregar clientes (reemplaza los `prompt()` del admin).

- **Campos**: nombre completo, correo, contrasena, plan (select), precio.
- **Validaciones** en cliente antes de enviar al backend.
- Mensaje de exito/error dentro del formulario.
- Redireccion automatica a `admin.html` al guardar.

### 9.6 `cliente.js`

- Proteccion via `GymApp.guardRoute("cliente")`.
- Avatar de iniciales con color unico.
- Dropdown de sesion al hacer clic en el avatar.
- Toasts en lugar de `alert()`.

---

## 10. Sistema de componentes CSS (`styles.css`)

### 10.1 Modales (`gym-modal-*`)

```
.gym-modal-overlay   Fondo oscuro con blur
.gym-modal-box       Caja centrada del modal
.gm-avatar-big       Burbuja de iniciales (64px)
.gm-title            Titulo del modal
.gm-body             Texto descriptivo
.gm-actions          Fila de botones
.gm-btn              Boton base
.gm-btn-cancel       Gris
.gm-btn-primary      Naranja
.gm-btn-danger       Rojo
.gm-plans-grid       Grid 2x2 para selector de planes
.gm-plan-card        Tarjeta de plan clickeable
.gm-plan-disabled    Plan deshabilitado
.gm-form / .gm-field Formulario dentro del modal
.gm-input            Input/select del modal
```

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

## 11. Responsividad

### Desktop (>768px)

- Admin: grid de 2 columnas — lista de miembros (flex) + sidebar con acciones rapidas y resumen del mes.
- Tarjetas de miembros en grid de 2 columnas.
- Sidebar con stats del mes pegado al scroll (`position: sticky`).
- Nav superior horizontal.

### Movil (≤768px)

- El sidebar del admin se oculta.
- Las tarjetas se apilan en 1 columna.
- Los botones Editar/Renovar/Eliminar se reemplazan por el menu kebab (⋮).
- El botton "Agregar cliente" baja a su propia linea.
- El logo del nav superior NO aparece en el nav inferior movil del admin.
- Los toasts suben sobre el nav inferior (`bottom: 90px`).
- Cliente: nav inferior fijo con Inicio, Calendario y Ajustes.
- Stats de miembros en grid 2x2.
- Tabla de miembros con scroll horizontal.

---

## 12. Paginas en desarrollo

Estas paginas estan creadas con estructura completa y placeholder visual:

| Archivo | Descripcion |
|---------|-------------|
| `finanzas.html` | Reportes de ingresos del gym |
| `ajustes.html` | Configuracion del sistema (admin) |
| `calendario-cliente.html` | Proximas sesiones del cliente |
| `ajustes-cliente.html` | Configuracion de cuenta del cliente |

Todas incluyen nav funcional, avatar y boton de cerrar sesion.

---

## 13. Trabajo en equipo con Git

### 13.1 Subir cambios

```bash
git add .
git commit -m "mensaje de cambio"
git push origin main
```

### 13.2 Actualizar repositorio local

```bash
git pull origin main
npm install
```

### 13.3 Regla importante

- `.env` no se versiona (esta en `.gitignore`).
- Cada integrante usa su propio `.env` local.

---

## 14. Troubleshooting

| Problema | Solucion |
|----------|----------|
| `Cannot GET /` | Correr `npm start` y abrir `http://localhost:3000` |
| `Access denied for user 'root'` | Revisar usuario/password en `.env` |
| `ER_BAD_DB_ERROR` | Ejecutar `npm run init-db` |
| Login no entra | Verificar credenciales de prueba y consola del servidor |
| Sesion expirada al recargar | Normal — las sesiones duran 8 horas. Iniciar sesion de nuevo. |
| Kebab menu cortado | Verificar que `kebab-menu--fixed` tenga `position: fixed` y `z-index: 9999` |
| Toast no aparece | Verificar que `common.js` cargue antes de los otros scripts |

---
