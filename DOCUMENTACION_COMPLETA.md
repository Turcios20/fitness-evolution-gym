# Documentacion Completa - Fitness Evolution Gym

## 1. Descripcion general

Fitness Evolution Gym es una aplicacion web para la administracion operativa de un gimnasio.
El proyecto combina frontend estatico, backend Node.js con Express y base de datos MySQL.

El sistema cubre estas areas principales:

- autenticacion por roles
- gestion de miembros y membresias
- panel administrativo
- panel de recepcion
- panel de entrenador
- panel de cliente
- modulo financiero
- seguimiento fisico y progreso de miembros
- clases, reservas y rutinas

## 2. Stack tecnico

### Frontend

- HTML
- CSS
- JavaScript vanilla

### Backend

- Node.js
- Express
- mysql2
- dotenv
- cors

### Base de datos

- MySQL

## 3. Scripts del proyecto

Archivo: `package.json`

```bash
npm install
npm run init-db
npm run init-db:prod
npm start
```

Descripcion:

- `npm install`: instala dependencias.
- `npm run init-db`: crea o reinicia la base local con `database.sql`.
- `npm run init-db:prod`: carga la base para entorno productivo.
- `npm start`: levanta el servidor en `backend/server.js`.

## 4. Variables de entorno

Archivo base: `.env.example`

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

Descripcion de variables:

- `PORT`: puerto HTTP del servidor.
- `DATABASE_URL`: cadena de conexion alternativa si el entorno la requiere.
- `DB_HOST`: host de MySQL.
- `DB_PORT`: puerto de MySQL.
- `DB_USER`: usuario de MySQL.
- `DB_PASSWORD`: contrasena de MySQL.
- `DB_NAME`: nombre de la base.
- `DB_SSL`: activa SSL en conexiones remotas.
- `DB_SSL_REJECT_UNAUTHORIZED`: valida certificado SSL.
- `AUTH_SECRET`: secreto para firma de tokens.

## 5. Arranque local

```bash
git clone https://github.com/Turcios20/fitness-evolution-gym
cd fitness-evolution-gym
npm install
```

Pasos:

1. Crear `.env` a partir de `.env.example`.
2. Configurar las credenciales de MySQL.
3. Ejecutar `npm run init-db`.
4. Ejecutar `npm start`.

Rutas utiles:

- `http://localhost:3000/`
- `http://localhost:3000/login.html`
- `http://localhost:3000/api/health`

## 6. Roles del sistema

El sistema trabaja con cuatro roles:

- `Administrador`
- `Cliente`
- `Recepcionista`
- `Entrenador`

Correspondencia usada por el frontend:

- `Administrador` -> `admin`
- `Cliente` -> `cliente`
- `Recepcionista` -> `recepcionista`
- `Entrenador` -> `entrenador`

## 7. Usuarios de prueba

Estos usuarios se cargan desde `database.sql` y sirven para pruebas locales.

| Rol | Nombre | Correo | Contrasena | Pantalla principal |
| --- | --- | --- | --- | --- |
| Administrador | Victor Administrator | `admin@victorsgym.com` | `admin123` | `admin.html` |
| Cliente | Jhoscar Ochoa | `jhoscar@correo.com` | `cliente123` | `cliente.html` |
| Recepcionista | Maria Recepcion | `recepcion@fitnessgym.com` | `recep123` | `recepcionista.html` |
| Entrenador | Carlos Entrenador | `entrenador@fitnessgym.com` | `train123` | `entrenador.html` |

Notas:

- el cliente de prueba inicia con membresia activa
- las contrasenas se guardan como texto de prueba en los datos semilla actuales
- si se reinicializa la base, estos usuarios vuelven a cargarse

## 8. Estructura funcional del proyecto

### Archivos HTML principales

- `index.html`
- `login.html`
- `admin.html`
- `miembros.html`
- `form.html`
- `finanzas-general.html`
- `finanzas.html`
- `pagos-personal.html`
- `egresos.html`
- `recepcionista.html`
- `entrenador.html`
- `entrenador-rutinas.html`
- `entrenador-medidas.html`
- `entrenador-progreso.html`
- `cliente.html`
- `progreso-cliente.html`
- `evolucion-cliente.html`
- `calendario-cliente.html`
- `mis-rutinas-cliente.html`
- `ajustes.html`
- `ajustes-cliente.html`

### Archivos JS principales

