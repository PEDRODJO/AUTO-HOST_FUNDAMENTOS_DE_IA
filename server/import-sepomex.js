require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { connect, pool } = require('./src/config/db');

const INPUT_FILE = path.join(__dirname, 'sepomex.json');
const BATCH_SIZE = 500;
const CODE_KEYS = ['codigo_postal', 'codigoPostal', 'd_codigo', 'cp', 'CP', 'codigo'];
const COLONY_KEYS = ['colonia', 'd_asenta', 'asentamiento', 'nombre_colonia'];
const MUNICIPALITY_KEYS = ['municipio', 'd_mnpio', 'nombre_municipio'];
const STATE_KEYS = ['estado', 'd_estado', 'nombre_estado'];
const NESTED_KEYS = ['codigos_postales', 'codigosPostales', 'postcodes', 'registros', 'records', 'data'];

function firstValue(record, keys) {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return '';
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && CODE_KEYS.some(key => value[key] !== undefined);
}

function flattenRecords(payload) {
  if (Array.isArray(payload)) return payload.flatMap(item => isRecord(item) ? [item] : flattenRecords(item));
  if (!payload || typeof payload !== 'object') return [];
  if (isRecord(payload)) return [payload];
  for (const key of NESTED_KEYS) if (payload[key] !== undefined) return flattenRecords(payload[key]);
  return [];
}

function normalizeRecord(record) {
  let codigoPostal = String(firstValue(record, CODE_KEYS)).trim();
  if (/^\d{1,5}$/.test(codigoPostal)) codigoPostal = codigoPostal.padStart(5, '0');
  const normalized = {
    codigo_postal: codigoPostal,
    colonia: String(firstValue(record, COLONY_KEYS)).trim(),
    municipio: String(firstValue(record, MUNICIPALITY_KEYS)).trim(),
    estado: String(firstValue(record, STATE_KEYS)).trim()
  };
  if (!/^\d{5}$/.test(normalized.codigo_postal)
    || !normalized.colonia || normalized.colonia.length > 100
    || !normalized.municipio || normalized.municipio.length > 100
    || !normalized.estado || normalized.estado.length > 100) return null;
  return normalized;
}

async function importSepomex() {
  const json = await fs.readFile(INPUT_FILE, 'utf8');
  const payload = JSON.parse(json);
  const unique = new Map();
  for (const source of flattenRecords(payload)) {
    const record = normalizeRecord(source);
    if (record) unique.set(`${record.codigo_postal}|${record.colonia}`, record);
  }
  const records = [...unique.values()];
  if (!records.length) throw new Error('sepomex.json no contiene filas válidas con CP, colonia, municipio y estado.');

  const db = await connect();
  let imported = 0;
  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
    const batch = records.slice(offset, offset + BATCH_SIZE);
    const placeholders = batch.map(() => '(?, ?, ?, ?)').join(', ');
    const values = batch.flatMap(record => [record.codigo_postal, record.colonia, record.municipio, record.estado]);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`
        INSERT INTO Codigos_Postales (codigo_postal, colonia, municipio, estado)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE municipio=VALUES(municipio), estado=VALUES(estado)`, values);
      await connection.commit();
      imported += batch.length;
      console.log(`Importados ${imported} de ${records.length} registros SEPOMEX.`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
  console.log(`Importación SEPOMEX completada: ${records.length} registros procesados; no se generaron datos de muestra.`);
}

importSepomex()
  .catch(error => { console.error(`No se pudo importar SEPOMEX: ${error.message}`); process.exitCode = 1; })
  .finally(() => pool.end());
