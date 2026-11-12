const { connect } = require('../config/db');
const { CreateRoleCommand } = require('../patterns/command');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME = /^[\p{L}\p{N} _-]{2,60}$/u;

function roleInput(body = {}) {
  return { name: String(body.name || '').trim(), description: String(body.description || '').trim() };
}

function validate(input) {
  if (!NAME.test(input.name)) return 'El nombre del rol debe tener entre 2 y 60 caracteres alfanuméricos.';
  if (input.description.length > 250) return 'La descripción no puede superar 250 caracteres.';
  return null;
}

async function list(_req, res, next) {
  try {
    const pool = await connect();
    const [rows] = await pool.execute('SELECT RoleId, RoleName, Description, IsActive, CreatedAt, UpdatedAt FROM Roles ORDER BY IsActive DESC, RoleName');
    return res.json(rows);
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  const input = roleInput(req.body);
  const errorMessage = validate(input);
  if (errorMessage) return res.status(400).json({ error: errorMessage });
  try {
    const role = await new CreateRoleCommand(input.name, input.description).execute();
    return res.status(201).json(role);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un rol con ese nombre.' });
    return next(error);
  }
}

async function update(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador del rol no es válido.' });
  const input = roleInput(req.body);
  const errorMessage = validate(input);
  if (errorMessage) return res.status(400).json({ error: errorMessage });
  try {
    const pool = await connect();
    const [result] = await pool.execute('UPDATE Roles SET RoleName=?, Description=? WHERE RoleId=? AND IsActive=1', [input.name, input.description || null, req.params.id]);
    if (!result.affectedRows) {
      const [rows] = await pool.execute('SELECT RoleId FROM Roles WHERE RoleId=? AND IsActive=1', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'No se encontró el rol activo.' });
    }
    return res.json({ message: 'Rol actualizado correctamente.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un rol con ese nombre.' });
    return next(error);
  }
}

async function suspend(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador del rol no es válido.' });
  try {
    const pool = await connect();
    const [result] = await pool.execute('UPDATE Roles SET IsActive=0 WHERE RoleId=? AND IsActive=1', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el rol activo.' });
    return res.json({ message: 'Rol suspendido correctamente.' });
  } catch (error) { return next(error); }
}

module.exports = { list, create, update, suspend };
