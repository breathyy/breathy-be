const jwt = require('jsonwebtoken');
const config = require('../config/env.config');

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getJwtSecret = () => {
  if (config.jwtSecret && config.jwtSecret.trim().length > 0) {
    return config.jwtSecret;
  }
  throw createError(500, 'JWT secret not configured');
};

const extractToken = (headerValue) => {
  if (!headerValue) {
    return null;
  }
  if (typeof headerValue !== 'string') {
    return null;
  }
  const trimmed = headerValue.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return null;
};

const decodeToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    const err = createError(401, 'Invalid or expired token');
    err.cause = error;
    throw err;
  }
};

const attachUserContext = (req, payload) => {
  req.user = {
    id: payload.sub,
    role: payload.role,
    userId: payload.userId || null,
    tokenId: payload.jti || null
  };
};

const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      throw createError(401, 'Authorization required');
    }
    const payload = decodeToken(token);
    attachUserContext(req, payload);
    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuthenticate = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return next();
    }
    const payload = decodeToken(token);
    attachUserContext(req, payload);
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(createError(401, 'Authorization required'));
  }
  if (roles.length > 0) {
    const normalizedRoles = roles.map((role) => String(role).toUpperCase());
    if (!normalizedRoles.includes(String(req.user.role).toUpperCase())) {
      return next(createError(403, 'Forbidden'));
    }
  }
  return next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole
};
