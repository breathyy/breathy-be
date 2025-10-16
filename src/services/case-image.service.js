const blobService = require('./blob.service');
const visionService = require('./vision.service');
const { mergeVisionAnalysis } = require('../utils/triage-metadata');
const { toNullableDecimal, toNullableNumber, toBigIntOrNull } = require('../utils/prisma-helpers');

const requireStorageConfigured = () => {
  if (!blobService.isConfigured()) {
    const error = new Error('Storage configuration unavailable');
    error.status = 503;
    throw error;
  }
};

const ensureCaseExists = async (prisma, caseId) => {
  const result = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { id: true, user_id: true }
  });
  if (!result) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }
  return result;
};

const normalizeSource = (value) => {
  if (!value) {
    return 'MANUAL';
  }
  const upper = String(value).trim().toUpperCase();
  if (upper !== 'ACS' && upper !== 'MANUAL') {
    const error = new Error('Invalid source');
    error.status = 400;
    throw error;
  }
  return upper;
};

const toNumberOrNull = (input) => {
  if (input === undefined || input === null) {
    return null;
  }
  const parsed = Number(input);
  if (Number.isNaN(parsed)) {
    const error = new Error('Invalid numeric value');
    error.status = 400;
    throw error;
  }
  return parsed;
};

const parseObjectOrNull = (input) => {
  if (input === undefined || input === null) {
    return {};
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Invalid JSON payload');
    error.status = 400;
    throw error;
  }
  return { ...input };
};

const buildDownloadReference = (blobName) => {
  if (!blobName) {
    return null;
  }
  try {
    return blobService.generateDownloadUrl(blobName);
  } catch (error) {
    return null;
  }
};

const analyseVision = async ({ blobName, markers, downloadUrl }) => {
  let visionResult = {
    markers,
    severityImageScore: null,
    visionRanAt: null,
    summary: null,
    provider: 'MANUAL_INPUT',
    model: null,
    raw: {},
    sputumCategory: null,
    sputumCategoryConfidence: null
  };
  try {
    visionResult = await visionService.analyseImage({
      blobName,
      markers,
      downloadUrl
    });
  } catch (error) {
    visionResult = {
      markers,
      severityImageScore: null,
      visionRanAt: null,
      summary: null,
      provider: 'MANUAL_INPUT',
      model: null,
      raw: {},
      sputumCategory: null,
      sputumCategoryConfidence: null
    };
  }
  return visionResult;
};

