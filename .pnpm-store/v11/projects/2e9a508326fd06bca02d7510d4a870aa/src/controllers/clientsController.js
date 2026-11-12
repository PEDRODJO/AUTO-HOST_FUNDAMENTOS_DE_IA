const crypto = require('node:crypto');
const { connect } = require('../config/db');

const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const PHONE = /^[0-9+().\s-]{7,30}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = [
  'Nombre', 'ApellidoPaterno', 'ApellidoMaterno', 'Email', 'TelefonoPersonal',
  'TelefonoTrabajo', 'TelefonoEmergencia', 'NombreContactoEmergencia',
  'ApellidoPaternoContactoEmergencia', 'ApellidoMaternoContactoEmergencia',
  'Calle', 'Numero', 'Colonia', 'Estado', 'Municipio', 'CodigoPostal', 'TallerId'
];

function readInput(body = {}) {
  return Object.fromEntries(fields.map(field => [field, String(body[field] ?? '').trim()]));
}

function validate(input) {
  const required = ['Nombre', 'ApellidoPaterno', 'Email', 'TelefonoPersonal', 'TelefonoEmergencia', 'NombreContactoEmergencia', 'ApellidoPaternoContactoEmergencia', 'Calle', 'Numero', 'Colonia', 'Estado', 'Municipio', 'CodigoPostal', 'TallerId'];
  for (const field of required) if (!input[field]) return `El campo ${field} es obligatorio.`;
  if (input.Nombre.length > 80 || input.ApellidoPaterno.length > 80 || input.ApellidoMaterno.length > 80) return 'Los nombres y apellidos no pueden superar 80 caracteres.';
  if (!EMAIL.test(input.Email) || input.Email.length > 254) return 'El correo electrónico no tiene un formato válido.';
  for (const field of ['TelefonoPersonal', 'TelefonoEmergencia']) if (!PHONE.test(input[field])) return `El campo ${field} debe contener un teléfono válido.`;
  if (input.TelefonoTrabajo && !PHONE.test(input.TelefonoTrabajo)) return 'El teléfono de trabajo no tiene un formato válido.';
  if (input.NombreContactoEmergencia.length > 120) return 'El nombre del contacto de emergencia supera 120 caracteres.';
  if (input.ApellidoPaternoContactoEmergencia.length > 80 || input.ApellidoMaternoContactoEmergencia.length > 80) return 'Los apellidos del contacto de emergencia no pueden superar 80 caracteres.';
  if (!/^\d{5}$/.test(input.CodigoPostal)) return 'El código postal debe contener cinco dígitos.';
  if (!UUID.test(input.TallerId)) return 'Selecciona un taller válido.';
  const limits = { Calle: 160, Numero: 30, Colonia: 120, Estado: 100, Municipio: 120 };
  for (const [field, max] of Object.entries(limits)) if (input[field].length > max) return `${field} supera el máximo de ${max} caracteres.`;
  return null;
}

async function list(req, res, next) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  try {
    const pool = await connect();
    const [[countRows], [items]] = await Promise.all([
      pool.execute('SELECT COUNT(*) AS total FROM Clients WHERE IsActive=1'),
      pool.execute(`SELECT c.ClientId, c.Nombre, c.ApellidoPaterno, c.ApellidoMaterno, c.Email,
        c.TelefonoPersonal, c.TelefonoTrabajo, c.TelefonoEmergencia, c.NombreContactoEmergencia,
        c.ApellidoPaternoContactoEmergencia, c.ApellidoMaternoContactoEmergencia,
        c.Calle, c.Numero, c.Colonia, c.Estado, c.Municipio, c.CodigoPostal, c.TallerId,
        c.CreatedAt, c.UpdatedAt, t.nombre AS TallerNombre
        FROM Clients c LEFT JOIN Talleres t ON t.id=c.TallerId
        WHERE c.IsActive=1 ORDER BY c.Nombre, c.ApellidoPaterno, c.ClientId LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    const total = Number(countRows[0].total);
    return res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { return next(error); }
}

async function workshops(_req, res, next) {
  try {
    const pool = await connect();
    const [rows] = await pool.execute(`SELECT t.id, t.nombre FROM Talleres t
      JOIN Estatus e ON e.id=t.fk_estatus WHERE e.nombre_estatus='activo' AND t.IsActive=1 ORDER BY t.nombre`);
    return res.json(rows);
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  const input = readInput(req.body);
  input.Email = input.Email.toLowerCase();
  const validationError = validate(input);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const pool = await connect();
    const [workshop] = await pool.execute(`SELECT t.id FROM Talleres t JOIN Estatus e ON e.id=t.fk_estatus
      WHERE t.id=? AND e.nombre_estatus='activo' AND t.IsActive=1`, [input.TallerId]);
    if (!workshop.length) return res.status(400).json({ error: 'El taller seleccionado no existe.' });
    const id = crypto.randomUUID();
    await pool.execute(`INSERT INTO Clients
      (ClientId, Nombre, ApellidoPaterno, ApellidoMaterno, Email, TelefonoPersonal, TelefonoTrabajo,
       TelefonoEmergencia, NombreContactoEmergencia, ApellidoPaternoContactoEmergencia,
       ApellidoMaternoContactoEmergencia, Calle, Numero, Colonia, Estado, Municipio,
       CodigoPostal, TallerId, IsActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, input.Nombre, input.ApellidoPaterno, input.ApellidoMaterno || null, input.Email,
      input.TelefonoPersonal, input.TelefonoTrabajo || null, input.TelefonoEmergencia,
      input.NombreContactoEmergencia, input.ApellidoPaternoContactoEmergencia,
      input.ApellidoMaternoContactoEmergencia || null, input.Calle, input.Numero, input.Colonia, input.Estado,
      input.Municipio, input.CodigoPostal, input.TallerId]);
    return res.status(201).json({ id, message: 'Cliente creado correctamente.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un cliente con ese correo electrónico.' });
    return next(error);
  }
}

async function update(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador de cliente no es válido.' });
  const input = readInput(req.body);
  input.Email = input.Email.toLowerCase();
  const validationError = validate(input);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const pool = await connect();
    const [workshop] = await pool.execute(`SELECT t.id FROM Talleres t JOIN Estatus e ON e.id=t.fk_estatus
      WHERE t.id=? AND e.nombre_estatus='activo' AND t.IsActive=1`, [input.TallerId]);
    if (!workshop.length) return res.status(400).json({ error: 'El taller seleccionado no existe.' });
    const [result] = await pool.execute(`UPDATE Clients SET Nombre=?, ApellidoPaterno=?, ApellidoMaterno=?,
      Email=?, TelefonoPersonal=?, TelefonoTrabajo=?, TelefonoEmergencia=?, NombreContactoEmergencia=?,
      ApellidoPaternoContactoEmergencia=?, ApellidoMaternoContactoEmergencia=?,
      Calle=?, Numero=?, Colonia=?, Estado=?, Municipio=?, CodigoPostal=?, TallerId=?
      WHERE ClientId=? AND IsActive=1`, [input.Nombre, input.ApellidoPaterno, input.ApellidoMaterno || null,
      input.Email, input.TelefonoPersonal, input.TelefonoTrabajo || null, input.TelefonoEmergencia,
      input.NombreContactoEmergencia, input.ApellidoPaternoContactoEmergencia,
      input.ApellidoMaternoContactoEmergencia || null, input.Calle, input.Numero, input.Colonia, input.Estado,
      input.Municipio, input.CodigoPostal, input.TallerId, req.params.id]);
    if (!result.affectedRows) {
      const [exists] = await pool.execute('SELECT ClientId FROM Clients WHERE ClientId=? AND IsActive=1', [req.params.id]);
      if (!exists.length) return res.status(404).json({ error: 'No se encontró el cliente activo.' });
    }
    return res.json({ message: 'Cliente actualizado correctamente.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un cliente con ese correo electrónico.' });
    return next(error);
  }
}

