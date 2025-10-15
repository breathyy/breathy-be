const blobService = require('../services/blob.service');
const visionService = require('../services/vision.service');
const { getPrisma } = require('../config/prisma.config');
const { toNullableDecimal, toNullableNumber, toBigIntOrNull } = require('../utils/prisma-helpers');

const requireStorage = () => {
  if (!blobService.isConfigured()) {
    const error = new Error('Storage configuration unavailable');
    error.status = 503;
    throw error;
  }
};

const ensureCaseExists = async (prisma, caseId) => {
  const result = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { id: true }
  });
  if (!result) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }
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
  return input;
};

const requestUploadUrl = async (req, res, next) => {
  try {
    requireStorage();
    const { caseId } = req.params;
    const { contentType, fileSizeBytes } = req.body || {};
    if (!caseId) {
      const error = new Error('caseId is required');
      error.status = 400;
      throw error;
    }
    if (!contentType || typeof contentType !== 'string') {
      const error = new Error('contentType is required');
      error.status = 400;
      throw error;
    }
    const prisma = getPrisma();
    await ensureCaseExists(prisma, caseId);
    const size = toNumberOrNull(fileSizeBytes);
    const upload = await blobService.createUploadUrl(caseId, contentType, size);
    res.status(200).json({ success: true, data: upload });
  } catch (error) {
    next(error);
  }
};

const registerImage = async (req, res, next) => {
  try {
    requireStorage();
    const { caseId } = req.params;
    const { blobName, source, qualityMetrics, contentType, fileSizeBytes, markers } = req.body || {};
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
    const prisma = getPrisma();
    await ensureCaseExists(prisma, caseId);
    const sourceValue = normalizeSource(source);
    const size = fileSizeBytes !== undefined ? toNumberOrNull(fileSizeBytes) : null;
    const quality = parseObjectOrNull(qualityMetrics);
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
    } catch {
      // ignore missing blob metadata
    }
    const blobUrl = blobService.getBlobUrl(blobName);
    const markersPayload = parseObjectOrNull(markers);
    let downloadReference = null;
    try {
      downloadReference = blobService.generateDownloadUrl(blobName);
    } catch {
      downloadReference = null;
    }
    const downloadUrl = downloadReference && downloadReference.downloadUrl ? downloadReference.downloadUrl : null;
    let visionResult = {
      markers: markersPayload,
      severityImageScore: null,
      visionRanAt: null
    };
    try {
      visionResult = await visionService.analyseImage({
        blobName,
        markers: markersPayload,
        downloadUrl
      });
    } catch {
      visionResult = {
        markers: markersPayload,
        severityImageScore: null,
        visionRanAt: null
      };
    }
    const resolvedContentType = detectedContentType || 'application/octet-stream';
    const resolvedSize = detectedSize === null || detectedSize === undefined ? null : Math.max(0, Number(detectedSize));
    const result = await prisma.images.create({
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
    let download = downloadReference;
    if (!download) {
      try {
        download = blobService.generateDownloadUrl(blobName);
      } catch {
        download = null;
      }
    }
    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        caseId,
        blobName,
        download,
        qcStatus: result.qc_status,
        createdAt: result.created_at,
        severityImageScore: toNullableDecimal(result.s_i),
        visionRanAt: result.vision_ran_at
      }
    });
  } catch (error) {
    next(error);
  }
};

const listImages = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    if (!caseId) {
      const error = new Error('caseId is required');
      error.status = 400;
      throw error;
    }
    const prisma = getPrisma();
    await ensureCaseExists(prisma, caseId);
    const records = await prisma.images.findMany({
      where: { case_id: caseId },
      orderBy: { created_at: 'asc' }
    });
    const items = records.map((row) => {
      let download = null;
      if (blobService.isConfigured()) {
        try {
          download = blobService.generateDownloadUrl(row.blob_name);
        } catch {
          download = null;
        }
      }
  const qualityMetrics = row.quality_metrics || {};
      const markers = row.markers || {};
      return {
        id: row.id,
        caseId,
        blobName: row.blob_name,
        contentType: row.content_type,
    fileSizeBytes: toNullableNumber(row.file_size_bytes),
        qcStatus: row.qc_status,
        qualityMetrics,
        markers,
    severityImageScore: toNullableDecimal(row.s_i),
        visionRanAt: row.vision_ran_at,
        download,
        createdAt: row.created_at
      };
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestUploadUrl,
  registerImage,
  listImages
};
