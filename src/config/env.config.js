const dotenv = require('dotenv');

dotenv.config();

const parseThresholds = (value) => {
  const parts = value.split('|').map((part) => Number(part.trim())).filter((part) => !Number.isNaN(part));
  return parts.length > 0 ? parts : [0.4, 0.7];
};

const parseCsvList = (value) => {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

const config = {
  port: Number(process.env.APP_PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  storageContainer: process.env.STORAGE_CONTAINER || 'breathy-images',
  openAiKey: process.env.OPENAI_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  azureCvEndpoint: process.env.AZURE_CV_ENDPOINT || '',
  azureCvKey: process.env.AZURE_CV_KEY || '',
  acsConnectionString: process.env.ACS_CONNECTION_STRING || '',
  acsWhatsAppNumber: process.env.ACS_WHATSAPP_NUMBER || '',
  acsChannelId: process.env.ACS_CHANNEL_ID || process.env.ACS_WHATSAPP_NUMBER || '',
  appInsightsConnectionString: process.env.APPINSIGHTS_CONNECTION_STRING || '',
  triageAlpha: Number(process.env.TRIAGE_ALPHA) || 0.6,
  triageThresholds: parseThresholds(process.env.TRIAGE_THRESHOLDS || '0.4|0.7'),
  storageCorsAllowedOrigins: parseCsvList(
    process.env.STORAGE_CORS_ALLOWED_ORIGINS || 'http://localhost:3000,https://breathy-fe.vercel.app,https://breathyy.vercel.app'
  )
};

module.exports = config;