- `common.js`
- `login.js`
- `admin.js`
- `miembros.js`
- `form.js`
- `finanzas-general.js`
- `finanzas.js`
- `pagos-personal.js`
- `egresos.js`
- `recepcionista.js`
- `entrenador.js`
- `entrenador-rutinas.js`
- `entrenador-medidas.js`
- `entrenador-progreso.js`
- `cliente.js`
- `progreso.js`
- `evolucion-cliente.js`
- `evolution-shared.js`
- `calendario.js`
- `mis-rutinas.js`
- `ajustes.js`
- `ajustes-cliente.js`

### Backend

- `backend/server.js`
- `backend/db.js`
- `backend/security.js`
- `backend/init-db.js`
- `backend/init-db-prod.js`

## 9. Navegacion por modulo

### Administrador

- `admin.html`: panel principal
- `miembros.html`: tabla completa de miembros
- `form.html`: alta manual de clientes
- `finanzas-general.html`: vista general financiera
- `finanzas.html`: ingresos
- `pagos-personal.html`: pagos al personal
- `egresos.html`: egresos
- `ajustes.html`: configuracion del sistema

### Recepcion

- `recepcionista.html`: control de asistencia y consultas de recepcion

### Entrenador

- `entrenador.html`: panel general
- `entrenador-rutinas.html`: rutinas y planes
- `entrenador-medidas.html`: registro de medidas
- `entrenador-progreso.html`: progreso del alumno

### Cliente

- `cliente.html`: dashboard principal
- `calendario-cliente.html`: clases y reservas
- `mis-rutinas-cliente.html`: rutinas asignadas
- `progreso-cliente.html`: historial de medidas
- `evolucion-cliente.html`: evolucion fisica
- `ajustes-cliente.html`: configuracion personal

## 10. Modulo de finanzas

El area financiera queda dividida en cuatro vistas:

- `finanzas-general.html`: resumen ejecutivo
- `finanzas.html`: ingresos de clientes
- `pagos-personal.html`: pagos internos al personal
- `egresos.html`: gastos operativos

### HU-19 - Registro de ingresos

Responsable funcional original: Carlos

Capacidades:

- resumen de ingresos del dia, mes y total
- grafica de ingresos de los ultimos 6 meses
- desglose por metodo de pago
- historial de ingresos
- alta manual de ingreso
- edicion de ingreso
- eliminacion de ingreso

### HU-20 - Pagos al personal

Responsable funcional original: Alexy

Capacidades:

- seleccion de colaborador por rol
- registro de concepto, periodo, monto y metodo
- resumen del periodo
- grafica por rol
- historial filtrable

### HU-21 - Egresos financieros

Responsable funcional original: Mario

Capacidades:

- registro de egresos
- categorias de gasto
- resumen del periodo
- grafica de pastel por categoria
- historial editable

### Vista general financiera

Capacidades:

- consolidacion de ingresos, pagos al personal y egresos
- balance neto del periodo
- composicion del flujo del mes
- tendencia consolidada de los ultimos 6 meses
- actividad reciente

## 11. Endpoints principales

### Salud y autenticacion

```text
GET  /api/health
POST /api/auth/login
```

### Cliente

```text
GET  /api/client/dashboard
POST /api/subscription/renew
GET  /api/clases
GET  /api/clases/mis-reservas
POST /api/clases/:id/reservar
DELETE /api/clases/reservas/:id
```

### Miembros

```text
GET    /api/admin/members
POST   /api/admin/members
PUT    /api/admin/members/:id
POST   /api/admin/members/:id/renew
DELETE /api/admin/members/:id
GET    /api/trainers
```

### Recepcion

```text
GET  /api/reception/dashboard
GET  /api/reception/history
GET  /api/admin/attendance-report
POST /api/reception/checkins
```

### Entrenador y progreso

```text
GET    /api/trainer/dashboard
GET    /api/trainer/:trainerId/clientes
GET    /api/client/:clientId/evolution
PUT    /api/client/:clientId/objective
GET    /api/client/:clientId/measurements
POST   /api/client/:clientId/measurements
PUT    /api/client/:clientId/measurements/:measurementId
DELETE /api/client/:clientId/measurements/:measurementId
POST   /api/client/:clientId/measurements/:measurementId/photo
GET    /api/trainer/clients/:clientId/measurements
```

### Rutas legacy de medidas y fotos

Estas rutas siguen coexistiendo en el backend:

```text
GET    /api/medidas/:userId
POST   /api/medidas
PUT    /api/medidas/:id
DELETE /api/medidas/:id
GET    /api/objetivo/:userId
PUT    /api/objetivo/:userId
GET    /api/fotos/:medidaId
POST   /api/fotos
```

### Ajustes

```text
GET /api/settings
PUT /api/settings
```

### Finanzas

