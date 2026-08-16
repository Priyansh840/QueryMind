const router = require('express').Router();
const { providers } = require('../config');
const { apiError } = require('../middleware/error-handler');

router.get('/', async (req, res, next) => {
  try {
    const { spaceId, objectId, page, pageSize } = req.query;
    const result = await providers.activity.list({ spaceId, objectId, page: +page || 1, pageSize: +pageSize || 20 });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await providers.activity.get(req.params.id);
    if (!event) return next(apiError(404, 'NOT_FOUND', 'Activity event not found.'));
    res.json(event);
  } catch (e) { next(e); }
});

module.exports = router;
