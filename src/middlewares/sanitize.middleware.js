const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/[<>]/g, '');
};

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  const sanitized = {};
  Object.entries(body).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => (typeof item === 'string' ? sanitizeString(item) : item));
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

const sanitizePayload = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeBody(req.body);
  }
  if (req.query) {
    req.query = sanitizeBody(req.query);
  }
  if (req.params) {
    req.params = sanitizeBody(req.params);
  }
  next();
};

module.exports = sanitizePayload;
