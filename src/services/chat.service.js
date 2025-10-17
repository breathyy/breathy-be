const { getPrisma } = require('../config/prisma.config');
const nluService = require('./nlu.service');
const acsService = require('./acs.service');
const blobService = require('./blob.service');
const caseImageService = require('./case-image.service');
const { appendStatusTransition, applyDataCompleteness } = require('../utils/triage-metadata');

const { normalizePhone } = acsService;

const activeStatuses = ['IN_CHATBOT', 'WAITING_DOCTOR'];
const WELCOME_MESSAGE = 'Hai, aku Breathy! asisten kesehatan ISPA berbasis AI kamu. Ada yang bisa aku bantu soal pernapasanmu?';
const IMAGE_REQUEST_MESSAGE =
  'Oke, supaya dokter bisa menilai lebih tepat, boleh bantu kirim foto dahak atau tenggorokan kamu? Kalau belum bisa atau belum nyaman, tinggal bilang ya.';
const IMAGE_REQUEST_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 jam penundaan sebelum minta ulang
const IMAGE_REMINDER_MESSAGE =
  'Terima kasih ya, aku masih butuh foto dahak atau tenggorokan kamu supaya dokter bisa menilai lebih akurat. Kalau belum bisa kirim, tinggal bilang juga gapapa.';

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

