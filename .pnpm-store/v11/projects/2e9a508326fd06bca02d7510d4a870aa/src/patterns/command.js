const crypto = require('node:crypto');
const { connect } = require('../config/db');

// Command: each operation groups its writes in one MySQL transaction.
class CreateRoleCommand {
  constructor(name, description) { this.name = name; this.description = description; }
  async execute() {
    const pool = await connect();
    const connection = await pool.getConnection();
    const roleId = crypto.randomUUID();
    try {
      await connection.beginTransaction();
      await connection.execute('INSERT INTO Roles (RoleId, RoleName, Description) VALUES (?, ?, ?)', [roleId, this.name, this.description]);
      await connection.commit();
      return { RoleId: roleId, RoleName: this.name, Description: this.description, CreatedAt: new Date() };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
}

class CreateUserCommand {
  constructor({ email, displayName, passwordRecord, roleId }) { Object.assign(this, { email, displayName, passwordRecord, roleId }); }
  async execute() {
    const pool = await connect();
    const connection = await pool.getConnection();
    const userId = crypto.randomUUID();
    try {
      await connection.beginTransaction();
      await connection.execute('INSERT INTO Users (UserId, Email, DisplayName) VALUES (?, ?, ?)', [userId, this.email, this.displayName]);
      await connection.execute(
        'INSERT INTO IdentityCredentials (IdentityId, UserId, PasswordSalt, PasswordHash, HashIterations) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, this.passwordRecord.salt, this.passwordRecord.hash, this.passwordRecord.iterations]
      );
      await connection.execute(
        'INSERT INTO UserAdministration (AssignmentId, UserId, RoleId) VALUES (?, ?, ?)',
        [crypto.randomUUID(), userId, this.roleId]
      );
      await connection.commit();
      return userId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
}
module.exports = { CreateRoleCommand, CreateUserCommand };
