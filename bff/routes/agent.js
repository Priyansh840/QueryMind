const router = require('express').Router();
const { providers } = require('../config');
const { apiError } = require('../middleware/error-handler');
const { requireBody } = require('../middleware/validate');

// Start a new agent run
router.post('/runs', requireBody('intent'), async (req, res, next) => {
  try {
    const run = await providers.agent.startRun(req.body);
    res.status(201).json(run);
  } catch (e) { next(e); }
});

// Get run status
router.get('/runs/:runId', async (req, res, next) => {
  try {
    const run = await providers.agent.getRun(req.params.runId);
    if (!run) return next(apiError(404, 'NOT_FOUND', 'Agent run not found.'));
    res.json(run);
  } catch (e) { next(e); }
});

// Stream run events (SSE)
router.get('/runs/:runId/stream', async (req, res, next) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-Id': req.requestId
    });

    const stream = providers.agent.streamRun(req.params.runId);
    for await (const event of stream) {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (e) { next(e); }
});

module.exports = router;
