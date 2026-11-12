-- Migración de una sola ejecución para la versión intermedia de Clients que tenía
-- NombreContactoEmergencia pero aún no guardaba los apellidos por separado.
USE TallerDB2;

ALTER TABLE Clients
  ADD COLUMN ApellidoPaternoContactoEmergencia VARCHAR(80) NOT NULL DEFAULT '' AFTER NombreContactoEmergencia,
  ADD COLUMN ApellidoMaternoContactoEmergencia VARCHAR(80) NULL AFTER ApellidoPaternoContactoEmergencia;
