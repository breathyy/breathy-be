const { getPrisma } = require('../config/prisma.config');
const blobService = require('../services/blob.service');
const triageService = require('../services/triage.service');
const followupService = require('../services/followup.service');
const chatService = require('../services/chat.service');
const { toNullableDecimal, toNullableNumber } = require('../utils/prisma-helpers');
const { REQUIRED_SYMPTOM_FIELDS } = require('../utils/triage-metadata');

const DEFAULT_COMPLETENESS = {
  missingSymptoms: [...REQUIRED_SYMPTOM_FIELDS],
  readyForPreprocessing: false,
  imageProvided: false,
  imageRecommended: true,
  needsMoreSymptoms: true,
  updatedAt: null
};

const normalizeCaseId = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  return value.trim();
};

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const CASE_DETAIL_INCLUDE = {
  users: {
    select: {
      id: true,
      phone_number: true,
      display_name: true
    }
  },
  doctor_users: {
    select: {
      id: true,
      full_name: true,
      email: true,
      specialty: true
    }
  },
  symptoms: {
    orderBy: { created_at: 'desc' },
    take: 1
  },
  images: {
    orderBy: { created_at: 'desc' },
    take: 5
  }
};

const fetchCaseDetail = (prisma, caseId) => {
  return prisma.cases.findUnique({
    where: { id: caseId },
    include: CASE_DETAIL_INCLUDE
  });
};

const buildDownloadReference = (blobName) => {
  if (!blobName) {
    return null;
  }
  try {
    const result = blobService.generateDownloadUrl(blobName);
    return result.downloadUrl || null;
  } catch {
    return null;
  }
};

const mapImage = (image) => ({
  id: image.id,
  blobName: image.blob_name,
  contentType: image.content_type,
  fileSizeBytes: toNullableNumber(image.file_size_bytes),
  qcStatus: image.qc_status,
  markers: image.markers || {},
  qualityMetrics: image.quality_metrics || {},
  severityImageScore: toNullableDecimal(image.s_i),
  visionRanAt: image.vision_ran_at,
  createdAt: image.created_at,
  downloadUrl: buildDownloadReference(image.blob_name)
});

const mapSymptoms = (record) => ({
  feverStatus: record.fever_status,
  onsetDays: record.onset_days,
  dyspnea: record.dyspnea,
  comorbidity: record.comorbidity,
  severitySymptom: toNullableDecimal(record.severity_symptom),
  rawText: record.raw_text || {},
  createdAt: record.created_at
});

function buildPreprocessingSummary(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {
      dataCompleteness: { ...DEFAULT_COMPLETENESS, missingSymptoms: [...DEFAULT_COMPLETENESS.missingSymptoms] },
      symptomExtraction: null,
      visionAnalysis: null,
      symptomStats: null,
      imageStats: null
    };
  }
  const completenessSource =
    metadata.dataCompleteness && typeof metadata.dataCompleteness === 'object' ? metadata.dataCompleteness : null;
  const dataCompleteness = completenessSource
    ? {
        ...completenessSource,
        missingSymptoms: Array.isArray(completenessSource.missingSymptoms)
          ? completenessSource.missingSymptoms
          : []
      }
    : { ...DEFAULT_COMPLETENESS, missingSymptoms: [...DEFAULT_COMPLETENESS.missingSymptoms] };
  return {
    dataCompleteness,
    symptomExtraction: metadata.lastSymptomExtraction || null,
    visionAnalysis: metadata.lastVisionAnalysis || null,
    symptomStats: metadata.symptomStats || null,
    imageStats: metadata.imageStats || null
  };
}

const mapCaseDetail = (record) => {
  const symptomsList = Array.isArray(record.symptoms) ? record.symptoms : [];
  const imagesList = Array.isArray(record.images) ? record.images : [];
  const triageMetadata = record.triage_metadata && typeof record.triage_metadata === 'object' ? record.triage_metadata : {};
  return {
    id: record.id,
    status: record.status,
    severityScore: toNullableDecimal(record.severity_score),
    severityClass: record.severity_class,
    sputumCategory: record.sputum_category,
    startDate: record.start_date,
    endDate: record.end_date,
    triageMetadata,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    patient: record.users
      ? {
          id: record.users.id,
          phoneNumber: record.users.phone_number,
          displayName: record.users.display_name
        }
      : null,
    doctor: record.doctor_users
      ? {
          id: record.doctor_users.id,
          fullName: record.doctor_users.full_name,
          email: record.doctor_users.email,
          specialty: record.doctor_users.specialty
        }
      : null,
      latestSymptoms: symptomsList.length > 0 ? mapSymptoms(symptomsList[0]) : null,
      recentImages: imagesList.map(mapImage),
      preprocessing: buildPreprocessingSummary(triageMetadata)
  };
};

