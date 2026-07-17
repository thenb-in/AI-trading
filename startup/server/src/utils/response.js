const {
  HTTP_STATUS_INTERNAL_ERROR
} = require('../constants/http');

function sendSuccess(res, { statusCode = 200, data = null, message = null } = {}) {
  const body = { success: true };
  if (data !== null) {
    body.data = data;
  }
  if (message) {
    body.message = message;
  }
  return res.status(statusCode).json(body);
}

function extractErrorMessage(error) {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (Array.isArray(error.errors) && error.errors.length) {
    return error.errors.map((e) => e.message).join('; ');
  }
  return error.message || null;
}

function sendError(res, { statusCode = HTTP_STATUS_INTERNAL_ERROR, message = null, error = null } = {}) {
  const body = { success: false };
  // Explicit message wins; otherwise surface the detail carried by the error.
  const resolvedMessage = message || extractErrorMessage(error);
  if (resolvedMessage) {
    body.message = resolvedMessage;
  }

  if (error && !(error instanceof Error)) {
    body.error = error;
  }
  return res.status(statusCode).json(body);
}

module.exports = {
  sendSuccess,
  sendError
};


