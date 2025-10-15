const config = require('../config/env.config');
const { getPrisma } = require('../config/prisma.config');
const { toNullableDecimal } = require('../utils/prisma-helpers');

const clampAlpha = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0.6;
  }
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 1) {
    return 1;
  }
  return Number(numeric.toFixed(2));
};

const normalizeThresholds = (input) => {
  if (!Array.isArray(input) || input.length < 2) {
    return [0.4, 0.7];
  }
  const [mild, severe] = input.map((value) => {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : Number(numeric.toFixed(2));
  });
  if (mild === null || severe === null) {
    return [0.4, 0.7];
  }
  if (mild >= severe) {
    return [0.4, 0.7];
  }
  return [mild, severe];
};

const classifySeverity = (score, thresholds = config.triageThresholds) => {
  if (score === null || score === undefined) {
    return null;
  }
  const [mildThreshold, severeThreshold] = normalizeThresholds(thresholds);
  if (score < mildThreshold) {
    return 'MILD';
  }
  if (score > severeThreshold) {
    return 'SEVERE';
  }
  return 'MODERATE';
};

const calculateSeverity = ({ imageScore, symptomScore, alpha = config.triageAlpha, thresholds = config.triageThresholds }) => {
  const resolvedAlpha = clampAlpha(alpha);
  const missingInputs = [];
  if (imageScore === null || imageScore === undefined) {
    missingInputs.push('imageScore');
  }
  if (symptomScore === null || symptomScore === undefined) {
    missingInputs.push('symptomScore');
  }
  let severityScore = null;
  if (missingInputs.length === 2) {
    severityScore = null;
  } else if (missingInputs.length === 1) {
    severityScore = missingInputs.includes('imageScore') ? symptomScore : imageScore;
  } else {
    severityScore = resolvedAlpha * imageScore + (1 - resolvedAlpha) * symptomScore;
  }
  if (typeof severityScore === 'number' && Number.isFinite(severityScore)) {
    severityScore = Math.max(0, Math.min(1, Number(severityScore.toFixed(2))));
  } else {
    severityScore = null;
  }
  const severityClass = classifySeverity(severityScore, thresholds);
  return {
    severityScore,
    severityClass,
    components: {
      imageScore,
      symptomScore,
      alpha: resolvedAlpha,
      thresholds: normalizeThresholds(thresholds),
      missingInputs,
      usedFallback: missingInputs.length > 0
    }
  };
};

const resolveClient = (client) => {
  if (client) {
    return client;
  }
  return getPrisma();
};

const fetchComponentScores = async (client, caseId) => {
  const [imageRecord, symptomRecord] = await Promise.all([
    client.images.findFirst({
      where: {
        case_id: caseId,
        s_i: { not: null }
      },
      orderBy: { created_at: 'desc' },
      select: { s_i: true }
    }),
    client.symptoms.findFirst({
      where: {
        case_id: caseId,
        severity_symptom: { not: null }
      },
      orderBy: { created_at: 'desc' },
      select: { severity_symptom: true }
    })
  ]);
  return {
    imageScore: imageRecord ? toNullableDecimal(imageRecord.s_i) : null,
    symptomScore: symptomRecord ? toNullableDecimal(symptomRecord.severity_symptom) : null
  };
};

const evaluateCase = async ({ caseId, prisma }) => {
  const client = resolveClient(prisma);
  const { imageScore, symptomScore } = await fetchComponentScores(client, caseId);
  const evaluation = calculateSeverity({ imageScore, symptomScore });
  return {
    ...evaluation,
    components: {
      ...evaluation.components,
      imageScore,
      symptomScore
    }
  };
};

module.exports = {
  clampAlpha,
  calculateSeverity,
  classifySeverity,
  evaluateCase
};