```text
GET    /api/admin/finance/summary
GET    /api/admin/finance/overview?month=YYYY-MM

GET    /api/admin/payments
POST   /api/admin/payments
PUT    /api/admin/payments/:paymentId
DELETE /api/admin/payments/:paymentId

GET    /api/admin/staff-members
GET    /api/admin/staff-payments?period=YYYY-MM
POST   /api/admin/staff-payments
GET    /api/admin/staff-payments/summary?period=YYYY-MM

GET    /api/admin/expenses?month=YYYY-MM
POST   /api/admin/expenses
PUT    /api/admin/expenses/:expenseId
DELETE /api/admin/expenses/:expenseId
GET    /api/admin/expenses/summary?month=YYYY-MM
```

## 12. Estructura de datos principal

Tablas declaradas en `database.sql`:

- `usuarios`
- `ajustes`
- `membresias`
- `rutinas`
- `planes_entrenamiento`
- `rutinas_entrenamiento`
- `pagos`
- `pagos_personal`
- `egresos_financieros`
- `asistencia`
- `inventario`
- `clases`
- `reservas`
- `medidas_progreso`
- `progreso_fotos`

Relaciones importantes:

- `membresias.id_usuario -> usuarios.id_usuario`
- `pagos.id_usuario -> usuarios.id_usuario`
- `pagos_personal.id_usuario -> usuarios.id_usuario`
- `asistencia.id_usuario -> usuarios.id_usuario`
- `reservas.id_usuario -> usuarios.id_usuario`
- `medidas_progreso.id_usuario -> usuarios.id_usuario`
- `progreso_fotos.id_medida -> medidas_progreso.id_medida`

## 13. Utilidades compartidas del frontend

Archivo: `common.js`

Responsabilidades:

- centraliza llamadas HTTP con `GymApp.api`
- adjunta token Bearer automaticamente
- limpia sesion si el backend responde `401`
- guarda sesion en `localStorage` bajo `gymSession`
- expira sesion tras 8 horas
- resuelve la ruta inicial por rol
- gestiona tema claro/oscuro
- renderiza toasts del sistema

## 14. Seguridad y sesiones

Puntos actuales del sistema:

- la sesion se almacena en `localStorage`
- el token se envia en el header `Authorization`
- si el token expira o es invalido, el frontend redirige a `login.html`
- `guardRoute` protege vistas por rol

## 15. Flujo rapido de validacion manual

### Login

1. abrir `login.html`
2. ingresar credenciales de prueba
3. verificar redireccion correcta segun rol

### Finanzas

1. entrar como administrador
2. abrir `finanzas-general.html`
3. revisar balance consolidado
4. entrar a ingresos y registrar un pago
5. entrar a pagos al personal y registrar una salida interna
6. entrar a egresos y registrar un gasto
7. volver a la vista general y confirmar el impacto

### Progreso

1. entrar como entrenador
2. abrir `entrenador-medidas.html`
3. seleccionar cliente
4. registrar o editar una medicion
5. abrir `entrenador-progreso.html`
6. confirmar que el historial y objetivo se muestran correctamente

## 16. Archivos de apoyo documental

- `README.md`: arranque rapido
- `DOCUMENTACION_COMPLETA.md`: manual tecnico
- `Credenciales_de_prueba.md`: consulta rapida de usuarios de prueba

## 17. Observaciones importantes

- `.env` no debe subirse al repositorio
- `npm run init-db` recrea la base local de desarrollo
- existen rutas nuevas y rutas legacy para progreso, por lo que conviene evitar mezclar integraciones sin revisar primero
- la vista general de finanzas depende de que existan datos en ingresos, pagos al personal o egresos
- el sistema usa muchas vistas estaticas enlazadas entre si; cualquier cambio de nombre de archivo debe actualizar la navegacion

## 18. Troubleshooting rapido

### La app no levanta

- confirmar que MySQL este encendido
- revisar `.env`
- verificar que `DB_NAME` coincida con la base esperada
- ejecutar `npm run init-db` si la base local esta incompleta

### `GET /api/health` responde error

- revisar usuario y contrasena de MySQL
- confirmar que el puerto de MySQL sea correcto
- si es remoto, revisar `DB_SSL` y `DB_SSL_REJECT_UNAUTHORIZED`

### No deja iniciar sesion

- volver a cargar los usuarios con `npm run init-db`
- revisar que se este usando una credencial de prueba valida
- limpiar `localStorage` si hay una sesion vieja corrupta

### Finanzas aparece vacio

- la vista general depende de datos en ingresos, pagos al personal o egresos
- si todo esta en cero, primero registrar al menos un movimiento en cada modulo a probar

### El frontend muestra una sesion vieja

- limpiar `gymSession` desde el navegador
- volver a entrar por `login.html`