const getCaseDetail = async (req, res, next) => {
  try {
    const normalizedId = normalizeCaseId(req.params.caseId);
    if (!normalizedId) {
        throw createError(400, 'caseId is required');
    }
    const prisma = getPrisma();
    const actor = req.user || {};
    const record = await fetchCaseDetail(prisma, normalizedId);
    if (!record) {
        throw createError(404, 'Case not found');
    }
    const actorRole = actor.role ? String(actor.role).toUpperCase() : null;
    if (actorRole === 'PATIENT') {
      const actorId = actor.id || actor.userId || null;
      if (!actorId || String(record.user_id) !== String(actorId)) {
        throw createError(403, 'Forbidden');
      }
    }
    res.status(200).json({ success: true, data: mapCaseDetail(record) });
  } catch (error) {
    next(error);
  }
};

  const normalizeSeverityOverride = (value) => {
    if (!value || typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    if (!['MILD', 'MODERATE', 'SEVERE'].includes(normalized)) {
      return null;
    }
    return normalized;
  };

  const approveCase = async (req, res, next) => {
    try {
      const normalizedId = normalizeCaseId(req.params.caseId);
      if (!normalizedId) {
        throw createError(400, 'caseId is required');
      }
      const actor = req.user || {};
      if (!actor.id || String(actor.role).toUpperCase() !== 'DOCTOR') {
        throw createError(403, 'Doctor authorization required');
      }
      const { severityOverride, notes } = req.body || {};
      const overrideSeverity = severityOverride ? normalizeSeverityOverride(severityOverride) : null;
      if (severityOverride && !overrideSeverity) {
        throw createError(400, 'severityOverride must be one of MILD, MODERATE, SEVERE');
      }
      const sanitizedNotes = typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null;
      const prisma = getPrisma();
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.cases.findUnique({
          where: { id: normalizedId },
          select: {
            id: true,
            status: true,
            triage_metadata: true
          }
        });
        if (!existing) {
          throw createError(404, 'Case not found');
        }
        if (existing.status !== 'WAITING_DOCTOR') {
          throw createError(409, 'Case is not awaiting doctor approval');
        }
        const evaluation = await triageService.evaluateCase({ caseId: normalizedId, prisma: tx });
        if (!evaluation.severityClass && !overrideSeverity) {
          throw createError(409, 'Severity score unavailable, cannot approve without override');
        }
        const finalSeverity = overrideSeverity || evaluation.severityClass;
        const now = new Date();
        const metadataBase = existing.triage_metadata && typeof existing.triage_metadata === 'object'
          ? { ...existing.triage_metadata }
          : {};
        const metadata = {
          ...metadataBase,
          lastApproval: {
            at: now.toISOString(),
            doctorId: actor.id,
            severityScore: evaluation.severityScore,
            severityClass: finalSeverity,
            components: evaluation.components,
            overrideApplied: Boolean(overrideSeverity),
            notes: sanitizedNotes
          }
        };
        const updated = await tx.cases.update({
          where: { id: normalizedId },
          data: {
            doctor_id: actor.id,
            status: finalSeverity,
            severity_score: evaluation.severityScore,
            severity_class: finalSeverity,
            triage_metadata: metadata,
            updated_at: now
          },
          include: CASE_DETAIL_INCLUDE
        });
        if (['MILD', 'MODERATE'].includes(finalSeverity)) {
          await followupService.generateTasks({ caseId: normalizedId, severityClass: finalSeverity, prisma: tx });
        } else {
          await tx.daily_tasks.deleteMany({ where: { case_id: normalizedId } });
        }
        return {
          caseRecord: updated,
          evaluation
        };
      });
      res.status(200).json({
        success: true,
        data: {
          case: mapCaseDetail(result.caseRecord),
          evaluation: result.evaluation
        }
      });
      try {
        await chatService.notifyDoctorReview({ caseRecord: result.caseRecord, evaluation: result.evaluation });
      } catch (notifyError) {
        console.error('Failed to deliver doctor review notification', notifyError);
      }
    } catch (error) {
      next(error);
    }
  };

module.exports = {
    getCaseDetail,
    approveCase
};