async function remove(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador de cliente no es válido.' });
  try {
    const pool = await connect();
    const [result] = await pool.execute('UPDATE Clients SET IsActive=0 WHERE ClientId=? AND IsActive=1', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el cliente activo.' });
    return res.json({ message: 'Cliente desactivado correctamente.' });
  } catch (error) { return next(error); }
}

async function vehicleOptions(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador de cliente no es válido.' });
  try {
    const pool = await connect();
    const [clients] = await pool.execute('SELECT ClientId FROM Clients WHERE ClientId=? AND IsActive=1', [req.params.id]);
    if (!clients.length) return res.status(404).json({ error: 'No se encontró el cliente activo.' });
    const [assigned] = await pool.execute(`SELECT id, VIN, Placa, Marca, Modelo, Anio, Estatus, IsActive
      FROM Vehiculos WHERE ClienteId=? ORDER BY CreatedAt DESC`, [req.params.id]);
    const [available] = await pool.execute(`SELECT id, VIN, Placa, Marca, Modelo, Anio FROM Vehiculos
      WHERE ClienteId IS NULL AND IsActive=1 AND Estatus='activo' ORDER BY Marca, Modelo, Anio DESC`);
    return res.json({ assigned, available });
  } catch (error) { return next(error); }
}

async function vehicleAssignmentClients(req, res, next) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(10, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  try {
    const pool = await connect();
    const [[countRows], [items]] = await Promise.all([
      pool.execute('SELECT COUNT(*) AS total FROM Clients WHERE IsActive=1'),
      pool.execute(`SELECT ClientId, Nombre, ApellidoPaterno, ApellidoMaterno
        FROM Clients WHERE IsActive=1 ORDER BY Nombre, ApellidoPaterno, ClientId LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    const total = Number(countRows[0].total);
    return res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { return next(error); }
}

async function associateVehicle(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'El identificador de cliente no es válido.' });
  const vehicleId = String(req.body.vehicleId || '');
  if (!UUID.test(vehicleId)) return res.status(400).json({ error: 'Selecciona un vehículo válido.' });
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [clients] = await connection.execute('SELECT ClientId FROM Clients WHERE ClientId=? AND IsActive=1 FOR UPDATE', [req.params.id]);
    if (!clients.length) { await connection.rollback(); return res.status(404).json({ error: 'No se encontró el cliente activo.' }); }
    const [vehicles] = await connection.execute('SELECT id, ClienteId, IsActive, Estatus FROM Vehiculos WHERE id=? FOR UPDATE', [vehicleId]);
    const vehicle = vehicles[0];
    if (!vehicle || Number(vehicle.IsActive) !== 1) { await connection.rollback(); return res.status(404).json({ error: 'No se encontró un vehículo activo.' }); }
    if (vehicle.ClienteId || vehicle.Estatus !== 'activo') { await connection.rollback(); return res.status(409).json({ error: 'El vehículo ya no está disponible para asignarse.' }); }
    await connection.execute('UPDATE Vehiculos SET ClienteId=? WHERE id=? AND ClienteId IS NULL AND IsActive=1 AND Estatus=\'activo\'', [req.params.id, vehicleId]);
    await connection.commit();
    return res.json({ message: 'Vehículo asociado correctamente al cliente.' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    return next(error);
  } finally { connection?.release(); }
}

module.exports = { list, workshops, create, update, remove, vehicleOptions, vehicleAssignmentClients, associateVehicle };
