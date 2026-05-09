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
