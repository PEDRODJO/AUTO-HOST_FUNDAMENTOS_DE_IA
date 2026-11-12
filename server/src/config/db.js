const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'TallerDB2',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  timezone: 'Z',
  charset: 'utf8mb4'
});

let readyPromise;
async function connect() {
  if (!readyPromise) {
    readyPromise = pool.query('SELECT 1').then(() => pool).catch(error => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}

pool.on('connection', connection => {
  connection.on('error', error => console.error('MySQL connection error:', error.message));
});

module.exports = { pool, connect };
