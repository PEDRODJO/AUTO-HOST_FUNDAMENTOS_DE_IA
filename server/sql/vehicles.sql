-- Ejecutar después de schema.sql y workshops.sql en TallerDB2.
USE TallerDB2;

CREATE TABLE IF NOT EXISTS Vehiculos (
  id CHAR(36) NOT NULL,
  VIN VARCHAR(17) NOT NULL,
  Placa VARCHAR(10) NOT NULL,
  Marca VARCHAR(80) NOT NULL,
  Modelo VARCHAR(80) NOT NULL,
  Anio INT NOT NULL,
  Version VARCHAR(100) NOT NULL,
  Color VARCHAR(50) NOT NULL,
  Fotos JSON NOT NULL,
  Estatus ENUM('activo', 'en_taller', 'desactivado') NOT NULL DEFAULT 'activo',
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  MecanicoId CHAR(36) NULL,
  ClienteId CHAR(36) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_Vehiculos_VIN (VIN),
  UNIQUE KEY UQ_Vehiculos_Placa (Placa),
  KEY IX_Vehiculos_Active_Status_Created (IsActive, Estatus, CreatedAt),
  KEY IX_Vehiculos_Mecanico (MecanicoId),
  KEY IX_Vehiculos_Cliente (ClienteId),
  CONSTRAINT FK_Vehiculos_Mecanico FOREIGN KEY (MecanicoId) REFERENCES Users(UserId),
  CONSTRAINT FK_Vehiculos_Cliente FOREIGN KEY (ClienteId) REFERENCES Clients(ClientId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
