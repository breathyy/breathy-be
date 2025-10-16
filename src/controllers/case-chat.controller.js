const { getPrisma } = require('../config/prisma.config');
const blobService = require('../services/blob.service');
const chatService = require('../services/chat.service');

const buildDownloadReference = (blobName) => {
  if (!blobName || !blobService.isConfigured()) {
    return null;
  }
  try {
    return blobService.generateDownloadUrl(blobName);
  } catch (error) {
    return null;
  }
};

const assertCaseAccess = async ({ prisma, caseId, userContext }) => {
  if (!caseId) {
    const error = new Error('caseId is required');
    error.status = 400;
    throw error;
  }
  if (!userContext || !userContext.role) {
    const error = new Error('Authorization required');
    error.status = 401;
    throw error;
  }
  if (userContext.role === 'PATIENT') {
    if (userContext.caseId && userContext.caseId !== caseId) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const ownedCase = await prisma.cases.findFirst({
      where: {
        id: caseId,
        user_id: userContext.id
      },
      select: { id: true }
    });
    if (!ownedCase) {
      const error = new Error('Case not found');
      error.status = 404;
      throw error;
    }
    return ownedCase;
  }
  const caseRecord = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { id: true }
  });
  if (!caseRecord) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }
  return caseRecord;
};

const listCaseChat = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { limit: limitRaw } = req.query;
    const limitValue = Number(limitRaw);
    const limit = Number.isNaN(limitValue) ? 100 : Math.min(Math.max(limitValue, 1), 200);
    const prisma = getPrisma();
    await assertCaseAccess({ prisma, caseId, userContext: req.user });

    const messages = await prisma.chat_messages.findMany({
      where: { case_id: caseId },
      orderBy: { created_at: 'asc' },
      take: limit
    });

    const blobRefs = messages
      .filter((message) => message.message_type === 'image' && message.blob_ref)
      .map((message) => message.blob_ref);

    let imageLookup = new Map();
    if (blobRefs.length > 0) {
      const uniqueBlobRefs = Array.from(new Set(blobRefs));
      const images = await prisma.images.findMany({
        where: {
          case_id: caseId,
          blob_name: { in: uniqueBlobRefs }
        }
      });
      imageLookup = new Map(images.map((image) => [image.blob_name, image]));
    }

    const items = messages.map((message) => {
      const base = {
        id: message.id,
        caseId,
        type: message.message_type,
        content: message.content,
        blobRef: message.blob_ref,
        meta: message.meta || {},
        createdAt: message.created_at
      };
      if (message.message_type === 'image' && message.blob_ref) {
        const download = buildDownloadReference(message.blob_ref);
        const relatedImage = imageLookup.get(message.blob_ref);
        base.media = {
          download,
          blobName: message.blob_ref
        };
        if (relatedImage) {
          base.media.analysis = {
            severityImageScore: relatedImage.s_i,
            visionRanAt: relatedImage.vision_ran_at,
            markers: relatedImage.markers || {},
            qualityMetrics: relatedImage.quality_metrics || {}
          };
        }
      }
      return base;
    });

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const createPatientMessage = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { message } = req.body || {};
    const context = req.user || {};
    if (context.role !== 'PATIENT') {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      const error = new Error('Message is required');
      error.status = 400;
      throw error;
    }
    const prisma = getPrisma();
    await assertCaseAccess({ prisma, caseId, userContext: context });
    const payload = {
      caseId,
      from: context.phoneNumber,
      type: 'text',
      text: {
        body: message.trim(),
        origin: 'WEB_PORTAL'
      },
      messageId: `web-${Date.now()}-${Math.round(Math.random() * 100000)}`,
      timestamp: new Date().toISOString(),
      name: context.displayName || null
    };
    const result = await chatService.processIncomingMessage(payload);
    res.status(201).json({
      success: true,
      data: {
        caseId: result.case.id,
        chatMessageId: result.chatMessage.id,
        caseStatus: result.case.status
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCaseChat,
  createPatientMessage
};
