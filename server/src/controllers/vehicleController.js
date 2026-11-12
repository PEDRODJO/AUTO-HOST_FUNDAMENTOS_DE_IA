const crypto = require('node:crypto');
const path = require('node:path');
const { connect } = require('../config/db');
const { removeUploadedFiles } = require('../middleware/vehicleUpload');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIN = /^[a-hj-npr-z0-9]{17}$/;
const PLATE = /^(?:[a-z]{3}\d{4}|[a-z]{2}\d{4}[a-z]|[a-z]{3}\d{3}[a-z])$/;
const STATUSES = new Set(['activo', 'en_taller', 'desactivado']);
const fields = ['Marca', 'Modelo', 'Version', 'Color'];

function normalizeInput(body = {}) {
  return {
    VIN: String(body.VIN || '').trim().toLowerCase(),
    Placa: String(body.Placa || '').trim().toLowerCase().replace(/[\s-]+/g, ''),
    Marca: String(body.Marca || '').trim(),
    Modelo: String(body.Modelo || '').trim(),
    Anio: String(body.Anio || '').trim(),
    Version: String(body.Version || '').trim(),
    Color: String(body.Color || '').trim(),
    Estatus: String(body.Estatus || 'activo').trim().toLowerCase(),
    MecanicoId: String(body.MecanicoId || '').trim() || null
  };
}

function validate(input) {
  if (!VIN.test(input.VIN)) return 'El VIN debe contener 17 caracteres alfanuméricos en minúsculas y no puede incluir I, O o Q.';
  if (!PLATE.test(input.Placa)) return 'La placa no coincide con un formato mexicano admitido.';
  for (const field of fields) if (!input[field]) return `El campo ${field} es obligatorio.`;
  const limits = { Marca: 80, Modelo: 80, Version: 100, Color: 50 };
  for (const [field, limit] of Object.entries(limits)) if (input[field].length > limit) return `${field} no puede superar ${limit} caracteres.`;
  const year = Number(input.Anio);
  if (!/^\d{4}$/.test(input.Anio) || year < 1886 || year > new Date().getFullYear() + 1) return 'Indica un año de modelo válido.';
  if (!STATUSES.has(input.Estatus)) return 'El estatus debe ser activo, en_taller o desactivado.';
  if (input.MecanicoId && !UUID.test(input.MecanicoId)) return 'El mecánico seleccionado no es válido.';
  return null;
}

