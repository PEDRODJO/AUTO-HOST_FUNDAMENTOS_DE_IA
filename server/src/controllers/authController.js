const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { connect } = require('../config/db');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const { CreateUserCommand } = require('../patterns/command');
const logger = require('../utils/logger');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/mailer');

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const pool = await connect();
    const [rows] = await pool.execute(`
      SELECT u.UserId, u.Email, u.DisplayName, i.PasswordSalt, i.PasswordHash, i.HashIterations,
        GROUP_CONCAT(DISTINCT r.RoleName ORDER BY r.RoleName SEPARATOR ',') AS Roles
      FROM Users u JOIN IdentityCredentials i ON i.UserId=u.UserId
      LEFT JOIN UserAdministration a ON a.UserId=u.UserId
      LEFT JOIN Roles r ON r.RoleId=a.RoleId AND r.IsActive=1
      WHERE u.Email=? AND u.IsActive=1
      GROUP BY u.UserId,u.Email,u.DisplayName,i.PasswordSalt,i.PasswordHash,i.HashIterations`, [email]);
    const user = rows[0];
    const valid = user && await verifyPassword(password, user.PasswordSalt, user.PasswordHash, user.HashIterations);
    if (!valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    const roles = user.Roles ? user.Roles.split(',') : [];
    const token = jwt.sign({ sub: user.UserId, email: user.Email, name: user.DisplayName, roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    logger.info('Successful login', { userId: user.UserId });
    return res.json({ token, user: { email: user.Email, name: user.DisplayName, roles } });
  } catch (err) { return next(err); }
}

async function register(req, res, next) {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || typeof password !== 'string' || password.length < 10) return res.status(400).json({ error: 'Indica nombre, correo y contraseña de al menos 10 caracteres.' });
    const pool = await connect();
    const [roles] = await pool.execute('SELECT RoleId FROM Roles WHERE RoleName=? AND IsActive=1', ['cliente']);
    if (!roles[0]) return res.status(500).json({ error: 'No está configurado el rol cliente.' });
    const passwordRecord = await hashPassword(password);
    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(name).trim();
    const userId = await new CreateUserCommand({ email: normalizedEmail, displayName, passwordRecord, roleId: roles[0].RoleId }).execute();
    logger.info('User registered', { userId });
    let emailSent = true;
    try { await sendWelcomeEmail({ to: normalizedEmail, name: displayName }); }
    catch (mailError) { emailSent = false; logger.error('Welcome email delivery failed', { userId, message: mailError.message }); }
    return res.status(201).json({
      emailSent,
      message: emailSent ? 'Cuenta creada. Revisa tu correo de bienvenida.' : 'La cuenta se creó, pero no se pudo enviar el correo de bienvenida.'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese correo ya está registrado.' });
    return next(err);
  }
}

async function requestReset(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const pool = await connect();
    const [users] = await pool.execute('SELECT UserId, DisplayName FROM Users WHERE Email=? AND IsActive=1', [email]);
    if (users[0]) {
      const raw = crypto.randomBytes(32).toString('hex');
      const digest = crypto.createHash('sha256').update(raw).digest('hex');
      const resetId = crypto.randomUUID();
      await pool.execute(
        'INSERT INTO PasswordResetTokens (ResetId, UserId, TokenHash, ExpiresAt) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))',
        [resetId, users[0].UserId, digest]
      );
      try {
        await sendPasswordResetEmail({ to: email, name: users[0].DisplayName, token: raw });
      } catch (mailError) {
        await pool.execute('UPDATE PasswordResetTokens SET UsedAt=UTC_TIMESTAMP() WHERE TokenHash=?', [digest]);
        logger.error('Password reset email delivery failed', { userId: users[0].UserId, message: mailError.message });
        return res.status(503).json({ error: 'No fue posible enviar el correo. Inténtalo de nuevo más tarde.' });
      }
    }
    return res.json({ message: 'Correo enviado exitosamente. Por favor revisa tu bandeja de entrada.' });
  } catch (err) { return next(err); }
}

async function resetPassword(req, res, next) {
  const { token, password } = req.body;
  if (!token || typeof password !== 'string' || password.length < 10) return res.status(400).json({ error: 'Token y contraseña de al menos 10 caracteres requeridos.' });
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(`
      SELECT ResetId, UserId FROM PasswordResetTokens
      WHERE TokenHash=? AND UsedAt IS NULL AND ExpiresAt>UTC_TIMESTAMP()
      LIMIT 1 FOR UPDATE`, [digest]);
    if (!rows[0]) {
      await connection.rollback();
      return res.status(400).json({ error: 'El enlace no es válido o ha caducado.' });
    }
    const record = await hashPassword(password);
    await connection.execute(
      'UPDATE IdentityCredentials SET PasswordSalt=?, PasswordHash=?, HashIterations=?, UpdatedAt=UTC_TIMESTAMP() WHERE UserId=?',
      [record.salt, record.hash, record.iterations, rows[0].UserId]
    );
    await connection.execute('UPDATE PasswordResetTokens SET UsedAt=UTC_TIMESTAMP() WHERE ResetId=?', [rows[0].ResetId]);
    await connection.commit();
    return res.json({ message: 'Contraseña actualizada. Inicia sesión con tu nueva clave.' });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    return next(err);
  } finally { connection?.release(); }
}

module.exports = { login, register, requestReset, resetPassword };
