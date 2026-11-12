require('dotenv').config();
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const helmet = require('helmet');
const cors = require('cors');
const { connect } = require('./config/db');
const logger = require('./utils/logger');
const api = require('./routes/api');
const workshops = require('./routes/workshops');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use('/api', api);
app.use('/api/workshops', workshops);
const clientDist = path.resolve(__dirname, '../..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}
app.use((err, _req, res, _next) => {
  logger.error('Unhandled request error', { message: err.message, code: err.code || err.number });
  res.status(500).json({ error: 'Ocurrió un error interno.' });
});

const port = Number(process.env.PORT || 3000);
connect().then(() => app.listen(port, () => logger.info(`Server listening on ${port}`)))
  .catch(err => { logger.error('Database connection failed', { message: err.message }); process.exit(1); });
