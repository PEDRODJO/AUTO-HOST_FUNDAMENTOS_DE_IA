const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../../uploads/vehicles');
fs.mkdirSync(uploadDirectory, { recursive: true });
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] || '.img'}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => extensions[file.mimetype]
    ? callback(null, true)
    : callback(new Error('Las fotografías deben ser JPG, PNG o WEBP.'))
});

function removeUploadedFiles(req) {
  for (const file of req.files || []) if (file.path) fs.promises.unlink(file.path).catch(() => {});
}

function vehiclePhotoUpload(req, res, next) {
  upload.array('fotos', 10)(req, res, error => {
    if (!error) return next();
    removeUploadedFiles(req);
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Cada fotografía puede pesar como máximo 15 MB.'
      : error.code === 'LIMIT_FILE_COUNT'
        ? 'Se permiten hasta 10 fotografías por vehículo.'
        : error.message || 'No se pudieron procesar las fotografías.';
    return res.status(400).json({ error: message });
  });
}

module.exports = { vehiclePhotoUpload, removeUploadedFiles };
