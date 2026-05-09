ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS id_entrenador_asignado INT NULL AFTER rol;

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
