/**
 * MYND BFF — Error Handler Middleware
 * Normalizes all errors into the standard API error format.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : status === 401 ? 'UNAUTHORIZED' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR');

  console.error(`[${req.requestId || 'unknown'}] ${status} ${code}: ${err.message}`);

  res.status(status).json({
    error: {
      code,
      message: err.expose ? err.message : (status >= 500 ? 'An internal error occurred.' : err.message),
      requestId: req.requestId || 'unknown'
    }
  });
}

/**
 * Creates a typed API error.
 * @param {number} status
 * @param {string} code
 * @param {string} message
 */
function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.expose = true;
  return err;
}

module.exports = { errorHandler, apiError };
