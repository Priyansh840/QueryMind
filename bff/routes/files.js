const router = require('express').Router();
const multer = require('multer');
const { providers } = require('../config');
const { apiError } = require('../middleware/error-handler');

// Use memory storage for the mock layer, in reality this might stream to S3 or similar
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return next(apiError(400, 'VALIDATION_ERROR', 'No file provided.'));
    const result = await providers.files.upload(req.file);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const file = await providers.files.get(req.params.id);
    if (!file) return next(apiError(404, 'NOT_FOUND', 'File not found.'));
    res.json(file);
  } catch (e) { next(e); }
});

module.exports = router;