const registerImage = async ({
  prisma,
  caseId,
  blobName,
  source,
  qualityMetrics,
  contentType,
  fileSizeBytes,
  markers
}) => {
  requireStorageConfigured();
  if (!caseId) {
    const error = new Error('caseId is required');
    error.status = 400;
    throw error;
  }
  if (!blobName || typeof blobName !== 'string') {
    const error = new Error('blobName is required');
    error.status = 400;
    throw error;
  }

  const prismaClient = prisma;
  await ensureCaseExists(prismaClient, caseId);

  const sourceValue = normalizeSource(source);
  const size = fileSizeBytes !== undefined ? toNumberOrNull(fileSizeBytes) : null;
  const quality = {
    ...parseObjectOrNull(qualityMetrics)
  };

  let detectedContentType = contentType && typeof contentType === 'string' ? contentType : null;
  let detectedSize = size;
  try {
    const properties = await blobService.getBlobProperties(blobName);
    if (properties.contentType) {
      detectedContentType = properties.contentType;
    }
    if (properties.contentLength !== null && properties.contentLength !== undefined) {
      detectedSize = properties.contentLength;
    }
  } catch (error) {
    // ignore missing blob metadata
  }

  const blobUrl = blobService.getBlobUrl(blobName);
  const markersPayload = parseObjectOrNull(markers);
  const downloadReference = buildDownloadReference(blobName);
  const downloadUrl = downloadReference && downloadReference.downloadUrl ? downloadReference.downloadUrl : null;
  const visionResult = await analyseVision({
    blobName,
    markers: markersPayload,
    downloadUrl
  });

  if (visionResult.summary) {
    quality.analysisSummary = visionResult.summary;
  }
  if (visionResult.provider) {
    quality.analysisProvider = visionResult.provider;
  }
  if (visionResult.model) {
    quality.analysisModel = visionResult.model;
  }

  const resolvedContentType = detectedContentType || 'application/octet-stream';
  const resolvedSize = detectedSize === null || detectedSize === undefined ? null : Math.max(0, Number(detectedSize));

  const imageRecord = await prismaClient.images.create({
    data: {
      case_id: caseId,
      blob_name: blobName,
      blob_url: blobUrl,
      content_type: resolvedContentType,
      file_size_bytes: resolvedSize === null ? null : toBigIntOrNull(resolvedSize),
      source: sourceValue,
      qc_status: 'PENDING',
      quality_metrics: quality,
      markers: visionResult.markers || markersPayload,
      s_i: visionResult.severityImageScore,
      vision_ran_at: visionResult.visionRanAt ? new Date(visionResult.visionRanAt) : null
    },
    select: {
      id: true,
      created_at: true,
      qc_status: true,
      s_i: true,
      vision_ran_at: true
    }
  });

  const [caseRecord, imageCount] = await Promise.all([
    prismaClient.cases.findUnique({
      where: { id: caseId },
      select: {
        triage_metadata: true,
        sputum_category: true
      }
    }),
    prismaClient.images.count({ where: { case_id: caseId } })
  ]);

  const existingMetadata =
    caseRecord && caseRecord.triage_metadata && typeof caseRecord.triage_metadata === 'object'
      ? caseRecord.triage_metadata
      : {};
  const mergedMetadata = mergeVisionAnalysis(
    existingMetadata,
    {
      at: visionResult.visionRanAt || new Date().toISOString(),
      severityImageScore: visionResult.severityImageScore,
      markers: visionResult.markers,
      summary: visionResult.summary,
      provider: visionResult.provider,
      model: visionResult.model,
      raw: visionResult.raw,
      blobName,
      sputumCategory: visionResult.sputumCategory,
      sputumCategoryConfidence: visionResult.sputumCategoryConfidence
    },
    { imageCount }
  );

  const caseUpdate = {
    triage_metadata: mergedMetadata,
    updated_at: new Date()
  };

  if (visionResult.sputumCategory && visionResult.sputumCategory !== 'UNKNOWN') {
    caseUpdate.sputum_category = visionResult.sputumCategory;
  }

  await prismaClient.cases.update({
    where: { id: caseId },
    data: caseUpdate
  });

  const finalDownload =
    downloadReference ||
    buildDownloadReference(blobName) || {
      downloadUrl: null,
      expiresAt: null
    };

  return {
    id: imageRecord.id,
    caseId,
    blobName,
    download: finalDownload,
    qcStatus: imageRecord.qc_status,
    createdAt: imageRecord.created_at,
    severityImageScore: toNullableDecimal(imageRecord.s_i),
    visionRanAt: imageRecord.vision_ran_at,
    analysis: {
      summary: visionResult.summary,
      provider: visionResult.provider,
      model: visionResult.model,
      sputumCategory: visionResult.sputumCategory,
      sputumCategoryConfidence: visionResult.sputumCategoryConfidence
    }
  };
};

const listImages = async ({ prisma, caseId }) => {
  if (!caseId) {
    const error = new Error('caseId is required');
    error.status = 400;
    throw error;
  }
  await ensureCaseExists(prisma, caseId);
  const records = await prisma.images.findMany({
    where: { case_id: caseId },
    orderBy: { created_at: 'asc' }
  });
  const storageReady = blobService.isConfigured();
  return records.map((row) => {
    let download = null;
    if (storageReady) {
      download = buildDownloadReference(row.blob_name);
    }
    return {
      id: row.id,
      caseId,
      blobName: row.blob_name,
      contentType: row.content_type,
      fileSizeBytes: toNullableNumber(row.file_size_bytes),
      qcStatus: row.qc_status,
      qualityMetrics: row.quality_metrics || {},
      markers: row.markers || {},
      severityImageScore: toNullableDecimal(row.s_i),
      visionRanAt: row.vision_ran_at,
      download,
      createdAt: row.created_at
    };
  });
};

module.exports = {
  requireStorageConfigured,
  ensureCaseExists,
  normalizeSource,
  toNumberOrNull,
  parseObjectOrNull,
  registerImage,
  listImages
};
