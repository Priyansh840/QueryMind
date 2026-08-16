const router = require('express').Router();
const { providers } = require('../config');
const { apiError } = require('../middleware/error-handler');

router.get('/search', async (req, res, next) => {
  try {
    const { q, spaceId, objectId, limit } = req.query;
    const memories = await providers.memory.search(q || '', { spaceId, objectId, limit: +limit || 10 });
    res.json(memories);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const memory = await providers.memory.get(req.params.id);
    if (!memory) return next(apiError(404, 'NOT_FOUND', 'Memory not found.'));
    res.json(memory);
  } catch (e) { next(e); }
});

module.exports = router;