const applyConversationOutcome = async ({
  prisma,
  caseRecord,
  triageMetadata,
  conversation,
  user,
  sendMessage = sendPatientText
}) => {
  if (!caseRecord || !triageMetadata || typeof triageMetadata !== 'object' || !conversation) {
    return {
      updatedCase: caseRecord,
      triageMetadata
    };
  }

  const caseId = caseRecord.id;
  const phoneNumber = user ? user.phone_number : null;
  let updatedCase = caseRecord;
  let updatedMetadata = triageMetadata;
  let metadataDirty = false;
  let metadataPersisted = false;

  const sendIfPossible = async (message, metadata = {}) => {
    if (!phoneNumber || !message) {
      return null;
    }
    return sendMessage({
      caseId,
      phoneNumber,
      message,
      metadata
    });
  };

  if (conversation.reply) {
    await sendIfPossible(conversation.reply, { reason: 'ASSISTANT_REPLY' });
  }

  const conversationMeta =
    updatedMetadata && updatedMetadata.conversation && typeof updatedMetadata.conversation === 'object'
      ? { ...updatedMetadata.conversation }
      : {};
  const originalRecommendImage = Object.prototype.hasOwnProperty.call(conversationMeta, 'recommendImage')
    ? conversationMeta.recommendImage
    : undefined;
  const existingImageRequest =
    conversationMeta.imageRequest && typeof conversationMeta.imageRequest === 'object'
      ? { ...conversationMeta.imageRequest }
      : null;
  const imageStats =
    updatedMetadata && updatedMetadata.imageStats && typeof updatedMetadata.imageStats === 'object'
      ? updatedMetadata.imageStats
      : null;
  const dataCompleteness =
    updatedMetadata && updatedMetadata.dataCompleteness && typeof updatedMetadata.dataCompleteness === 'object'
      ? updatedMetadata.dataCompleteness
      : null;
  const imageProvided = Boolean(dataCompleteness && dataCompleteness.imageProvided) || Boolean(imageStats && imageStats.total > 0);
  const now = new Date();
  const nowIso = now.toISOString();
  let wantsImage = conversation.recommendImage;
  if (wantsImage === undefined || wantsImage === null) {
    wantsImage = !imageProvided;
  }

  if (wantsImage === false) {
    if (!existingImageRequest || existingImageRequest.status !== 'DECLINED') {
      const declined = {
        status: 'DECLINED',
        updatedAt: nowIso
      };
      if (existingImageRequest && existingImageRequest.requestedAt) {
        declined.requestedAt = existingImageRequest.requestedAt;
      }
      conversationMeta.imageRequest = declined;
      metadataDirty = true;
    }
    conversationMeta.recommendImage = false;
    conversationMeta.waitingForImage = false;
    metadataDirty = true;
  } else if (!imageProvided) {
    const lastRequestedAt = existingImageRequest && existingImageRequest.requestedAt
      ? new Date(existingImageRequest.requestedAt)
      : null;
    const cooldownActive =
      lastRequestedAt && now.getTime() - lastRequestedAt.getTime() < IMAGE_REQUEST_COOLDOWN_MS;
    if (!existingImageRequest || existingImageRequest.status !== 'REQUESTED' || !cooldownActive) {
      const requestReason = existingImageRequest ? 'REQUEST_IMAGE_REMINDER' : 'REQUEST_IMAGE';
      const outboundMessage = existingImageRequest ? IMAGE_REMINDER_MESSAGE : IMAGE_REQUEST_MESSAGE;
      await sendIfPossible(outboundMessage, {
        reason: requestReason,
        uiVariant: 'IMAGE_REQUEST',
        brand: 'breathy'
      });
      conversationMeta.imageRequest = {
        status: 'REQUESTED',
        requestedAt: existingImageRequest && existingImageRequest.requestedAt ? existingImageRequest.requestedAt : nowIso,
        updatedAt: nowIso
      };
      metadataDirty = true;
    }
    conversationMeta.recommendImage = true;
    conversationMeta.waitingForImage = true;
    metadataDirty = true;
  } else if (imageProvided && (!existingImageRequest || existingImageRequest.status !== 'FULFILLED')) {
    const fulfilled = {
      status: 'FULFILLED',
      updatedAt: nowIso,
      fulfilledAt: nowIso
    };
    if (existingImageRequest && existingImageRequest.requestedAt) {
      fulfilled.requestedAt = existingImageRequest.requestedAt;
    }
    conversationMeta.imageRequest = fulfilled;
    metadataDirty = true;
    conversationMeta.recommendImage = false;
    conversationMeta.waitingForImage = false;
  } else if (imageProvided) {
    conversationMeta.recommendImage = false;
    conversationMeta.waitingForImage = false;
    metadataDirty = true;
  }

  let allowEscalation = conversation.shouldEscalate;
  const imageRequestStatus = conversationMeta.imageRequest && typeof conversationMeta.imageRequest.status === 'string'
    ? conversationMeta.imageRequest.status
    : null;
  const patientDeclinedImage = imageRequestStatus === 'DECLINED';
  if (allowEscalation && !imageProvided && !patientDeclinedImage) {
    allowEscalation = false;
    if (!conversationMeta.waitingForImage) {
      conversationMeta.waitingForImage = true;
      metadataDirty = true;
    }
    if (conversationMeta.readyForDoctor) {
      conversationMeta.readyForDoctor = false;
      metadataDirty = true;
    }
  }

  const recommendValue = Object.prototype.hasOwnProperty.call(conversationMeta, 'recommendImage')
    ? conversationMeta.recommendImage
    : undefined;
  if (recommendValue !== originalRecommendImage) {
    metadataDirty = true;
  }

  if (metadataDirty) {
    updatedMetadata = {
      ...updatedMetadata,
      conversation: {
        ...conversationMeta
      }
    };
  }

  const alreadyEscalated = Boolean(conversationMeta.escalatedAt) || caseRecord.status === 'WAITING_DOCTOR';

  if (allowEscalation && !alreadyEscalated) {
    const metadataWithEscalation = {
      ...updatedMetadata,
      conversation: {
        ...conversationMeta,
        escalatedAt: nowIso,
        status: 'WAITING_DOCTOR',
        readyForDoctor: true,
        lastEscalationReason: 'CONVERSATION_COMPLETE'
      }
    };
    const metadataWithAudit = appendStatusTransition(metadataWithEscalation, {
      from: caseRecord.status,
      to: 'WAITING_DOCTOR',
      actorType: 'SYSTEM',
      actorId: null,
      reason: 'CONVERSATION_READY'
    });

    updatedCase = await prisma.cases.update({
      where: { id: caseId },
      data: {
        status: 'WAITING_DOCTOR',
        triage_metadata: metadataWithAudit,
        updated_at: now
      }
    });
    updatedMetadata = metadataWithAudit;
    metadataDirty = false;
    metadataPersisted = true;

    await sendIfPossible(
      'Terima kasih, data kamu sudah lengkap. ✨ Dokter Breathy lagi meninjau kasus kamu sekarang. Tunggu sebentar ya, kami kabari begitu ada update.',
      { reason: 'ESCALATE_TO_DOCTOR', uiVariant: 'WAITING_DOCTOR_ALERT', brand: 'breathy' }
    );
  }

  if (metadataDirty && !metadataPersisted) {
    const refreshTime = new Date();
    const refreshIso = refreshTime.toISOString();
    const recalculatedMetadata = applyDataCompleteness(updatedMetadata, refreshIso);
    updatedCase = await prisma.cases.update({
      where: { id: caseId },
      data: {
        triage_metadata: recalculatedMetadata,
        updated_at: refreshTime
      }
    });
    updatedMetadata = recalculatedMetadata;
  }

  return {
    updatedCase,
    triageMetadata: updatedMetadata
  };
};

