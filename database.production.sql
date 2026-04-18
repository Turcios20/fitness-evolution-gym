CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador') NOT NULL DEFAULT 'Cliente',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
