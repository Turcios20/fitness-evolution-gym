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
SELECT 'Maria Recepcion', 'recepcion@fitnessgym.com', 'recep123', 'Recepcionista'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'recepcion@fitnessgym.com'
);

INSERT INTO usuarios (nombre_completo, correo, password, rol)
SELECT 'Carlos Entrenador', 'entrenador@fitnessgym.com', 'train123', 'Entrenador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE correo = 'entrenador@fitnessgym.com'
);