const processIncomingMessage = async (payload) => {
  const prisma = getPrisma();
  const { from, text, media, messageId, timestamp, name, type, caseId: targetCaseId } = payload || {};
  const messageType = type === 'image' ? 'image' : 'text';
  const user = await ensureUser(prisma, from, name);
  let activeCase = await ensureActiveCase(prisma, user.id, targetCaseId ? { caseId: targetCaseId } : {});
  if (activeCase.__wasCreated) {
    await sendPatientText({
      caseId: activeCase.id,
      phoneNumber: user.phone_number,
      message: WELCOME_MESSAGE,
      metadata: { reason: 'WELCOME', uiVariant: 'BREATHY_WELCOME', brand: 'breathy' }
    });
  }
  let triageMetadataSnapshot = activeCase.triage_metadata || {};
  let content = null;
  let blobRef = null;
  const meta = {
    messageId: messageId || null,
    timestamp: timestamp || new Date().toISOString(),
    raw: {},
    direction: 'INBOUND'
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
      if (nluResult.conversation) {
        meta.conversation = nluResult.conversation;
      }
      triageMetadataSnapshot = nluResult.triageMetadata || triageMetadataSnapshot;
      if (triageMetadataSnapshot && triageMetadataSnapshot.dataCompleteness) {
        meta.dataCompleteness = triageMetadataSnapshot.dataCompleteness;
      }
      const conversationResult = await applyConversationOutcome({
        prisma,
        caseRecord: activeCase,
        triageMetadata: triageMetadataSnapshot,
        conversation: nluResult.conversation,
        user,
        sendMessage: sendPatientText
      });
      if (conversationResult) {
        activeCase = conversationResult.updatedCase || activeCase;
        triageMetadataSnapshot = conversationResult.triageMetadata || triageMetadataSnapshot;
        if (triageMetadataSnapshot && triageMetadataSnapshot.dataCompleteness) {
          meta.dataCompleteness = triageMetadataSnapshot.dataCompleteness;
        }
      }
    } catch (error) {
      meta.nlu = {
        error: error.message
      };
      throw error;
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

const resetPatientConversation = async ({ caseId, actor, prisma }) => {
  const client = prisma || getPrisma();
  if (!caseId) {
    const error = new Error('caseId is required');
    error.status = 400;
    throw error;
  }

  return client.$transaction(async (tx) => {
    const existing = await tx.cases.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        status: true,
        triage_metadata: true,
        user_id: true
      }
    });
    if (!existing) {
      const error = new Error('Case not found');
      error.status = 404;
      throw error;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const [messagesDeleted, symptomsDeleted, tasksDeleted] = await Promise.all([
      tx.chat_messages.deleteMany({ where: { case_id: caseId } }),
      tx.symptoms.deleteMany({ where: { case_id: caseId } }),
      tx.daily_tasks.deleteMany({ where: { case_id: caseId } })
    ]);

    const baseMetadata = existing.triage_metadata && typeof existing.triage_metadata === 'object'
      ? { ...existing.triage_metadata }
      : {};

    const conversationReset = {
      tasks: {},
      confirmationState: 'NONE',
      readyForDoctor: false,
      allowSmallTalk: true,
      lastReply: null,
      lastUpdatedAt: nowIso,
      summary: null,
      planContext: null,
      status: 'IN_CHATBOT'
    };

    const metadataWithConversation = {
      ...baseMetadata,
      conversation: conversationReset,
      lastApproval: null,
      lastReset: {
        at: nowIso,
        actorType: actor && actor.role ? actor.role : 'PATIENT',
        actorId: actor && actor.id ? actor.id : null,
        reason: 'PATIENT_REQUEST'
      }
    };

    const metadataWithAudit = appendStatusTransition(metadataWithConversation, {
      from: existing.status,
      to: 'IN_CHATBOT',
      actorType: actor && actor.role ? actor.role.toUpperCase() : 'PATIENT',
      actorId: actor && actor.id ? actor.id : null,
      reason: 'PATIENT_RESET'
    });

    const metadataFinal = applyDataCompleteness(metadataWithAudit, nowIso);

    const updated = await tx.cases.update({
      where: { id: caseId },
      data: {
        status: 'IN_CHATBOT',
        doctor_id: null,
        severity_score: null,
        severity_class: null,
        triage_metadata: metadataFinal,
        updated_at: now
      },
      select: {
        id: true,
        status: true
      }
    });

    return {
      caseId: updated.id,
      caseStatus: updated.status,
      clearedMessages: messagesDeleted.count,
      clearedSymptoms: symptomsDeleted.count,
      clearedTasks: tasksDeleted.count
    };
  });
};

