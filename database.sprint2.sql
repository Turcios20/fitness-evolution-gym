ALTER TABLE usuarios
MODIFY COLUMN rol ENUM('Administrador', 'Cliente', 'Recepcionista', 'Entrenador')
NOT NULL DEFAULT 'Cliente';

CREATE TABLE IF NOT EXISTS ajustes (
    id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_ajuste (id_usuario, clave)
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Maria Recepcion', 'recepcion@fitnessgym.com', 'scrypt$0a042e96bed7a3b7b8723113ad691c46$2449c8bc631ecc355c5dd2aea03f41b289e7a81bd99fb01b4d594a6486271318043241bccace05f9ac15e4cdea01cbf5fd3f7a833a2e812ee3d9e8cbc332a39e', 'Recepcionista'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'recepcion@fitnessgym.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Carlos Entrenador', 'entrenador@fitnessgym.com', 'scrypt$4baeeadbcff8d99f8fb05126b4897dc8$5408a79cd95c1cc7317d8d8fbd3c4c7310d92e13c585b47daff1045d9a5249171ce6156f127a08757fa4675272af14089939f2ec29ac1e6e41dde925a722cc2e', 'Entrenador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'entrenador@fitnessgym.com'
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
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_measurement (id_usuario, fecha)
);
