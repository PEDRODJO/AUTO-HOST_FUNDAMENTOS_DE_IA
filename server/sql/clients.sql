-- Migración de una sola ejecución para instalaciones previas que tengan la tabla Clients
-- original (ClientId, FullName, Email, Phone, CreatedAt). Talleres debe existir primero.
USE TallerDB2;

ALTER TABLE Clients
  ADD COLUMN Nombre VARCHAR(80) NOT NULL DEFAULT '' AFTER ClientId,
  ADD COLUMN ApellidoPaterno VARCHAR(80) NOT NULL DEFAULT '' AFTER Nombre,
  ADD COLUMN ApellidoMaterno VARCHAR(80) NULL AFTER ApellidoPaterno,
  ADD COLUMN TelefonoPersonal VARCHAR(30) NOT NULL DEFAULT '' AFTER Email,
  ADD COLUMN TelefonoTrabajo VARCHAR(30) NULL AFTER TelefonoPersonal,
  ADD COLUMN TelefonoEmergencia VARCHAR(30) NOT NULL DEFAULT '' AFTER TelefonoTrabajo,
  ADD COLUMN NombreContactoEmergencia VARCHAR(120) NOT NULL DEFAULT '' AFTER TelefonoEmergencia,
  ADD COLUMN ApellidoPaternoContactoEmergencia VARCHAR(80) NOT NULL DEFAULT '' AFTER NombreContactoEmergencia,
  ADD COLUMN ApellidoMaternoContactoEmergencia VARCHAR(80) NULL AFTER ApellidoPaternoContactoEmergencia,
  ADD COLUMN Calle VARCHAR(160) NOT NULL DEFAULT '' AFTER NombreContactoEmergencia,
  ADD COLUMN Numero VARCHAR(30) NOT NULL DEFAULT '' AFTER Calle,
  ADD COLUMN Colonia VARCHAR(120) NOT NULL DEFAULT '' AFTER Numero,
  ADD COLUMN Estado VARCHAR(100) NOT NULL DEFAULT '' AFTER Colonia,
  ADD COLUMN Municipio VARCHAR(120) NOT NULL DEFAULT '' AFTER Estado,
  ADD COLUMN CodigoPostal VARCHAR(5) NOT NULL DEFAULT '' AFTER Municipio,
  ADD COLUMN TallerId CHAR(36) NULL AFTER CodigoPostal,
  ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1 AFTER TallerId,
  ADD COLUMN UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreatedAt;

-- Conserva los registros previos y lleva los datos disponibles a sus nuevas columnas.
UPDATE Clients
SET Nombre = SUBSTRING_INDEX(TRIM(FullName), ' ', 1),
    ApellidoPaterno = CASE WHEN LOCATE(' ', TRIM(FullName)) > 0
      THEN SUBSTRING_INDEX(SUBSTRING_INDEX(TRIM(FullName), ' ', 2), ' ', -1) ELSE '' END,
    ApellidoMaterno = CASE WHEN LENGTH(TRIM(FullName)) - LENGTH(REPLACE(TRIM(FullName), ' ', '')) > 1
      THEN SUBSTRING_INDEX(TRIM(FullName), ' ', -1) ELSE NULL END,
    TelefonoPersonal = COALESCE(Phone, '');

ALTER TABLE Clients
  DROP COLUMN FullName,
  DROP COLUMN Phone,
  ADD KEY IX_Clients_Taller_Active (TallerId, IsActive),
  ADD CONSTRAINT FK_Clients_Taller FOREIGN KEY (TallerId) REFERENCES Talleres(id);
