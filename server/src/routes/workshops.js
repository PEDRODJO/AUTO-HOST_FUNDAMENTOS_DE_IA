const router = require('express').Router();
const path = require('node:path');
const { authenticate } = require('../middleware/auth');
const { workshopPhotoUpload } = require('../middleware/workshopUpload');
const { createWorkshop } = require('../controllers/workshopController');

router.get('/photos/:filename', authenticate, (req, res) => {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(req.params.filename)) return res.sendStatus(404);
  const photoPath = path.resolve(__dirname, '../../uploads/workshops', req.params.filename);
  res.sendFile(photoPath, error => { if (error && !res.headersSent) res.sendStatus(404); });
});
router.post('/', authenticate, workshopPhotoUpload, createWorkshop);

module.exports = router;
