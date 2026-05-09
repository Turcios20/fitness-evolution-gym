DROP DATABASE IF EXISTS fit_focus_db;
CREATE DATABASE fit_focus_db;
USE fit_focus_db;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador') NOT NULL DEFAULT 'Cliente',
    id_entrenador_asignado INT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_entrenador
FOREIGN KEY (id_entrenador_asignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

CREATE TABLE ajustes (
    id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_ajuste (id_usuario, clave)
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

CREATE TABLE planes_entrenamiento (
    id_plan INT AUTO_INCREMENT PRIMARY KEY,

    id_entrenador INT NOT NULL,
    id_cliente INT NOT NULL,

    nombre_plan VARCHAR(150) NOT NULL,
    objetivo TEXT,

    fecha_inicio DATE,
    fecha_fin DATE,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_entrenador)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    FOREIGN KEY (id_cliente)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE rutinas_entrenamiento (
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,

    nombre_ejercicio VARCHAR(100) NOT NULL,
    descripcion TEXT,

    dia_semana VARCHAR(20),

    series INT,
    repeticiones INT,
    duracion INT,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
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

CREATE TABLE clases (
    id_clase INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    entrenador VARCHAR(100),
    fecha_hora DATETIME NOT NULL,
    duracion_min INT DEFAULT 60,
    capacidad INT DEFAULT 20,
    disponibles INT DEFAULT 20
);

CREATE TABLE reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_clase INT NOT NULL,
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Confirmada', 'Cancelada') DEFAULT 'Confirmada',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_clase)   REFERENCES clases(id_clase)   ON DELETE CASCADE,
    UNIQUE KEY uq_reserva (id_usuario, id_clase)
);

CREATE TABLE medidas_progreso (
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

INSERT INTO usuarios (nombre_completo, correo, password, rol) VALUES
('Victor Administrator', 'admin@victorsgym.com', 'admin123', 'Administrador'),
('Jhoscar Ochoa', 'jhoscar@correo.com', 'cliente123', 'Cliente'),
('Maria Recepcion', 'recepcion@fitnessgym.com', 'recep123', 'Recepcionista'),
('Carlos Entrenador', 'entrenador@fitnessgym.com', 'train123', 'Entrenador');

INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
VALUES
(2, 'Mensual', 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Activo');

INSERT INTO clases (nombre, descripcion, entrenador, fecha_hora, duracion_min, capacidad, disponibles) VALUES
('Spinning Matutino',    'Clase de ciclismo indoor de alta intensidad', 'Carlos López',   DATE_ADD(NOW(), INTERVAL 1 DAY),  45, 15, 15),
('Yoga & Flexibilidad',  'Sesión de yoga y estiramiento para todos los niveles', 'Ana Martínez', DATE_ADD(NOW(), INTERVAL 2 DAY),  60, 12, 12),
('CrossFit Avanzado',    'Entrenamiento funcional de alta intensidad', 'Pedro Rojas',    DATE_ADD(NOW(), INTERVAL 3 DAY),  60, 10, 10),
('Zumba Fitness',        'Baile aeróbico al ritmo de la música latina', 'María Torres',  DATE_ADD(NOW(), INTERVAL 4 DAY),  60, 20, 20),
('Pilates Core',         'Fortalecimiento del núcleo y postura corporal', 'Laura Soto',   DATE_ADD(NOW(), INTERVAL 5 DAY),  50, 10, 10),
('Boxeo Funcional',      'Entrenamiento con técnicas de boxeo adaptadas', 'Roberto Cruz', DATE_ADD(NOW(), INTERVAL 6 DAY),  45, 12, 12);