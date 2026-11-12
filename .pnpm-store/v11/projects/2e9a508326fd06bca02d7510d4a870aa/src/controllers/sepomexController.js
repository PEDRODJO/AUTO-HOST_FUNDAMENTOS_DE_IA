const { connect } = require('../config/db');

async function byPostalCode(req, res, next) {
  const cp = String(req.params.cp || '').trim();
  if (!/^\d{5}$/.test(cp)) return res.status(400).json({ error: 'El código postal debe contener cinco dígitos.' });
  try {
    const pool = await connect();
    const [rows] = await pool.execute(
      'SELECT estado, municipio, colonia FROM Codigos_Postales WHERE codigo_postal = ?',
      [cp]
    );
    if (!rows.length) return res.status(404).json({ error: 'No se encontró ese código postal.' });
    return res.json({
      codigo_postal: cp,
      estado: rows[0].estado,
      municipio: rows[0].municipio,
      colonias: [...new Set(rows.map(row => row.colonia))]
    });
  } catch (error) { return next(error); }
}

module.exports = { byPostalCode };
