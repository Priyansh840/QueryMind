const router = require('express').Router();
const { providers } = require('../config');
const { apiError } = require('../middleware/error-handler');
const { requireBody } = require('../middleware/validate');

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = await providers.spaces.list({ page: +page || 1, pageSize: +pageSize || 20 });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const space = await providers.spaces.get(req.params.id);
    if (!space) return next(apiError(404, 'NOT_FOUND', 'Space not found.'));
    res.json(space);
  } catch (e) { next(e); }
});

router.get('/:id/objects', async (req, res, next) => {
  try {
    const { page, pageSize, type } = req.query;
    const result = await providers.spaces.listObjects(req.params.id, { page: +page || 1, pageSize: +pageSize || 20, type });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id/graph', async (req, res, next) => {
  try {
    const graph = await providers.knowledge.getGraph(req.params.id);
    res.json(graph);
  } catch (e) { next(e); }
});

router.post('/', requireBody('name'), async (req, res, next) => {
  try {
    const space = await providers.spaces.create(req.body);
    res.status(201).json(space);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const space = await providers.spaces.update(req.params.id, req.body);
    if (!space) return next(apiError(404, 'NOT_FOUND', 'Space not found.'));
    res.json(space);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await providers.spaces.delete(req.params.id);
    if (!deleted) return next(apiError(404, 'NOT_FOUND', 'Space not found.'));
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