function photoPaths(files = []) { return files.map(file => `/api/vehicles/photos/${file.filename}`); }
function readPhotos(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function duplicateMessage(error) {
  if (/UQ_Vehiculos_VIN|\bVIN\b/i.test(error.message || '')) return 'El VIN ya está registrado.';
  if (/UQ_Vehiculos_Placa|\bPlaca\b/i.test(error.message || '')) return 'La placa ya está registrada.';
  return 'Ya existe un vehículo con ese VIN o placa.';
}
async function validMechanic(pool, mechanicId) {
  if (!mechanicId) return true;
  const [rows] = await pool.execute(`SELECT u.UserId FROM Users u
    JOIN UserAdministration a ON a.UserId=u.UserId
    JOIN Roles r ON r.RoleId=a.RoleId
    WHERE u.UserId=? AND u.IsActive=1 AND r.IsActive=1 AND LOWER(r.RoleName) IN ('mecánico','mecanico') LIMIT 1`, [mechanicId]);
  return rows.length > 0;
}

async function list(req, res, next) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(10, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  const includeInactive = ['true', '1'].includes(String(req.query.includeInactive || '').toLowerCase());
  const filter = includeInactive ? '' : 'WHERE v.IsActive=1';
  try {
    const pool = await connect();
    const [[countRows], [items]] = await Promise.all([
      pool.execute(`SELECT COUNT(*) AS total FROM Vehiculos v ${filter}`),
      pool.execute(`SELECT v.id, v.VIN, v.Placa, v.Marca, v.Modelo, v.Anio, v.Version, v.Color,
          v.Fotos, v.Estatus, v.IsActive, v.MecanicoId, v.ClienteId, v.CreatedAt, v.UpdatedAt,
          u.DisplayName AS MecanicoNombre,
          CONCAT_WS(' ', c.Nombre, c.ApellidoPaterno, c.ApellidoMaterno) AS ClienteNombre
        FROM Vehiculos v LEFT JOIN Users u ON u.UserId=v.MecanicoId
        LEFT JOIN Clients c ON c.ClientId=v.ClienteId
        ${filter} ORDER BY v.CreatedAt DESC, v.id LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    const total = Number(countRows[0].total);
    return res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), includeInactive });
  } catch (error) { return next(error); }
}

async function mechanics(_req, res, next) {
  try {
    const pool = await connect();
    const [rows] = await pool.execute(`SELECT DISTINCT u.UserId, u.DisplayName FROM Users u
      JOIN UserAdministration a ON a.UserId=u.UserId JOIN Roles r ON r.RoleId=a.RoleId
      WHERE u.IsActive=1 AND r.IsActive=1 AND LOWER(r.RoleName) IN ('mecánico','mecanico')
      ORDER BY u.DisplayName`);
    return res.json(rows);
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  const input = normalizeInput(req.body);
  const errorMessage = validate(input);
  if (errorMessage) { removeUploadedFiles(req); return res.status(400).json({ error: errorMessage }); }
  if (input.Estatus === 'desactivado') { removeUploadedFiles(req); return res.status(400).json({ error: 'Un vehículo nuevo no puede registrarse como desactivado.' }); }
  try {
    const pool = await connect();
    if (!await validMechanic(pool, input.MecanicoId)) { removeUploadedFiles(req); return res.status(400).json({ error: 'El mecánico debe ser un usuario activo con el rol mecánico.' }); }
    const id = crypto.randomUUID();
    const photos = photoPaths(req.files);
    await pool.execute(`INSERT INTO Vehiculos
      (id, VIN, Placa, Marca, Modelo, Anio, Version, Color, Fotos, Estatus, IsActive, MecanicoId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`, [id, input.VIN, input.Placa, input.Marca, input.Modelo,
      Number(input.Anio), input.Version, input.Color, JSON.stringify(photos), input.Estatus, input.MecanicoId]);
    return res.status(201).json({ id, message: 'Vehículo registrado correctamente.' });
  } catch (error) {
    removeUploadedFiles(req);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: duplicateMessage(error) });
    return next(error);
  }
}

async function update(req, res, next) {
  if (!UUID.test(req.params.id)) { removeUploadedFiles(req); return res.status(400).json({ error: 'El identificador del vehículo no es válido.' }); }
  const input = normalizeInput(req.body);
  const errorMessage = validate(input);
  if (errorMessage) { removeUploadedFiles(req); return res.status(400).json({ error: errorMessage }); }
  try {
    const pool = await connect();
    if (!await validMechanic(pool, input.MecanicoId)) { removeUploadedFiles(req); return res.status(400).json({ error: 'El mecánico debe ser un usuario activo con el rol mecánico.' }); }
    const [existingRows] = await pool.execute('SELECT Fotos FROM Vehiculos WHERE id=? AND IsActive=1', [req.params.id]);
    if (!existingRows.length) { removeUploadedFiles(req); return res.status(404).json({ error: 'No se encontró el vehículo activo.' }); }
    const photos = [...readPhotos(existingRows[0].Fotos), ...photoPaths(req.files)];
    const isActive = input.Estatus === 'desactivado' ? 0 : 1;
    const [result] = await pool.execute(`UPDATE Vehiculos SET VIN=?, Placa=?, Marca=?, Modelo=?, Anio=?, Version=?, Color=?,
      Fotos=?, Estatus=?, IsActive=?, MecanicoId=? WHERE id=? AND IsActive=1`, [input.VIN, input.Placa, input.Marca,
      input.Modelo, Number(input.Anio), input.Version, input.Color, JSON.stringify(photos), input.Estatus,
      isActive, input.MecanicoId, req.params.id]);
    if (!result.affectedRows) {
      const [stillActive] = await pool.execute('SELECT id FROM Vehiculos WHERE id=? AND IsActive=1', [req.params.id]);
      if (!stillActive.length) { removeUploadedFiles(req); return res.status(404).json({ error: 'No se encontró el vehículo activo.' }); }
    }
    return res.json({ message: isActive ? 'Vehículo actualizado correctamente.' : 'Vehículo desactivado correctamente.' });
  } catch (error) {
    removeUploadedFiles(req);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: duplicateMessage(error) });
    return next(error);
  }
}

async function remove(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador del vehículo no es válido.' });
  try {
    const pool = await connect();
    const [result] = await pool.execute("UPDATE Vehiculos SET IsActive=0, Estatus='desactivado' WHERE id=? AND IsActive=1", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el vehículo activo.' });
    return res.json({ message: 'Vehículo desactivado correctamente.' });
  } catch (error) { return next(error); }
}

function photo(req, res) {
  const filename = req.params.filename;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) return res.sendStatus(404);
  const photoPath = path.resolve(__dirname, '../../uploads/vehicles', filename);
  return res.sendFile(photoPath, error => { if (error && !res.headersSent) res.sendStatus(404); });
}

module.exports = { list, mechanics, create, update, remove, photo };
