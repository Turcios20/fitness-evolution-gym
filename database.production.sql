CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador') NOT NULL DEFAULT 'Cliente',
    estado_usuario ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    id_entrenador_asignado INT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios
MODIFY COLUMN rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador')
NOT NULL DEFAULT 'Cliente';

SET @trainer_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'id_entrenador_asignado'
);
SET @trainer_col_sql := IF(
    @trainer_col_exists = 0,
    'ALTER TABLE usuarios ADD COLUMN id_entrenador_asignado INT NULL AFTER rol',
    'SELECT 1'
);
PREPARE trainer_col_stmt FROM @trainer_col_sql;
EXECUTE trainer_col_stmt;
DEALLOCATE PREPARE trainer_col_stmt;

SET @trainer_fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND CONSTRAINT_NAME = 'fk_usuarios_entrenador'
);
SET @trainer_fk_sql := IF(
    @trainer_fk_exists = 0,
    'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_entrenador FOREIGN KEY (id_entrenador_asignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE trainer_fk_stmt FROM @trainer_fk_sql;
EXECUTE trainer_fk_stmt;
DEALLOCATE PREPARE trainer_fk_stmt;

SET @objetivo_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'objetivo_personal'
);
SET @objetivo_col_sql := IF(
    @objetivo_col_exists = 0,
    "ALTER TABLE usuarios ADD COLUMN objetivo_personal ENUM('Bajar de peso','Ganar masa muscular','Mejorar resistencia','Otro') NULL AFTER id_entrenador_asignado",
    'SELECT 1'
);
PREPARE objetivo_col_stmt FROM @objetivo_col_sql;
EXECUTE objetivo_col_stmt;
DEALLOCATE PREPARE objetivo_col_stmt;

SET @estado_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'estado_usuario'
);
SET @estado_col_sql := IF(
    @estado_col_exists = 0,
    "ALTER TABLE usuarios ADD COLUMN estado_usuario ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo' AFTER rol",
    'SELECT 1'
);
PREPARE estado_col_stmt FROM @estado_col_sql;
EXECUTE estado_col_stmt;
DEALLOCATE PREPARE estado_col_stmt;

