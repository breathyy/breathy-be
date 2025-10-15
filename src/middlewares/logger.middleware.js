const { trackTrace, trackMetric } = require('../services/appInsightsService');

const loggerMiddleware = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - started;
    const routeKey = (req.route && req.route.path) || req.originalUrl.split('?')[0];
    console.info(`${req.method} ${routeKey} ${res.statusCode} ${duration}ms`);
    trackTrace('http_request', {
      method: req.method,
      path: routeKey,
      status: res.statusCode,
      duration
    });
    trackMetric('http_response_duration_ms', duration, {
      method: req.method,
      path: routeKey,
      status: res.statusCode
    });
  });
  next();
};

module.exports = loggerMiddleware;
