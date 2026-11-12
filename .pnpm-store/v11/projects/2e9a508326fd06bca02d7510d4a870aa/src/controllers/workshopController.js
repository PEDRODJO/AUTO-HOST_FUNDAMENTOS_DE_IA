const crypto = require('node:crypto');
const { connect } = require('../config/db');
const { removeUploadedPhoto } = require('../middleware/workshopUpload');

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
// Formato SAT: 3 letras para persona moral o 4 para persona física, fecha YYMMDD y homoclave.
const RFC_REGEX = /^[a-zñ&]{3,4}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[a-z0-9]{3}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requiredFields = ['nombre', 'rfc', 'email', 'calle', 'numero', 'colonia', 'codigo_postal', 'estado', 'municipio'];

async function createWorkshop(req, res, next) {
  // Normalización solicitada: los campos de texto se convierten a minúsculas antes de validar o guardar.
  const data = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toLowerCase() : value]));

  for (const field of requiredFields) {
    if (typeof data[field] !== 'string' || !data[field]) {
      removeUploadedPhoto(req);
      return res.status(400).json({ error: `El campo ${field.replaceAll('_', ' ')} es obligatorio.` });
    }
  }
  if (!EMAIL_REGEX.test(data.email)) {
    removeUploadedPhoto(req);
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
  }
  if (!RFC_REGEX.test(data.rfc)) {
    removeUploadedPhoto(req);
    return res.status(400).json({ error: 'El RFC no tiene un formato mexicano válido (12 caracteres para persona moral o 13 para persona física).' });
  }
  if (!/^\d{5}$/.test(data.codigo_postal)) {
    removeUploadedPhoto(req);
    return res.status(400).json({ error: 'El código postal debe contener cinco dígitos.' });
  }
  if (!req.file) return res.status(400).json({ error: 'La fotografía del taller es obligatoria.' });

  try {
    const pool = await connect();
    const workshopId = crypto.randomUUID();
    const activeStatusId = '680f54c5-1576-4f1b-98b7-63d4b6a40401';
    await pool.execute(`INSERT INTO Talleres
      (id, nombre, rfc, email, calle, numero, colonia, codigo_postal, estado, municipio, ruta_fotografia, fk_estatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      workshopId, data.nombre, data.rfc, data.email, data.calle, data.numero,
      data.colonia, data.codigo_postal, data.estado, data.municipio,
      `/api/workshops/photos/${req.file.filename}`, activeStatusId
    ]);

    // TODO: Implementar en una fase futura el registro de clientes y su asociación con el taller.
    return res.status(201).json({
      message: 'Taller registrado correctamente.',
      taller: { id: workshopId, nombre: data.nombre, rfc: data.rfc, email: data.email, fk_estatus: activeStatusId, ruta_fotografia: `/api/workshops/photos/${req.file.filename}` }
    });
  } catch (error) {
    removeUploadedPhoto(req);
    if (error.code === 'ER_DUP_ENTRY') {
      const message = /UQ_Talleres_RFC|rfc/i.test(error.message) ? 'El RFC ya está registrado.' : /UQ_Talleres_Email|email/i.test(error.message) ? 'El correo electrónico ya está registrado.' : 'Ya existe un taller con ese RFC o correo electrónico.';
      return res.status(409).json({ error: message });
    }
    return next(error);
  }
}

async function listWorkshops(req, res, next) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  try {
    const pool = await connect();
    const [[countRows], [items]] = await Promise.all([
      pool.execute('SELECT COUNT(*) AS total FROM Talleres'),
      pool.execute(`SELECT t.id, t.nombre, t.rfc, t.email, t.calle, t.numero, t.colonia,
        t.codigo_postal, t.estado, t.municipio, t.ruta_fotografia, t.fk_estatus, t.IsActive,
        t.creado_en, e.nombre_estatus AS estatus
        FROM Talleres t LEFT JOIN Estatus e ON e.id=t.fk_estatus
        ORDER BY t.creado_en DESC, t.nombre LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    const total = Number(countRows[0].total);
    return res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { return next(error); }
}

async function updateWorkshop(req, res, next) {
  if (!UUID_REGEX.test(req.params.id)) {
    removeUploadedPhoto(req);
    return res.status(400).json({ error: 'El identificador del taller no es válido.' });
  }
  const data = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toLowerCase() : value]));
  for (const field of requiredFields) {
    if (typeof data[field] !== 'string' || !data[field]) {
      removeUploadedPhoto(req);
      return res.status(400).json({ error: `El campo ${field.replaceAll('_', ' ')} es obligatorio.` });
    }
  }
  if (!EMAIL_REGEX.test(data.email) || !RFC_REGEX.test(data.rfc) || !/^\d{5}$/.test(data.codigo_postal)) {
    removeUploadedPhoto(req);
    return res.status(400).json({ error: 'Revisa el formato del correo electrónico, RFC mexicano (fecha y homoclave) y código postal.' });
  }
  try {
    const pool = await connect();
    const [result] = await pool.execute(`UPDATE Talleres SET nombre=?, rfc=?, email=?, calle=?, numero=?, colonia=?,
      codigo_postal=?, estado=?, municipio=?${req.file ? ', ruta_fotografia=?' : ''}
      WHERE id=? AND IsActive=1`, [data.nombre, data.rfc, data.email, data.calle, data.numero,
      data.colonia, data.codigo_postal, data.estado, data.municipio,
      ...(req.file ? [`/api/workshops/photos/${req.file.filename}`] : []), req.params.id]);
    if (!result.affectedRows) {
      const [rows] = await pool.execute('SELECT id FROM Talleres WHERE id=? AND IsActive=1', [req.params.id]);
      removeUploadedPhoto(req);
      if (!rows.length) return res.status(404).json({ error: 'No se encontró el taller activo.' });
    }
    return res.json({ message: 'Taller actualizado correctamente.' });
  } catch (error) {
    removeUploadedPhoto(req);
    if (error.code === 'ER_DUP_ENTRY') {
      const message = /UQ_Talleres_RFC|rfc/i.test(error.message) ? 'El RFC ya está registrado.' : /UQ_Talleres_Email|email/i.test(error.message) ? 'El correo electrónico ya está registrado.' : 'Ya existe un taller con ese RFC o correo electrónico.';
      return res.status(409).json({ error: message });
    }
    return next(error);
  }
}

async function softDeleteWorkshop(req, res, next) {
  if (!UUID_REGEX.test(req.params.id)) return res.status(400).json({ error: 'El identificador del taller no es válido.' });
  try {
    const pool = await connect();
    const [result] = await pool.execute('UPDATE Talleres SET IsActive=0 WHERE id=? AND IsActive=1', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el taller activo.' });
    return res.json({ message: 'Taller desactivado correctamente.' });
  } catch (error) { return next(error); }
}

module.exports = { createWorkshop, listWorkshops, updateWorkshop, softDeleteWorkshop };
