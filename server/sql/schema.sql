-- MySQL initialization schema. Select this database in server/.env as DB_NAME.
CREATE DATABASE IF NOT EXISTS TallerDB2
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TallerDB2;

CREATE TABLE IF NOT EXISTS Roles (
  RoleId CHAR(36) NOT NULL,
  RoleName VARCHAR(60) NOT NULL,
  Description VARCHAR(250) NULL,
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (RoleId),
  UNIQUE KEY UQ_Roles_Name (RoleName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Users (
  UserId CHAR(36) NOT NULL,
  Email VARCHAR(254) NOT NULL,
  DisplayName VARCHAR(120) NOT NULL,
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (UserId),
  UNIQUE KEY UQ_Users_Email (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS IdentityCredentials (
  IdentityId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  PasswordSalt CHAR(32) NOT NULL,
  PasswordHash CHAR(128) NOT NULL,
  HashIterations INT NOT NULL,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdentityId),
  UNIQUE KEY UQ_Identity_User (UserId),
  CONSTRAINT FK_Identity_User FOREIGN KEY (UserId) REFERENCES Users(UserId),
  CONSTRAINT CK_Identity_Iterations CHECK (HashIterations >= 100000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS UserAdministration (
  AssignmentId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  RoleId CHAR(36) NOT NULL,
  AssignedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (AssignmentId),
  UNIQUE KEY UQ_UserAdministration_UserRole (UserId, RoleId),
  CONSTRAINT FK_UserAdministration_User FOREIGN KEY (UserId) REFERENCES Users(UserId),
  CONSTRAINT FK_UserAdministration_Role FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  ResetId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  TokenHash CHAR(64) NOT NULL,
  ExpiresAt DATETIME NOT NULL,
  UsedAt DATETIME NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ResetId),
  UNIQUE KEY UQ_PasswordReset_TokenHash (TokenHash),
  CONSTRAINT FK_Reset_User FOREIGN KEY (UserId) REFERENCES Users(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos SEPOMEX reales se cargan solo con `node import-sepomex.js`.
CREATE TABLE IF NOT EXISTS Codigos_Postales (
  codigo_postal VARCHAR(5) NOT NULL,
  colonia VARCHAR(100) NOT NULL,
  municipio VARCHAR(100) NOT NULL,
  estado VARCHAR(100) NOT NULL,
  UNIQUE KEY UQ_Codigos_Postales_CP_Colonia (codigo_postal, colonia),
  KEY IX_Codigos_Postales_CP (codigo_postal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO Roles (RoleId, RoleName, Description) VALUES
  ('11111111-1111-4111-8111-111111111111', 'administrador', 'Dueño del taller con acceso de administración.'),
  ('22222222-2222-4222-8222-222222222222', 'recepcionista', 'Registro y atención inicial de clientes.'),
  ('33333333-3333-4333-8333-333333333333', 'asesor de servicio', 'Atención y seguimiento de servicios.'),
  ('44444444-4444-4444-8444-444444444444', 'cliente', 'Cuenta de cliente del taller.'),
  ('55555555-5555-4555-8555-555555555555', 'mecánico', 'Técnico mecánico del taller.'),
  ('66666666-6666-4666-8666-666666666666', 'sistema', 'Cuenta técnica del sistema.');

-- Primera entrada: admin@taller.com / Taller2026!
-- PBKDF2-HMAC-SHA-512, 600000 iteraciones. El pepper está en server/sql/README.md.
SET @AdminRole := (SELECT RoleId FROM Roles WHERE RoleName='administrador' LIMIT 1);
SET @AdminId := (SELECT UserId FROM Users WHERE Email='admin@taller.com' LIMIT 1);
SET @AdminId := COALESCE(@AdminId, UUID());

INSERT INTO Users (UserId, Email, DisplayName)
SELECT @AdminId, 'admin@taller.com', 'Administrador del taller'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE Email='admin@taller.com');

INSERT INTO IdentityCredentials (IdentityId, UserId, PasswordSalt, PasswordHash, HashIterations)
SELECT UUID(), @AdminId, 'c23b12f1bfe41c80a7c6b52fa37e3d29',
       '7025c1e4a9c9877574fe832f28ce3d15c70e856758083da971c8bc1a8a84c8ef701c37a5feae7e09dbe84e3415208d1647629cc4dfb40c6fe41241ff36a3e455', 600000
WHERE NOT EXISTS (SELECT 1 FROM IdentityCredentials WHERE UserId=@AdminId);

INSERT INTO UserAdministration (AssignmentId, UserId, RoleId)
SELECT UUID(), @AdminId, @AdminRole
WHERE NOT EXISTS (SELECT 1 FROM UserAdministration WHERE UserId=@AdminId AND RoleId=@AdminRole);

