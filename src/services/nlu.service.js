const { TextAnalyticsClient, AzureKeyCredential } = require('@azure/ai-text-analytics');
const config = require('../config/env.config');
const { getPrisma } = require('../config/prisma.config');
const { toBooleanOrNull, toNumberOrNull } = require('../utils/parse.utils');

let textClient;

const getClient = () => {
  if (!config.aiTextEndpoint || !config.aiTextKey) {
    throw new Error('Azure Text Analytics not configured');
  }
  if (!textClient) {
    textClient = new TextAnalyticsClient(config.aiTextEndpoint, new AzureKeyCredential(config.aiTextKey));
  }
  return textClient;
};

const extractSymptoms = async (text) => {
  if (!text || typeof text !== 'string') {
    return {};
  }
  try {
    const response = await getClient().analyzeHealthcareEntities([text]);
    const result = await response.next();
    if (!result || !result.value || !Array.isArray(result.value.entities)) {
      return {};
    }
    const entities = result.value.entities;
    const mapped = {};
    entities.forEach((entity) => {
      if (!entity || !entity.text) {
        return;
      }
      const category = entity.category || '';
      const normalizedText = entity.text.toLowerCase();
      if (normalizedText.includes('demam') || category === 'SymptomOrSign') {
        mapped.fever = true;
      }
      if (normalizedText.includes('batuk')) {
        mapped.cough = true;
      }
      if (normalizedText.includes('sesak') || normalizedText.includes('napas')) {
        mapped.dyspnea = true;
      }
      if (normalizedText.includes('komorbid') || category === 'Condition') {
        mapped.comorbidity = true;
      }
    });
    return mapped;
  } catch (error) {
    const err = new Error('Text analytics failed');
    err.cause = error;
    throw err;
  }
};

const calculateSymptomScore = ({ fever, coughDays, dyspnea, comorbidity }) => {
  const feverScore = fever ? 0.3 : 0;
  const coughScore = coughDays && coughDays > 3 ? 0.2 : 0;
  const dyspneaScore = dyspnea ? 0.35 : 0;
  const comorbidityScore = comorbidity ? 0.15 : 0;
  const score = feverScore + coughScore + dyspneaScore + comorbidityScore;
  return Number(score.toFixed(2));
};

const buildSymptomsPayload = ({ text, fever, coughDays, dyspnea, comorbidity }) => {
  return {
    feverStatus: toBooleanOrNull(fever),
    onsetDays: toNumberOrNull(coughDays),
    dyspnea: toBooleanOrNull(dyspnea),
    comorbidity: toBooleanOrNull(comorbidity),
    rawText: { text }
  };
};

const evaluateText = async ({ caseId, text, prisma }) => {
  const client = prisma || getPrisma();
  if (!caseId) {
    throw new Error('caseId is required');
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required');
  }
  const entities = await extractSymptoms(text);
  const payload = buildSymptomsPayload({ text, ...entities });
  const severitySymptom = calculateSymptomScore({
    fever: payload.feverStatus,
    coughDays: payload.onsetDays,
    dyspnea: payload.dyspnea,
    comorbidity: payload.comorbidity
  });
  const result = await client.symptoms.create({
    data: {
      case_id: caseId,
      fever_status: payload.feverStatus,
      onset_days: payload.onsetDays,
      dyspnea: payload.dyspnea,
      comorbidity: payload.comorbidity,
      severity_symptom: severitySymptom,
      raw_text: payload.rawText
    }
  });
  return {
    severitySymptom,
    payload: result
  };
};

module.exports = {
  evaluateText,
  calculateSymptomScore,
  extractSymptoms
};
