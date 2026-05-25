CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador') NOT NULL DEFAULT 'Cliente',
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

CREATE TABLE IF NOT EXISTS ajustes (
    id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_ajuste (id_usuario, clave)
);

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
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
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
SELECT 'Victor Administrator', 'admin@victorsgym.com', 'admin123', 'Administrador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'admin@victorsgym.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Jhoscar Ochoa', 'jhoscar@correo.com', 'cliente123', 'Cliente'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'jhoscar@correo.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Maria Recepcion', 'recepcion@fitnessgym.com', 'recep123', 'Recepcionista'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'recepcion@fitnessgym.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Carlos Entrenador', 'entrenador@fitnessgym.com', 'train123', 'Entrenador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'entrenador@fitnessgym.com'
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