const notifyDoctorReview = async ({ caseRecord, evaluation, prisma }) => {
  const client = prisma || getPrisma();
  let record = caseRecord;
  if (!record || !record.id) {
    return null;
  }
  if (!record.users || !record.users.phone_number) {
    record = await client.cases.findUnique({
      where: { id: record.id },
      include: {
        users: {
          select: {
            phone_number: true,
            display_name: true
          }
        }
      }
    });
  }
  if (!record || !record.users || !record.users.phone_number) {
    return null;
  }

  const phoneNumber = record.users.phone_number;
  const caseId = record.id;
  const severityClass = evaluation?.severityClass || record.severity_class || null;
  const severityTextMap = {
    MILD: 'ringan',
    MODERATE: 'sedang',
    SEVERE: 'berat'
  };
  const severityLabel = severityTextMap[severityClass] || 'sesuai kondisi terakhir';
  const doctorNotes = evaluation?.notes || record?.triage_metadata?.lastApproval?.notes || 'Ikuti panduan yang sudah diberikan sebelumnya ya.';

  const message = `Kamu sudah mendapatkan review dokter. Hasil klasifikasi dokter: ${severityLabel}. Catatan dokter: ${doctorNotes}

Kalau masih ada pertanyaan tentang obat atau perawatan, tinggal tanya aja lewat companion Breathy ya.`;

  await sendPatientText({
    caseId,
    phoneNumber,
    message,
    metadata: { reason: 'DOCTOR_REVIEW' }
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const metadataBase =
    record.triage_metadata && typeof record.triage_metadata === 'object' ? { ...record.triage_metadata } : {};
  const conversationMeta = metadataBase.conversation && typeof metadataBase.conversation === 'object'
    ? { ...metadataBase.conversation }
    : {};
  conversationMeta.doctorReview = {
    at: nowIso,
    severityClass,
    notes: doctorNotes
  };
  conversationMeta.status = 'DOCTOR_REVIEWED';
  conversationMeta.lastUpdatedAt = nowIso;
  conversationMeta.allowSmallTalk = true;
  metadataBase.conversation = conversationMeta;

  await client.cases.update({
    where: { id: caseId },
    data: {
      triage_metadata: metadataBase,
      updated_at: now
    }
  });

  return {
    message
  };
};

module.exports = {
  processIncomingMessage,
  normalizePhone,
  recordOutboundText,
  ensureActiveCase,
  resetPatientConversation,
  notifyDoctorReview,
  __test__: {
    applyConversationOutcome
  }
};
