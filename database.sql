DROP DATABASE IF EXISTS fit_focus_db;
CREATE DATABASE fit_focus_db;
USE fit_focus_db;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Cliente') NOT NULL DEFAULT 'Cliente',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE membresias (
    id_membresia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    tipo_plan VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE rutinas (
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    nombre_ejercicio VARCHAR(100) NOT NULL,
    series INT,
    repeticiones INT,
    dia_semana VARCHAR(20),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia'),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    fecha_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE inventario (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_articulo VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    estado_equipo ENUM('Bueno', 'Mantenimiento', 'Dañado') DEFAULT 'Bueno'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol) VALUES
('Victor Administrator', 'admin@victorsgym.com', 'admin123', 'Administrador'),
('Jhoscar Ochoa', 'jhoscar@correo.com', 'cliente123', 'Cliente');

INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
VALUES
(2, 'Mensual', 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Activo');
