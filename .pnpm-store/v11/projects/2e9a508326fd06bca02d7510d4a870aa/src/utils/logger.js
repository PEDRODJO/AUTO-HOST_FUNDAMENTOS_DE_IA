const fs = require('node:fs');
const path = require('node:path');
const events = require('../patterns/observer');
const logDir = path.join(__dirname, '../../logs');
fs.mkdirSync(logDir, { recursive: true });

events.subscribe(event => {
  const line = JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n';
  fs.appendFile(path.join(logDir, 'application.log'), line, err => {
    if (err) console.error('Unable to write application log:', err.message);
  });
  console.log(line.trim());
});

module.exports = {
  info(message, data = {}) { events.publish({ level: 'info', message, ...data }); },
  error(message, data = {}) { events.publish({ level: 'error', message, ...data }); }
};
