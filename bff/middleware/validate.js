/**
 * MYND BFF — Validation Middleware
 * Lightweight request validation helpers.
 */
const { apiError } = require('./error-handler');

/**
 * Validates that required body fields are present.
 * @param {string[]} fields
 */
function requireBody(...fields) {
  return (req, _res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next(apiError(400, 'VALIDATION_ERROR', 'Request body is required.'));
    }
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        return next(apiError(400, 'VALIDATION_ERROR', `Missing required field: ${field}`));
      }
    }
    next();
  };
}

/**
 * Validates that a route param exists and is non-empty.
 * @param {string} param
 */
function requireParam(param) {
  return (req, _res, next) => {
    if (!req.params[param]) {
      return next(apiError(400, 'VALIDATION_ERROR', `Missing required parameter: ${param}`));
    }
    next();
  };
}

module.exports = { requireBody, requireParam };
