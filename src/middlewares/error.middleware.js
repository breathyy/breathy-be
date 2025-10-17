const { trackException, trackTrace } = require('../services/appInsightsService');

const errorMiddleware = (error, req, res, next) => {
  void next;
  const status = error.status || 500;
  const path = req.originalUrl ? req.originalUrl.split('?')[0] : 'unknown';
  const payload = {
    error: status >= 500 ? 'Internal Server Error' : (error.message || 'Error')
  };
  if (status >= 500) {
    console.error(error);
  }
  trackException(error, { status, path });
  if (status >= 400) {
    trackTrace('http_error', {
      status,
      path,
      method: req.method
    });
  }
  res.status(status).json(payload);
};

module.exports = errorMiddleware;
