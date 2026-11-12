const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../../uploads/workshops');
fs.mkdirSync(uploadDirectory, { recursive: true });
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] || '.img'}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => extensions[file.mimetype]
    ? callback(null, true)
    : callback(new Error('La fotografía debe ser JPG, PNG o WEBP.'))
});

function workshopPhotoUpload(req, res, next) {
  upload.single('fotografia')(req, res, error => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'La fotografía no puede superar 15 MB.'
      : error.message || 'No se pudo procesar la fotografía.';
    res.status(400).json({ error: message });
  });
}

function removeUploadedPhoto(req) {
  if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
}

module.exports = { workshopPhotoUpload, removeUploadedPhoto };
