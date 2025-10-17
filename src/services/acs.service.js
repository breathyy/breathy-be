const crypto = require('crypto');
const config = require('../config/env.config');

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

const normalizePhone = (input) => {
  if (!input) {
    return null;
  }
  const trimmed = String(input).trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  if (trimmed.startsWith('0')) {
    return `+62${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const numeric = trimmed.replace(/\D/g, '');
  if (numeric.length === 0) {
    return null;
  }
  return `+${numeric}`;
};

const getConnectionInfo = () => {
  if (!cachedConnection) {
    cachedConnection = parseConnectionString(config.acsConnectionString);
  }
  return cachedConnection;
};

const isConfigured = () =>
  Boolean(config.acsConnectionString && config.acsWhatsAppNumber && config.acsChannelId && getConnectionInfo());

const formatRecipients = (to) => {
  return (Array.isArray(to) ? to : [to]).map(normalizePhone).filter(Boolean);
};

const generateContentHash = (payload) => {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('base64');
};

const buildAuthorizationHeader = ({ method, url, payload, accessKey, dateHeader }) => {
  const parsedUrl = new URL(url);
  const pathAndQuery = parsedUrl.pathname + (parsedUrl.search || '');
  const signedHeaders = 'x-ms-date;host;x-ms-content-sha256';
  const contentHash = generateContentHash(payload);
  const canonicalHeaders = `x-ms-date:${dateHeader}\nhost:${parsedUrl.host}\nx-ms-content-sha256:${contentHash}\n`;
  const stringToSign = `${method.toUpperCase()}\n${pathAndQuery}\n${canonicalHeaders}`;
  const signature = crypto
    .createHmac('sha256', Buffer.from(accessKey, 'base64'))
    .update(stringToSign, 'utf8')
    .digest('base64');
  return {
    authorization: `HMAC-SHA256 SignedHeaders=${signedHeaders}&Signature=${signature}`,
    contentHash
  };
};

const dispatchWhatsAppMessage = async ({ recipients, message, metadata }) => {
  const connection = getConnectionInfo();
  const apiVersion = '2023-11-15-preview';
  const url = `${connection.endpoint}/whatsapp/messages?api-version=${apiVersion}`;
  const payload = {
    channelRegistrationId: config.acsChannelId,
    from: `whatsapp:${config.acsWhatsAppNumber}`,
    to: recipients.map((recipient) => ({ to: `whatsapp:${recipient}` })),
    message: {
      contentType: 'text',
      text: {
        body: message
      }
    }
  };
  if (metadata && Object.keys(metadata).length > 0) {
    payload.message.metadata = metadata;
  }
  const body = JSON.stringify(payload);
  const dateHeader = new Date().toUTCString();
  const { authorization, contentHash } = buildAuthorizationHeader({
    method: 'POST',
    url,
    payload: body,
    accessKey: connection.accessKey,
    dateHeader
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ms-date': dateHeader,
      'x-ms-content-sha256': contentHash,
      Authorization: authorization
    },
    body
  });

  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = responseText;
  }

  if (!response.ok) {
    const error = new Error('ACS WhatsApp request failed');
    error.status = response.status;
    error.body = parsed;
    throw error;
  }

  return parsed;
};

const resolveMediaUrl = (input) => {
  if (!input) {
    return null;
  }
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  const connection = getConnectionInfo();
  if (!connection) {
    return null;
  }
  const normalizedPath = String(input).replace(/^\/+/, '');
  return `${connection.endpoint}/${normalizedPath}`;
};

const downloadMedia = async ({ mediaUrl }) => {
  if (!isConfigured()) {
    const error = new Error('ACS messaging is not configured');
    error.status = 503;
    throw error;
  }
  const resolvedUrl = resolveMediaUrl(mediaUrl);
  if (!resolvedUrl) {
    const error = new Error('Media URL is required');
    error.status = 400;
    throw error;
  }
  const connection = getConnectionInfo();
  if (!connection) {
    const error = new Error('Invalid ACS connection string');
    error.status = 500;
    throw error;
  }
  const payload = '';
  const dateHeader = new Date().toUTCString();
  const { authorization, contentHash } = buildAuthorizationHeader({
    method: 'GET',
    url: resolvedUrl,
    payload,
    accessKey: connection.accessKey,
    dateHeader
  });

  const response = await fetch(resolvedUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/octet-stream',
      'x-ms-date': dateHeader,
      'x-ms-content-sha256': contentHash,
      Authorization: authorization
    }
  });

  if (!response.ok) {
    const error = new Error('ACS media download failed');
    error.status = response.status;
    try {
      error.body = await response.text();
    } catch {
      error.body = null;
    }
    throw error;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || null;
  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : buffer.length;

  return {
    buffer,
    contentType,
    contentLength,
    mediaUrl: resolvedUrl
  };
};

const sendWhatsAppText = async ({ to, message, metadata = {}, dryRun = false }) => {
  if (!isConfigured()) {
    const error = new Error('ACS messaging is not configured');
    error.status = 503;
    throw error;
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    const error = new Error('Message body is required');
    error.status = 400;
    throw error;
  }

  const recipients = formatRecipients(to);
  if (recipients.length === 0) {
    const error = new Error('At least one valid recipient is required');
    error.status = 400;
    throw error;
  }

  const connection = getConnectionInfo();
  if (!connection) {
    const error = new Error('Invalid ACS connection string');
    error.status = 500;
    throw error;
  }

  const trimmedMessage = message.trim();

  if (dryRun) {
    return {
      status: 'dry-run',
      endpoint: connection.endpoint,
      recipients,
      metadata
    };
  }

  try {
    const response = await dispatchWhatsAppMessage({ recipients, message: trimmedMessage, metadata });
    return {
      status: 'submitted',
      endpoint: connection.endpoint,
      recipients,
      metadata,
      response
    };
  } catch (error) {
    return {
      status: 'failed',
      endpoint: connection.endpoint,
      recipients,
      metadata,
      error: error.body || error.message,
      statusCode: error.status || 500
    };
  }
};

module.exports = {
  isConfigured,
  sendWhatsAppText,
  normalizePhone,
  downloadMedia
};
