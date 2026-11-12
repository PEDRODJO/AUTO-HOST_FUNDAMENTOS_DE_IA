const { connect } = require('../config/db');

async function customers(req, res, next) {
  try {
    const pool = await connect();
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM Clients WHERE IsActive=1');
    return res.json({ total: Number(rows[0].total) });
  } catch (err) { return next(err); }
}

module.exports = { customers };
