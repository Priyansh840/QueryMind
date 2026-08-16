/**
 * MYND BFF — Request ID Middleware
 * Attaches a unique request ID to every incoming request.
 */
const { v4: uuid } = require('uuid');

function requestId(req, res, next) {
  req.requestId = req.headers['x-request-id'] || `req_${uuid().slice(0, 12)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = requestId;
