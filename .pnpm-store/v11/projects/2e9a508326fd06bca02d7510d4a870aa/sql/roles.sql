-- Migración de una sola ejecución para instalaciones con la versión previa de Roles.
USE TallerDB2;

ALTER TABLE Roles
  ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1 AFTER Description,
  ADD COLUMN UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreatedAt;
