const router = require('express').Router();
const { providers } = require('../config');

router.get('/', async (req, res, next) => {
  try {
    const { q, space, type, page, pageSize } = req.query;
    const result = await providers.search.search(q || '', { spaceId: space, type, page: +page || 1, pageSize: +pageSize || 20 });
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
