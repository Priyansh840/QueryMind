const router = require('express').Router();
const { providers } = require('../config');
const { apiError } = require('../middleware/error-handler');
const { requireBody } = require('../middleware/validate');

router.get('/:id', async (req, res, next) => {
  try {
    const obj = await providers.objects.get(req.params.id);
    if (!obj) return next(apiError(404, 'NOT_FOUND', 'Object not found.'));
    res.json(obj);
  } catch (e) { next(e); }
});

router.get('/:id/relationships', async (req, res, next) => {
  try {
    const rels = await providers.objects.getRelationships(req.params.id);
    res.json(rels);
  } catch (e) { next(e); }
});

router.get('/:id/activity', async (req, res, next) => {
  try {
    const events = await providers.objects.getActivity(req.params.id);
    res.json(events);
  } catch (e) { next(e); }
});

router.get('/:id/connections', async (req, res, next) => {
  try {
    const connections = await providers.knowledge.getConnections(req.params.id);
    res.json(connections);
  } catch (e) { next(e); }
});

router.get('/:id/memories', async (req, res, next) => {
  try {
    const memories = await providers.memory.getRelated(req.params.id);
    res.json(memories);
  } catch (e) { next(e); }
});

router.post('/', requireBody('type', 'title'), async (req, res, next) => {
  try {
    const obj = await providers.objects.create(req.body);
    res.status(201).json(obj);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const obj = await providers.objects.update(req.params.id, req.body);
    if (!obj) return next(apiError(404, 'NOT_FOUND', 'Object not found.'));
    res.json(obj);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await providers.objects.delete(req.params.id);
    if (!deleted) return next(apiError(404, 'NOT_FOUND', 'Object not found.'));
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
