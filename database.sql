DROP DATABASE IF EXISTS fit_focus_db;
CREATE DATABASE fit_focus_db;
USE fit_focus_db;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador') NOT NULL DEFAULT 'Cliente',
    estado_usuario ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    id_entrenador_asignado INT NULL,
    objetivo_personal ENUM('Bajar de peso', 'Ganar masa muscular', 'Mejorar resistencia', 'Otro') NULL,
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

CREATE TABLE configuracion_gimnasio (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor VARCHAR(500),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion_gimnasio (clave, valor) VALUES
('nombre', 'FITNESS EVOLUTIONS GYM'),
('eslogan', 'Evoluciona tu cuerpo, transforma tu vida'),
('nit', '0614-120593-101-1'),
('telefono', '+503 2234-5678'),
('correo', 'info@fitnessevolutions.com'),
('sitio_web', 'https://fitnessevolutions.com'),
('direccion', 'Blvd. del Ejercito, local 12'),
('ciudad', 'San Salvador'),
('pais', 'El Salvador');

CREATE TABLE horarios_gimnasio (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    dia_semana TINYINT NOT NULL UNIQUE,
    nombre_dia VARCHAR(20) NOT NULL,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO horarios_gimnasio (dia_semana, nombre_dia, hora_apertura, hora_cierre, activo) VALUES
(1, 'Lunes', '05:00', '22:00', 1),
(2, 'Martes', '05:00', '22:00', 1),
(3, 'Miercoles', '05:00', '22:00', 1),
(4, 'Jueves', '05:00', '22:00', 1),
(5, 'Viernes', '05:00', '21:00', 1),
(6, 'Sabado', '07:00', '18:00', 1),
(7, 'Domingo', '08:00', '13:00', 0);

CREATE TABLE planes_membresia (
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

INSERT INTO planes_membresia (nombre, precio, duracion_dias, periodo, caracteristicas, popular, orden) VALUES
('Mensual', 35, 30, '/mes', '["Acceso completo","Clases grupales","Vestuarios"]', 1, 1),
('Trimestral', 90, 90, '/3 meses', '["Acceso completo","Clases grupales","1 sesion con trainer"]', 0, 2),
('Anual', 300, 365, '/ano', '["Acceso completo","Clases ilimitadas","4 sesiones con trainer"]', 0, 3);

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
    numero_factura VARCHAR(40) NULL UNIQUE,
    concepto VARCHAR(120) NULL,
    tipo_registro ENUM('Alta', 'Renovacion', 'Manual') NOT NULL DEFAULT 'Manual',
    plan_nombre VARCHAR(50) NULL,
    vigencia_hasta DATE NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE pagos_personal (
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
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE egresos_financieros (
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
    asignada_por INT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_clase)   REFERENCES clases(id_clase)   ON DELETE CASCADE,
    FOREIGN KEY (asignada_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
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

CREATE TABLE progreso_fotos (
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

INSERT INTO usuarios (nombre_completo, correo, password, rol) VALUES
('Victor Administrator', 'admin@fitness-evolution-gym.pro', 'scrypt$570c284b352cdb7554b79e8d9761b985$270ca31f944e595a51dc2af96bec57b20bfd512867313d3ed53090a6900bdb18f067c2c47b53415af7784911e868334788ecb16db9c92ad85e58142a922bb2b8', 'Administrador'),
('Jhoscar Ochoa', 'jhoscar@correo.com', 'scrypt$3466b1aad71f0f3e256cbfefab1e1063$24c261ef725dbe8b18b494152ddc877fab8f7699617a95cf1509fa44eb9e5f084dc0b6c7e3364c062a4e4bc2fe4319c1cf66e07239866d8a814acf607963b2f4', 'Cliente'),
('Maria Recepcion', 'maria.recepcion@gmail.com', 'scrypt$0a042e96bed7a3b7b8723113ad691c46$2449c8bc631ecc355c5dd2aea03f41b289e7a81bd99fb01b4d594a6486271318043241bccace05f9ac15e4cdea01cbf5fd3f7a833a2e812ee3d9e8cbc332a39e', 'Recepcionista'),
('Carlos Entrenador', 'carlos.entrenador@gmail.com', 'scrypt$4baeeadbcff8d99f8fb05126b4897dc8$5408a79cd95c1cc7317d8d8fbd3c4c7310d92e13c585b47daff1045d9a5249171ce6156f127a08757fa4675272af14089939f2ec29ac1e6e41dde925a722cc2e', 'Entrenador');

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

INSERT INTO clases (nombre, descripcion, entrenador, fecha_hora, duracion_min, capacidad, disponibles) VALUES
('Spinning Matutino',    'Clase de ciclismo indoor de alta intensidad', 'Carlos López',   DATE_ADD(NOW(), INTERVAL 1 DAY),  45, 15, 15),
('Yoga & Flexibilidad',  'Sesión de yoga y estiramiento para todos los niveles', 'Ana Martínez', DATE_ADD(NOW(), INTERVAL 2 DAY),  60, 12, 12),
('CrossFit Avanzado',    'Entrenamiento funcional de alta intensidad', 'Pedro Rojas',    DATE_ADD(NOW(), INTERVAL 3 DAY),  60, 10, 10),
('Zumba Fitness',        'Baile aeróbico al ritmo de la música latina', 'María Torres',  DATE_ADD(NOW(), INTERVAL 4 DAY),  60, 20, 20),
('Pilates Core',         'Fortalecimiento del núcleo y postura corporal', 'Laura Soto',   DATE_ADD(NOW(), INTERVAL 5 DAY),  50, 10, 10),
('Boxeo Funcional',      'Entrenamiento con técnicas de boxeo adaptadas', 'Roberto Cruz', DATE_ADD(NOW(), INTERVAL 6 DAY),  45, 12, 12);
