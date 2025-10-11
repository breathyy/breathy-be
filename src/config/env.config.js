const dotenv = require('dotenv');

dotenv.config();

const parseThresholds = (value) => {
  const parts = value.split('|').map((part) => Number(part.trim())).filter((part) => !Number.isNaN(part));
  return parts.length > 0 ? parts : [0.4, 0.7];
};

const config = {
  port: Number(process.env.APP_PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  triageAlpha: Number(process.env.TRIAGE_ALPHA) || 0.6,
  triageThresholds: parseThresholds(process.env.TRIAGE_THRESHOLDS || '0.4|0.7')
};

module.exports = config;
