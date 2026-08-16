const router = require('express').Router();
const { providers } = require('../config');
const { requireBody } = require('../middleware/validate');

router.post('/', requireBody('type', 'content'), async (req, res, next) => {
  try {
    const result = await providers.capture.create(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

module.exports = router;
