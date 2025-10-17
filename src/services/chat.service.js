const { getPrisma } = require('../config/prisma.config');
const nluService = require('./nlu.service');
const acsService = require('./acs.service');
const blobService = require('./blob.service');
const caseImageService = require('./case-image.service');
const {
  REQUIRED_FIELDS,
  OPTIONAL_TOPICS,
  buildSummaryMessage,
  isAffirmative,
  isNegative,
  isNoChangeResponse,
  normalizeReply
} = require('../utils/questionnaire');
const { appendStatusTransition } = require('../utils/triage-metadata');

const { normalizePhone } = acsService;

const activeStatuses = ['IN_CHATBOT', 'WAITING_DOCTOR'];

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

const ensureActiveCase = async (prisma, userId, options = {}) => {
  const { caseId } = options || {};
  if (caseId) {
    const existing = await prisma.cases.findFirst({
      where: {
        id: caseId,
        user_id: userId
      }
    });
    if (!existing) {
      const error = new Error('Case not found');
      error.status = 404;
      throw error;
    }
    return existing;
  }
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
  const initialMetadata = appendStatusTransition({}, {
    from: null,
    to: 'IN_CHATBOT',
    actorType: 'SYSTEM',
    actorId: null,
    reason: 'CASE_CREATED'
  });
  const created = await prisma.cases.create({
    data: {
      user_id: userId,
      status: 'IN_CHATBOT',
      triage_metadata: initialMetadata
    }
  });
  created.__wasCreated = true;
  return created;
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

const ingestIncomingImage = async ({ prisma, caseRecord, media }) => {
  if (!media || typeof media !== 'object') {
    return {
      blobName: null,
      details: { status: 'NO_MEDIA' }
    };
  }

  const currentMeta = {
    status: 'RECEIVED',
    mediaId: media.id || media.mediaId || null,
    contentType: media.contentType || null,
    fileSize: media.fileSize || null
  };

  let blobName = typeof media.blobName === 'string' ? media.blobName : null;

  if (!blobName) {
    const mediaUrl = media.mediaUri || media.url || media.href || null;
    if (!mediaUrl) {
      return {
        blobName: null,
        details: {
          ...currentMeta,
          status: 'SKIPPED_NO_URL'
        }
      };
    }
    if (!blobService.isConfigured()) {
      return {
        blobName: null,
        details: {
          ...currentMeta,
          status: 'SKIPPED_NO_STORAGE',
          mediaUrl
        }
      };
    }
    try {
      const download = await acsService.downloadMedia({ mediaUrl });
      const upload = await blobService.uploadBuffer({
        caseId: caseRecord.id,
        buffer: download.buffer,
        contentType: media.contentType || download.contentType || undefined
      });
      blobName = upload.blobName;
      currentMeta.status = 'UPLOADED';
      currentMeta.mediaUrl = download.mediaUrl;
      currentMeta.contentType = download.contentType || media.contentType || null;
      currentMeta.fileSize = download.contentLength;
      currentMeta.blobName = upload.blobName;
    } catch (error) {
      return {
        blobName: null,
        details: {
          ...currentMeta,
          status: 'FAILED_DOWNLOAD',
          error: error.message
        }
      };
    }
  }

  if (!blobName) {
    return {
      blobName: null,
      details: {
        ...currentMeta,
        status: 'SKIPPED_NO_BLOB'
      }
    };
  }

  try {
    const imageRecord = await caseImageService.registerImage({
      prisma,
      caseId: caseRecord.id,
      blobName,
      source: 'ACS',
      qualityMetrics: {
        origin: 'ACS_WHATSAPP',
        mediaId: currentMeta.mediaId
      },
      contentType: currentMeta.contentType,
      fileSizeBytes: currentMeta.fileSize,
      markers: {}
    });
    return {
      blobName,
      details: {
        ...currentMeta,
        status: 'REGISTERED',
        imageId: imageRecord.id,
        severityImageScore: imageRecord.severityImageScore,
        visionRanAt: imageRecord.visionRanAt,
        sputumCategory: imageRecord.analysis.sputumCategory,
        sputumCategoryConfidence: imageRecord.analysis.sputumCategoryConfidence
      }
    };
  } catch (error) {
    return {
      blobName,
      details: {
        ...currentMeta,
        status: 'FAILED_REGISTER',
        error: error.message
      }
    };
  }
};

const sendPatientText = async ({ caseId, phoneNumber, message, metadata = {} }) => {
  if (!caseId || !phoneNumber) {
    return null;
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }
  const normalizedRecipient = normalizePhone(phoneNumber);
  if (!normalizedRecipient) {
    return null;
  }
  const trimmed = message.trim();
  let status = 'SKIPPED_NO_CONFIG';
  const outboundMeta = { ...metadata };
  try {
    if (acsService.isConfigured && acsService.isConfigured()) {
      const delivery = await acsService.sendWhatsAppText({
        to: normalizedRecipient,
        message: trimmed,
        metadata
      });
      status = delivery.status || 'SUBMITTED';
      outboundMeta.delivery = delivery;
    } else {
      status = 'DRY_RUN';
    }
  } catch (error) {
    status = 'FAILED';
    outboundMeta.deliveryError = error.message;
  }

  await recordOutboundText(caseId, trimmed, {
    provider: 'ACS_WHATSAPP',
    recipients: [normalizedRecipient],
    sendStatus: status,
    metadata: outboundMeta
  });

  return status;
};

const handleQuestionnaireProgress = async ({
  prisma,
  caseRecord,
  metadata,
  analysis,
  latestText,
  user,
  sendMessage = sendPatientText
}) => {
  if (!caseRecord || !metadata || typeof metadata !== 'object') {
    return {
      updatedCase: caseRecord,
      triageMetadata: metadata
    };
  }

  const metadataCopy = JSON.parse(JSON.stringify(metadata));
  const questionnaire = {
    asked: {},
    optionalAsked: {},
    ...((metadataCopy.questionnaire && typeof metadataCopy.questionnaire === 'object'
      ? metadataCopy.questionnaire
      : {}))
  };
  questionnaire.asked = questionnaire.asked || {};
  questionnaire.optionalAsked = questionnaire.optionalAsked || {};

  const caseId = caseRecord.id;
  const phoneNumber = user ? user.phone_number : null;
  const now = new Date();
  const nowIso = now.toISOString();
  const metadataMissing =
    metadata?.dataCompleteness && Array.isArray(metadata.dataCompleteness.missingSymptoms)
      ? metadata.dataCompleteness.missingSymptoms
      : [];
  const analysisMissing = Array.isArray(analysis?.missingFields) ? analysis.missingFields : [];
  const missingFields = metadataMissing.length > 0 ? metadataMissing : analysisMissing;
  const awaitingClarification = Boolean(questionnaire.awaitingClarification);

  let metadataChanged = false;

  const finalizeCase = async (confirmationText) => {
    questionnaire.awaitingConfirmation = false;
    questionnaire.awaitingClarification = false;
    questionnaire.patientConfirmation = {
      at: nowIso,
      text: confirmationText
    };
    metadataChanged = true;
    metadataCopy.questionnaire = questionnaire;
    const updatedCase = await prisma.cases.update({
      where: { id: caseId },
      data: {
        status: 'WAITING_DOCTOR',
        triage_metadata: metadataCopy,
        updated_at: now
      }
    });
    await sendMessage({
      caseId,
      phoneNumber,
      message:
        'Terima kasih, data kamu sudah lengkap. Dokter akan meninjau kasusmu dan kami kabari lagi untuk langkah selanjutnya ya.',
      metadata: { reason: 'CONFIRMED_ESCALATION' }
    });
    return {
      updatedCase,
      triageMetadata: updatedCase.triage_metadata
    };
  };

  if (awaitingClarification && typeof latestText === 'string') {
    if (isNoChangeResponse(latestText) && missingFields.length === 0) {
      return finalizeCase(latestText);
    }
  }

  if (caseRecord.status !== 'WAITING_DOCTOR') {
    if (missingFields.length > 0) {
      const pendingField = missingFields.find((field) => !questionnaire.asked[field] && REQUIRED_FIELDS[field]);
      if (pendingField && REQUIRED_FIELDS[pendingField]) {
        await sendMessage({
          caseId,
          phoneNumber,
          message: REQUIRED_FIELDS[pendingField].prompt,
          metadata: { reason: 'ASK_MANDATORY', field: pendingField }
        });
        questionnaire.asked[pendingField] = nowIso;
        questionnaire.awaitingClarification = false;
        metadataChanged = true;
      }
      if (questionnaire.awaitingConfirmation) {
        questionnaire.awaitingConfirmation = false;
        questionnaire.awaitingClarification = false;
        metadataChanged = true;
      }
    } else {
      const pendingOptional = OPTIONAL_TOPICS.find((topic) => !questionnaire.optionalAsked[topic.key]);
      if (pendingOptional) {
        await sendMessage({
          caseId,
          phoneNumber,
          message: pendingOptional.prompt,
          metadata: { reason: 'ASK_OPTIONAL', topic: pendingOptional.key }
        });
        questionnaire.optionalAsked[pendingOptional.key] = nowIso;
        questionnaire.awaitingClarification = false;
        metadataCopy.questionnaire = questionnaire;
        const updatedCase = await prisma.cases.update({
          where: { id: caseId },
          data: {
            triage_metadata: metadataCopy,
            updated_at: now
          }
        });
        return {
          updatedCase,
          triageMetadata: updatedCase.triage_metadata
        };
      }
      if (!questionnaire.awaitingConfirmation) {
        const summaryMessage = buildSummaryMessage(analysis?.fields || {});
        await sendMessage({
          caseId,
          phoneNumber,
          message: summaryMessage,
          metadata: { reason: 'SUMMARY_CONFIRMATION' }
        });
        questionnaire.awaitingConfirmation = true;
        questionnaire.awaitingClarification = false;
        questionnaire.summarySentAt = nowIso;
        questionnaire.summarySnapshot = {
          fields: analysis?.fields || {},
          generatedAt: nowIso
        };
        metadataChanged = true;
      }
    }

    if (questionnaire.awaitingConfirmation && typeof latestText === 'string') {
      const normalized = normalizeReply(latestText);
      if (isAffirmative(normalized)) {
        return finalizeCase(latestText);
      }
      if (isNegative(normalized)) {
        questionnaire.awaitingConfirmation = false;
        questionnaire.awaitingClarification = true;
        questionnaire.confirmationDeclinedAt = nowIso;
        metadataChanged = true;
        await sendMessage({
          caseId,
          phoneNumber,
          message: 'Baik, sebutkan bagian yang perlu diperbaiki agar kami dapat memperbarui catatan Anda.',
          metadata: { reason: 'CONFIRMATION_CLARIFY' }
        });
      }
    }
  }

  if (!metadataChanged) {
    metadataCopy.questionnaire = questionnaire;
    return {
      updatedCase: caseRecord,
      triageMetadata: metadataCopy
    };
  }

  metadataCopy.questionnaire = questionnaire;
  const updatedCase = await prisma.cases.update({
    where: { id: caseId },
    data: {
      triage_metadata: metadataCopy,
      updated_at: now
    }
  });

  return {
    updatedCase,
    triageMetadata: updatedCase.triage_metadata
  };
};

const processIncomingMessage = async (payload) => {
  const prisma = getPrisma();
  const { from, text, media, messageId, timestamp, name, type, caseId: targetCaseId } = payload || {};
  const messageType = type === 'image' ? 'image' : 'text';
  const user = await ensureUser(prisma, from, name);
  let activeCase = await ensureActiveCase(prisma, user.id, targetCaseId ? { caseId: targetCaseId } : {});
  let triageMetadataSnapshot = activeCase.triage_metadata || {};
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
    meta.raw = media || {};
    const ingestion = await ingestIncomingImage({
      prisma,
      caseRecord: activeCase,
      media
    });
    blobRef = ingestion.blobName;
    meta.media = ingestion.details;
  }
  if (messageType === 'text' && content) {
    try {
      const nluResult = await nluService.evaluateText({
        caseId: activeCase.id,
        text: content,
        prisma,
        context: triageMetadataSnapshot
      });
      meta.nlu = {
        severitySymptom: nluResult.severitySymptom,
        fields: nluResult.analysis ? nluResult.analysis.fields : undefined,
        confidences: nluResult.analysis ? nluResult.analysis.confidences : undefined,
        missingFields: nluResult.analysis ? nluResult.analysis.missingFields : undefined,
        recommendImage: nluResult.analysis ? nluResult.analysis.recommendImage : undefined,
        provider: nluResult.analysis ? nluResult.analysis.provider : undefined,
        readyForPreprocessing: nluResult.analysis ? nluResult.analysis.readyForPreprocessing : undefined,
        notes: nluResult.analysis ? nluResult.analysis.notes : undefined
      };
      triageMetadataSnapshot = nluResult.triageMetadata || triageMetadataSnapshot;
      if (triageMetadataSnapshot && triageMetadataSnapshot.dataCompleteness) {
        meta.dataCompleteness = triageMetadataSnapshot.dataCompleteness;
      }
      const questionnaireResult = await handleQuestionnaireProgress({
        prisma,
        caseRecord: activeCase,
        metadata: triageMetadataSnapshot,
        analysis: nluResult.analysis,
        latestText: content,
        user,
        sendMessage: sendPatientText
      });
      if (questionnaireResult) {
        activeCase = questionnaireResult.updatedCase || activeCase;
        triageMetadataSnapshot = questionnaireResult.triageMetadata || triageMetadataSnapshot;
        if (triageMetadataSnapshot && triageMetadataSnapshot.dataCompleteness) {
          meta.dataCompleteness = triageMetadataSnapshot.dataCompleteness;
        }
      }
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
  ensureActiveCase,
  __test__: {
    handleQuestionnaireProgress
  }
};
