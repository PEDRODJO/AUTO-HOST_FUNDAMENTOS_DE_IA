-- Migración para instalaciones existentes; ejecutar una sola vez en TallerDB2.
USE TallerDB2;

ALTER TABLE Talleres
  ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1 AFTER fk_estatus;