CREATE TABLE IF NOT EXISTS ajustes (
    id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_ajuste (id_usuario, clave)
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id_usuario INT NOT NULL PRIMARY KEY,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_password_reset_codes_expires (expires_at),
    CONSTRAINT fk_password_reset_codes_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS configuracion_gimnasio (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor VARCHAR(500),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO configuracion_gimnasio (clave, valor) VALUES
('nombre', 'FITNESS EVOLUTIONS GYM'),
('eslogan', 'Evoluciona tu cuerpo, transforma tu vida'),
('nit', '0614-120593-101-1'),
('telefono', '+503 2234-5678'),
('correo', 'info@fitnessevolutions.com'),
('sitio_web', 'https://fitnessevolutions.com'),
('direccion', 'Blvd. del Ejercito, local 12'),
('ciudad', 'San Salvador'),
('pais', 'El Salvador');

CREATE TABLE IF NOT EXISTS horarios_gimnasio (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    dia_semana TINYINT NOT NULL UNIQUE,
    nombre_dia VARCHAR(20) NOT NULL,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO horarios_gimnasio (dia_semana, nombre_dia, hora_apertura, hora_cierre, activo) VALUES
(1, 'Lunes', '05:00', '22:00', 1),
(2, 'Martes', '05:00', '22:00', 1),
(3, 'Miercoles', '05:00', '22:00', 1),
(4, 'Jueves', '05:00', '22:00', 1),
(5, 'Viernes', '05:00', '21:00', 1),
(6, 'Sabado', '07:00', '18:00', 1),
(7, 'Domingo', '08:00', '13:00', 0);

CREATE TABLE IF NOT EXISTS planes_membresia (
    id_plan INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    precio DECIMAL(10,2) NOT NULL,
    duracion_dias INT NOT NULL,
    periodo VARCHAR(30) NOT NULL DEFAULT '/mes',
    caracteristicas VARCHAR(500) NOT NULL DEFAULT '[]',
    popular TINYINT(1) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    orden INT NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO planes_membresia (nombre, precio, duracion_dias, periodo, caracteristicas, popular, orden) VALUES
('Mensual', 35, 30, '/mes', '["Acceso completo","Clases grupales","Vestuarios"]', 1, 1),
('Trimestral', 90, 90, '/3 meses', '["Acceso completo","Clases grupales","1 sesion con trainer"]', 0, 2),
('Anual', 300, 365, '/ano', '["Acceso completo","Clases ilimitadas","4 sesiones con trainer"]', 0, 3);

CREATE TABLE IF NOT EXISTS membresias (
    id_membresia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    tipo_plan VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rutinas (
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    nombre_ejercicio VARCHAR(100) NOT NULL,
    series INT,
    repeticiones INT,
    dia_semana VARCHAR(20),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS planes_entrenamiento (
    id_plan INT AUTO_INCREMENT PRIMARY KEY,
    id_entrenador INT NOT NULL,
    id_cliente INT NOT NULL,
    nombre_plan VARCHAR(150) NOT NULL,
    objetivo TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_planes_entrenamiento_entrenador
        FOREIGN KEY (id_entrenador)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,
    CONSTRAINT fk_planes_entrenamiento_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rutinas_entrenamiento (
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_ejercicio VARCHAR(100) NOT NULL,
    descripcion TEXT,
    dia_semana VARCHAR(20),
    series INT,
    repeticiones INT,
    duracion INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rutinas_entrenamiento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia'),
    numero_factura VARCHAR(40) NULL UNIQUE,
    concepto VARCHAR(120) NULL,
    tipo_registro ENUM('Alta', 'Renovacion', 'Manual') NOT NULL DEFAULT 'Manual',
    plan_nombre VARCHAR(50) NULL,
    vigencia_hasta DATE NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

SET @numero_factura_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pagos'
      AND COLUMN_NAME = 'numero_factura'
);
SET @numero_factura_col_sql := IF(
    @numero_factura_col_exists = 0,
    "ALTER TABLE pagos ADD COLUMN numero_factura VARCHAR(40) NULL AFTER metodo_pago",
    'SELECT 1'
);
PREPARE numero_factura_col_stmt FROM @numero_factura_col_sql;
EXECUTE numero_factura_col_stmt;
DEALLOCATE PREPARE numero_factura_col_stmt;

SET @concepto_pago_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pagos'
      AND COLUMN_NAME = 'concepto'
);
SET @concepto_pago_col_sql := IF(
    @concepto_pago_col_exists = 0,
    "ALTER TABLE pagos ADD COLUMN concepto VARCHAR(120) NULL AFTER numero_factura",
    'SELECT 1'
);
PREPARE concepto_pago_col_stmt FROM @concepto_pago_col_sql;
EXECUTE concepto_pago_col_stmt;
DEALLOCATE PREPARE concepto_pago_col_stmt;

SET @tipo_registro_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pagos'
      AND COLUMN_NAME = 'tipo_registro'
);
SET @tipo_registro_col_sql := IF(
    @tipo_registro_col_exists = 0,
    "ALTER TABLE pagos ADD COLUMN tipo_registro ENUM('Alta','Renovacion','Manual') NOT NULL DEFAULT 'Manual' AFTER concepto",
    'SELECT 1'
);
PREPARE tipo_registro_col_stmt FROM @tipo_registro_col_sql;
EXECUTE tipo_registro_col_stmt;
DEALLOCATE PREPARE tipo_registro_col_stmt;

SET @plan_nombre_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pagos'
      AND COLUMN_NAME = 'plan_nombre'
);
SET @plan_nombre_col_sql := IF(
    @plan_nombre_col_exists = 0,
    "ALTER TABLE pagos ADD COLUMN plan_nombre VARCHAR(50) NULL AFTER tipo_registro",
    'SELECT 1'
);
PREPARE plan_nombre_col_stmt FROM @plan_nombre_col_sql;
EXECUTE plan_nombre_col_stmt;
DEALLOCATE PREPARE plan_nombre_col_stmt;

SET @vigencia_hasta_col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pagos'
      AND COLUMN_NAME = 'vigencia_hasta'
);
SET @vigencia_hasta_col_sql := IF(
    @vigencia_hasta_col_exists = 0,
    "ALTER TABLE pagos ADD COLUMN vigencia_hasta DATE NULL AFTER plan_nombre",
    'SELECT 1'
);
PREPARE vigencia_hasta_col_stmt FROM @vigencia_hasta_col_sql;
EXECUTE vigencia_hasta_col_stmt;
DEALLOCATE PREPARE vigencia_hasta_col_stmt;

SET @pagos_factura_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pagos'
      AND INDEX_NAME = 'uq_pagos_numero_factura'
);
SET @pagos_factura_index_sql := IF(
    @pagos_factura_index_exists = 0,
    "ALTER TABLE pagos ADD UNIQUE KEY uq_pagos_numero_factura (numero_factura)",
    'SELECT 1'
);
PREPARE pagos_factura_index_stmt FROM @pagos_factura_index_sql;
EXECUTE pagos_factura_index_stmt;
DEALLOCATE PREPARE pagos_factura_index_stmt;

CREATE TABLE IF NOT EXISTS pagos_personal (
    id_pago_personal INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    periodo_referencia CHAR(7) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('Transferencia', 'Efectivo', 'Cheque') NOT NULL DEFAULT 'Transferencia',
    observaciones VARCHAR(255) NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pagos_personal_periodo (periodo_referencia),
    INDEX idx_pagos_personal_usuario_fecha (id_usuario, fecha_pago),
    CONSTRAINT fk_pagos_personal_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS egresos_financieros (
    id_egreso INT AUTO_INCREMENT PRIMARY KEY,
    concepto VARCHAR(120) NOT NULL,
    categoria ENUM('Servicios', 'Mantenimiento', 'Equipamiento', 'Suministros', 'Marketing', 'Operacion', 'Imprevistos', 'Otros') NOT NULL DEFAULT 'Operacion',
    monto DECIMAL(10,2) NOT NULL,
    fecha_egreso DATE NOT NULL,
    metodo_pago ENUM('Transferencia', 'Efectivo', 'Tarjeta', 'Cheque') NOT NULL DEFAULT 'Transferencia',
    observaciones VARCHAR(255) NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_egresos_financieros_fecha (fecha_egreso),
    INDEX idx_egresos_financieros_categoria_fecha (categoria, fecha_egreso),
    INDEX idx_egresos_financieros_metodo_fecha (metodo_pago, fecha_egreso)
);

CREATE TABLE IF NOT EXISTS asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    fecha_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventario (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_articulo VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    estado_equipo ENUM('Bueno', 'Mantenimiento', 'Danado') DEFAULT 'Bueno'
);

CREATE TABLE IF NOT EXISTS clases (
    id_clase INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    entrenador VARCHAR(100),
    fecha_hora DATETIME NOT NULL,
    duracion_min INT DEFAULT 60,
    capacidad INT DEFAULT 20,
    disponibles INT DEFAULT 20
);

CREATE TABLE IF NOT EXISTS reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_clase INT NOT NULL,
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Confirmada', 'Cancelada') DEFAULT 'Confirmada',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_clase)   REFERENCES clases(id_clase)   ON DELETE CASCADE,
    UNIQUE KEY uq_reserva (id_usuario, id_clase)
);

CREATE TABLE IF NOT EXISTS medidas_progreso (
    id_medida INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    peso DECIMAL(10,2),
    pecho DECIMAL(10,2),
    cintura DECIMAL(10,2),
    cadera DECIMAL(10,2),
    brazos DECIMAL(10,2),
    piernas DECIMAL(10,2),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_medida_fecha (id_usuario, fecha)
);

CREATE TABLE IF NOT EXISTS progreso_fotos (
    id_foto INT AUTO_INCREMENT PRIMARY KEY,
    id_medida INT NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    tamano_bytes INT NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_medida) REFERENCES medidas_progreso(id_medida) ON DELETE CASCADE,
    UNIQUE KEY unique_foto_medida (id_medida)
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Victor Administrator', 'admin@fitness-evolution-gym.pro', 'scrypt$570c284b352cdb7554b79e8d9761b985$270ca31f944e595a51dc2af96bec57b20bfd512867313d3ed53090a6900bdb18f067c2c47b53415af7784911e868334788ecb16db9c92ad85e58142a922bb2b8', 'Administrador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'admin@fitness-evolution-gym.pro'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Jhoscar Ochoa', 'jhoscar@correo.com', 'scrypt$3466b1aad71f0f3e256cbfefab1e1063$24c261ef725dbe8b18b494152ddc877fab8f7699617a95cf1509fa44eb9e5f084dc0b6c7e3364c062a4e4bc2fe4319c1cf66e07239866d8a814acf607963b2f4', 'Cliente'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'jhoscar@correo.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Maria Recepcion', 'maria.recepcion@gmail.com', 'scrypt$0a042e96bed7a3b7b8723113ad691c46$2449c8bc631ecc355c5dd2aea03f41b289e7a81bd99fb01b4d594a6486271318043241bccace05f9ac15e4cdea01cbf5fd3f7a833a2e812ee3d9e8cbc332a39e', 'Recepcionista'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'maria.recepcion@gmail.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Carlos Entrenador', 'carlos.entrenador@gmail.com', 'scrypt$4baeeadbcff8d99f8fb05126b4897dc8$5408a79cd95c1cc7317d8d8fbd3c4c7310d92e13c585b47daff1045d9a5249171ce6156f127a08757fa4675272af14089939f2ec29ac1e6e41dde925a722cc2e', 'Entrenador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'carlos.entrenador@gmail.com'
);

INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
SELECT u.id_usuario, 'Mensual', 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Activo'
FROM usuarios u
WHERE u.correo = 'jhoscar@correo.com'
  AND NOT EXISTS (
      SELECT 1
      FROM membresias m
      WHERE m.id_usuario = u.id_usuario
  );
