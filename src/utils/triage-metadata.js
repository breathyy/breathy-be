const REQUIRED_SYMPTOM_FIELDS = ['feverStatus', 'onsetDays', 'dyspnea', 'comorbidity'];
const MAX_AUDIT_LOG_LENGTH = 40;

const cloneMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return JSON.parse(JSON.stringify(metadata));
};

const sanitizeSignal = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value).trim().slice(0, 120);
};

const clampConfidence = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 1) {
    return 1;
  }
  return Number(numeric.toFixed(2));
};

const buildDataCompleteness = (metadata, timestamp) => {
  const fields =
    metadata.lastSymptomExtraction && metadata.lastSymptomExtraction.fields && typeof metadata.lastSymptomExtraction.fields === 'object'
      ? metadata.lastSymptomExtraction.fields
      : {};
  const missingSymptoms = REQUIRED_SYMPTOM_FIELDS.filter((field) => {
    const value = fields[field];
    if (field === 'onsetDays') {
      return value === null || value === undefined || Number.isNaN(Number(value));
    }
    return value === null || value === undefined;
  });
  const imageTotal = metadata.imageStats && typeof metadata.imageStats.total === 'number' ? metadata.imageStats.total : 0;
  const imageProvided = imageTotal > 0;
  return {
    missingSymptoms,
    readyForPreprocessing: missingSymptoms.length === 0,
    imageProvided,
    imageRecommended: true,
    needsMoreSymptoms: missingSymptoms.length > 0,
    updatedAt: timestamp
  };
};

const applyDataCompleteness = (metadata, timestamp) => {
  const cloned = cloneMetadata(metadata);
  cloned.dataCompleteness = buildDataCompleteness(cloned, timestamp);
  return cloned;
};

const normalizeAuditEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const { from, to, actorType, actorId, reason, details } = entry;
  const at = entry.at || new Date().toISOString();
  const normalized = {
    at,
    from: typeof from === 'string' ? from : from || null,
    to: typeof to === 'string' ? to : to || null,
    actor: {
      type: typeof actorType === 'string' ? actorType.toUpperCase() : 'SYSTEM',
      id: actorId || null
    },
    reason: typeof reason === 'string' ? reason : null,
    details: details && typeof details === 'object' ? details : {}
  };
  return normalized;
};

const appendStatusTransition = (metadata, entry) => {
  const normalizedEntry = normalizeAuditEntry(entry);
  if (!normalizedEntry) {
    return cloneMetadata(metadata);
  }
  const cloned = cloneMetadata(metadata);
  const log = Array.isArray(cloned.statusAuditLog) ? cloned.statusAuditLog.slice() : [];
  log.push(normalizedEntry);
  if (log.length > MAX_AUDIT_LOG_LENGTH) {
    log.splice(0, log.length - MAX_AUDIT_LOG_LENGTH);
  }
  cloned.statusAuditLog = log;
  cloned.lastStatusTransition = normalizedEntry;
  return cloned;
};

const mergeSymptomExtraction = (metadata, update, stats = {}) => {
  const base = cloneMetadata(metadata);
  const entryTimestamp = update.at || new Date().toISOString();
  const heuristicSignals = Array.isArray(update.heuristicsSignals)
    ? update.heuristicsSignals.map(sanitizeSignal).filter(Boolean).slice(0, 20)
    : [];
  const previousExtraction =
    base.lastSymptomExtraction && typeof base.lastSymptomExtraction === 'object' ? base.lastSymptomExtraction : {};
  const previousFields = previousExtraction.fields && typeof previousExtraction.fields === 'object' ? previousExtraction.fields : {};
  const incomingFields = update.fields && typeof update.fields === 'object' ? update.fields : {};
  const mergedFields = { ...previousFields };
  REQUIRED_SYMPTOM_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(incomingFields, field)) {
      const candidate = incomingFields[field];
      if (candidate !== null && candidate !== undefined) {
        mergedFields[field] = candidate;
        return;
      }
    }
    if (mergedFields[field] === undefined) {
      mergedFields[field] = null;
    }
  });
  const mergedMissingFields = REQUIRED_SYMPTOM_FIELDS.filter((field) => mergedFields[field] === null || mergedFields[field] === undefined);

  const previousConfidences =
    previousExtraction.confidences && typeof previousExtraction.confidences === 'object'
      ? previousExtraction.confidences
      : {};
  const mergedConfidences = { ...previousConfidences, ...(update.confidences || {}) };

  const previousRationales =
    previousExtraction.rationales && typeof previousExtraction.rationales === 'object'
      ? previousExtraction.rationales
      : {};
  const mergedRationales = { ...previousRationales, ...(update.rationales || {}) };

  const previousRecommend = typeof previousExtraction.recommendImage === 'boolean' ? previousExtraction.recommendImage : null;
  const mergedRecommend =
    update.recommendImage !== undefined && update.recommendImage !== null
      ? Boolean(update.recommendImage)
      : previousRecommend !== null
        ? previousRecommend
        : true;

  base.lastSymptomExtraction = {
    at: entryTimestamp,
    severitySymptom: update.severitySymptom ?? null,
    fields: mergedFields,
    confidences: mergedConfidences,
    rationales: mergedRationales,
    missingFields: mergedMissingFields,
    recommendImage: mergedRecommend,
    provider: update.provider || null,
    model: update.model || null,
    heuristicsApplied:
      heuristicSignals.length > 0 || Boolean(update.heuristicsApplied) || Boolean(previousExtraction.heuristicsApplied),
    heuristicsSignals: heuristicSignals,
    fallbackUsed: Boolean(update.fallbackUsed) || Boolean(previousExtraction.fallbackUsed),
    raw: update.raw || {}
  };
  if (typeof stats.symptomEntries === 'number') {
    base.symptomStats = {
      total: stats.symptomEntries,
      lastUpdated: entryTimestamp
    };
  }
  return applyDataCompleteness(base, entryTimestamp);
};

const mergeVisionAnalysis = (metadata, update, stats = {}) => {
  const base = cloneMetadata(metadata);
  const entryTimestamp = update.at || new Date().toISOString();
  base.lastVisionAnalysis = {
    at: entryTimestamp,
    severityImageScore: update.severityImageScore ?? null,
    markers: update.markers || {},
    summary: update.summary || null,
    provider: update.provider || null,
    model: update.model || null,
    raw: update.raw || {},
    blobName: update.blobName || null,
    sputumCategory: update.sputumCategory || null,
    sputumCategoryConfidence: update.sputumCategoryConfidence ?? null
  };
  if (typeof stats.imageCount === 'number') {
    base.imageStats = {
      total: stats.imageCount,
      lastUpdated: entryTimestamp
    };
  }
  return applyDataCompleteness(base, entryTimestamp);
};

module.exports = {
  REQUIRED_SYMPTOM_FIELDS,
  clampConfidence,
  mergeSymptomExtraction,
  mergeVisionAnalysis,
  applyDataCompleteness,
  appendStatusTransition
};