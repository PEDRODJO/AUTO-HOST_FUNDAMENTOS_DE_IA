-- MySQL: run after schema.sql in TallerDB2.
USE TallerDB2;

CREATE TABLE IF NOT EXISTS Estatus (
  id CHAR(36) NOT NULL,
  nombre_estatus VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_Estatus_Nombre (nombre_estatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO Estatus (id, nombre_estatus) VALUES
  ('680f54c5-1576-4f1b-98b7-63d4b6a40401', 'activo'),
  ('680f54c5-1576-4f1b-98b7-63d4b6a40402', 'inactivo'),
  ('680f54c5-1576-4f1b-98b7-63d4b6a40403', 'suspendido');

CREATE TABLE IF NOT EXISTS Talleres (
  id CHAR(36) NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  rfc VARCHAR(13) NOT NULL,
  email VARCHAR(254) NOT NULL,
  calle VARCHAR(160) NOT NULL,
  numero VARCHAR(30) NOT NULL,
  colonia VARCHAR(120) NOT NULL,
  codigo_postal CHAR(5) NOT NULL,
  estado VARCHAR(100) NOT NULL,
  municipio VARCHAR(120) NOT NULL,
  ruta_fotografia VARCHAR(500) NOT NULL,
  fk_estatus CHAR(36) NOT NULL DEFAULT '680f54c5-1576-4f1b-98b7-63d4b6a40401',
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_Talleres_RFC (rfc),
  UNIQUE KEY UQ_Talleres_Email (email),
  CONSTRAINT FK_Talleres_Estatus FOREIGN KEY (fk_estatus) REFERENCES Estatus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Clients (
  ClientId CHAR(36) NOT NULL,
  Nombre VARCHAR(80) NOT NULL,
  ApellidoPaterno VARCHAR(80) NOT NULL,
  ApellidoMaterno VARCHAR(80) NULL,
  Email VARCHAR(254) NOT NULL,
  TelefonoPersonal VARCHAR(30) NOT NULL,
  TelefonoTrabajo VARCHAR(30) NULL,
  TelefonoEmergencia VARCHAR(30) NOT NULL,
  NombreContactoEmergencia VARCHAR(120) NOT NULL,
  ApellidoPaternoContactoEmergencia VARCHAR(80) NOT NULL,
  ApellidoMaternoContactoEmergencia VARCHAR(80) NULL,
  Calle VARCHAR(160) NOT NULL,
  Numero VARCHAR(30) NOT NULL,
  Colonia VARCHAR(120) NOT NULL,
  Estado VARCHAR(100) NOT NULL,
  Municipio VARCHAR(120) NOT NULL,
  CodigoPostal VARCHAR(5) NOT NULL,
  TallerId CHAR(36) NULL,
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ClientId),
  UNIQUE KEY UQ_Clients_Email (Email),
  KEY IX_Clients_Taller_Active (TallerId, IsActive),
  CONSTRAINT FK_Clients_Taller FOREIGN KEY (TallerId) REFERENCES Talleres(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
