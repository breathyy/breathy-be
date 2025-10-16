const blobService = require('../services/blob.service');
const caseImageService = require('../services/case-image.service');
const { getPrisma } = require('../config/prisma.config');

const requestUploadUrl = async (req, res, next) => {
  try {
    caseImageService.requireStorageConfigured();
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
    await caseImageService.ensureCaseExists(prisma, caseId);
    const size = fileSizeBytes !== undefined ? caseImageService.toNumberOrNull(fileSizeBytes) : null;
    const upload = await blobService.createUploadUrl(caseId, contentType, size);
    res.status(200).json({ success: true, data: upload });
  } catch (error) {
    next(error);
  }
};

const registerImage = async (req, res, next) => {
  try {
    caseImageService.requireStorageConfigured();
    const { caseId } = req.params;
    const { blobName, source, qualityMetrics, contentType, fileSizeBytes, markers } = req.body || {};
    const prisma = getPrisma();
    const result = await caseImageService.registerImage({
      prisma,
      caseId,
      blobName,
      source,
      qualityMetrics,
      contentType,
      fileSizeBytes,
      markers
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const listImages = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const prisma = getPrisma();
    const items = await caseImageService.listImages({ prisma, caseId });
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
