const {
  HTTP_STATUS_INTERNAL_ERROR
} = require('../../constants/startup/http');

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

function sendError(res, { statusCode = HTTP_STATUS_INTERNAL_ERROR, message = null, error = null } = {}) {
  const body = { success: false };
  if (message) {
    body.message = message;
  }
  if (error) {
    body.error = error;
  }
  return res.status(statusCode).json(body);
}

module.exports = {
  sendSuccess,
  sendError
};


