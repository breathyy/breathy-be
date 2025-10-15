const config = require('../config/env.config');
const { normalizePhone, recordOutboundText } = require('./chat.service');

let cachedConnection = null;

const parseConnectionString = (connectionString) => {
  if (!connectionString) {
    return null;
  }
  const parts = connectionString.split(';').filter(Boolean);
  const info = {};
  for (const part of parts) {
    const [rawKey, rawValue] = part.split('=', 2);
    if (rawKey && rawValue) {
      info[rawKey.trim().toLowerCase()] = rawValue.trim();
    }
  }
  if (!info.endpoint || !info.accesskey) {
    return null;
  }
  return {
    endpoint: info.endpoint.replace(/\/?$/, ''),
    accessKey: info.accesskey
  };
};

const getConnectionInfo = () => {
  if (!cachedConnection) {
    cachedConnection = parseConnectionString(config.acsConnectionString);
  }
  return cachedConnection;
};

const isConfigured = () => Boolean(config.acsConnectionString && config.acsWhatsAppNumber && getConnectionInfo());

const formatRecipient = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return null;
  }
  return normalized;
};

const buildWhatsAppEnvelope = (recipients, textBody, metadata) => ({
  from: `whatsapp:${config.acsWhatsAppNumber}`,
  to: recipients.map((recipient) => `whatsapp:${recipient}`),
  channelType: 'whatsapp',
  message: {
    contentType: 'text',
    text: {
      body: textBody
    }
  },
  metadata: metadata || {}
});

const sendWhatsAppText = async ({ to, message, caseId = null, metadata = {}, dryRun = false }) => {
  if (!isConfigured()) {
    const error = new Error('ACS messaging is not configured');
    error.status = 503;
    throw error;
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map(formatRecipient)
    .filter(Boolean);

  if (recipients.length === 0) {
    const error = new Error('At least one valid recipient is required');
    error.status = 400;
    throw error;
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    const error = new Error('Message body is required');
    error.status = 400;
    throw error;
  }

  const payload = buildWhatsAppEnvelope(recipients, message.trim(), metadata);

  if (caseId) {
    await recordOutboundText(caseId, message.trim(), {
      provider: 'ACS_WHATSAPP',
      recipients,
      sendStatus: dryRun ? 'DRY_RUN' : 'PENDING',
      metadata
    });
  }

  const connection = getConnectionInfo();
  if (!connection) {
    const error = new Error('Invalid ACS connection string');
    error.status = 500;
    throw error;
  }

  if (dryRun) {
    return {
      status: 'dry-run',
      endpoint: connection.endpoint,
      payload
    };
  }

  // TODO: integrate with Azure Communication Services Messages API once channel registration details are available.
  return {
    status: 'scheduled',
    endpoint: connection.endpoint,
    payload
  };
};

module.exports = {
  isConfigured,
  sendWhatsAppText,
  buildWhatsAppEnvelope
};
