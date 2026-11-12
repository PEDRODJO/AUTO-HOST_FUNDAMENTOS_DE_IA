const jwt = require('jsonwebtoken');
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Autenticación requerida.' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Sesión inválida o expirada.' }); }
}
function requireAdmin(req, res, next) {
  if (!req.user?.roles?.includes('administrador')) return res.status(403).json({ error: 'Permiso insuficiente.' });
  next();
}
function requireVehicleAccess(req, res, next) {
  const roles = req.user?.roles || [];
  // `administrador` es el nombre histórico de la cuenta admin sembrada en este proyecto.
  if (!roles.some(role => ['admin', 'administrador', 'recepcionista'].includes(role))) {
    return res.status(403).json({ error: 'Se requiere el rol admin o recepcionista.' });
  }
  next();
}
module.exports = { authenticate, requireAdmin, requireVehicleAccess };
