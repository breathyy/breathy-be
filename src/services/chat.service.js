const { getPrisma } = require('../config/prisma.config');
const nluService = require('./nlu.service');

const activeStatuses = ['IN_CHATBOT', 'WAITING_DOCTOR'];

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

const ensureUser = async (prisma, phoneNumber, displayName) => {
  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) {
    const error = new Error('Invalid phone number');
    error.status = 400;
    throw error;
  }
  const existing = await prisma.users.findUnique({ where: { phone_number: normalizedPhone } });
  if (existing) {
    return existing;
  }
  return prisma.users.create({
    data: {
      phone_number: normalizedPhone,
      display_name: displayName || null
    }
  });
};

const ensureActiveCase = async (prisma, userId) => {
  const existing = await prisma.cases.findFirst({
    where: {
      user_id: userId,
      status: { in: activeStatuses }
    },
    orderBy: { created_at: 'desc' }
  });
  if (existing) {
    return existing;
  }
  return prisma.cases.create({
    data: {
      user_id: userId,
      status: 'IN_CHATBOT',
      triage_metadata: {}
    }
  });
};

const createChatMessage = async (prisma, caseId, messageType, content, blobRef, meta) => {
  return prisma.chat_messages.create({
    data: {
      case_id: caseId,
      message_type: messageType,
      content,
      blob_ref: blobRef || null,
      meta: meta || {}
    }
  });
};

const recordOutboundText = async (caseId, content, meta = {}) => {
  const prisma = getPrisma();
  return prisma.chat_messages.create({
    data: {
      case_id: caseId,
      message_type: 'text',
      content,
      blob_ref: null,
      meta: {
        direction: 'OUTBOUND',
        ...meta
      }
    }
  });
};

const processIncomingMessage = async (payload) => {
  const prisma = getPrisma();
  const { from, text, media, messageId, timestamp, name, type } = payload || {};
  const messageType = type === 'image' ? 'image' : 'text';
  const user = await ensureUser(prisma, from, name);
  const activeCase = await ensureActiveCase(prisma, user.id);
  let content = null;
  let blobRef = null;
  const meta = {
    messageId: messageId || null,
    timestamp: timestamp || new Date().toISOString(),
    raw: {}
  };
  if (messageType === 'text') {
    content = text && typeof text.body === 'string' ? text.body : null;
    meta.raw = text || {};
  } else {
    content = media && typeof media.caption === 'string' ? media.caption : null;
    blobRef = media && media.blobName ? media.blobName : null;
    meta.raw = media || {};
  }
  if (messageType === 'text' && content) {
    try {
      const nluResult = await nluService.evaluateText({ caseId: activeCase.id, text: content, prisma });
      meta.nlu = {
        severitySymptom: nluResult.severitySymptom
      };
    } catch (error) {
      meta.nlu = {
        error: error.message
      };
    }
  }
  const chatMessage = await createChatMessage(prisma, activeCase.id, messageType, content, blobRef, meta);
  await prisma.cases.update({
    where: { id: activeCase.id },
    data: { updated_at: new Date() }
  });
  return {
    user,
    case: activeCase,
    chatMessage
  };
};

module.exports = {
  processIncomingMessage,
  normalizePhone,
  recordOutboundText,
  ensureActiveCase
};
