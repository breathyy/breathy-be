const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { CognitiveServicesCredentials } = require('@azure/ms-rest-azure-js');
const config = require('../config/env.config');

let visionClient;

const keywordMappings = {
  GREEN: ['green', 'moss', 'mould', 'mold'],
  BLOOD_TINGED: ['blood', 'bloody', 'red', 'hematoma'],
  VISCOUS: ['mucus', 'phlegm', 'sputum', 'thick', 'viscous'],
  CLEAR: ['clear', 'transparent', 'clean']
};

const weights = {
  GREEN: 0.4,
  BLOOD_TINGED: 0.3,
  VISCOUS: 0.2,
  CLEAR: 0.1
};

const normalizeMarkers = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return Object.entries(input).reduce((acc, [key, value]) => {
    acc[key.toUpperCase()] = Number(value);
    return acc;
  }, {});
};

const calculateSi = (markers) => {
  const normalized = normalizeMarkers(markers);
  let numerator = 0;
  let denominator = 0;
  Object.entries(normalized).forEach(([key, value]) => {
    if (!weights[key]) {
      return;
    }
    const confidence = Number(value);
    if (Number.isNaN(confidence) || confidence <= 0) {
      return;
    }
    numerator += confidence * weights[key];
    denominator += weights[key];
  });
  if (denominator === 0) {
    return null;
  }
  const score = numerator / denominator;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
};

const isConfigured = () => {
  return Boolean(config.azureCvEndpoint && config.azureCvEndpoint.trim() && config.azureCvKey && config.azureCvKey.trim());
};

const getClient = () => {
  if (!isConfigured()) {
    throw new Error('Azure Computer Vision not configured');
  }
  if (!visionClient) {
    const credentials = new CognitiveServicesCredentials(config.azureCvKey);
    visionClient = new ComputerVisionClient(credentials, config.azureCvEndpoint);
  }
  return visionClient;
};

const scoreForKeywords = (tagMap, keywords) => {
  let score = 0;
  keywords.forEach((keyword) => {
    const value = tagMap.get(keyword);
    if (value && value > score) {
      score = value;
    }
  });
  return score === 0 ? null : Number(Math.min(1, score).toFixed(2));
};

const buildTagMap = (analysis) => {
  const tagMap = new Map();
  (analysis.tags || []).forEach((tag) => {
    if (!tag || !tag.name) {
      return;
    }
    const key = tag.name.toLowerCase();
    const confidence = Number(tag.confidence || 0);
    const existing = tagMap.get(key) || 0;
    tagMap.set(key, Math.max(existing, confidence));
  });
  const description = analysis.description || {};
  (description.tags || []).forEach((tag) => {
    if (!tag) {
      return;
    }
    const key = String(tag).toLowerCase();
    const existing = tagMap.get(key) || 0;
    tagMap.set(key, Math.max(existing, 0.6));
  });
  (description.captions || []).forEach((caption) => {
    if (!caption || !caption.text) {
      return;
    }
    const words = caption.text.toLowerCase().split(/[^a-z]+/);
    words.forEach((word) => {
      if (!word) {
        return;
      }
      const existing = tagMap.get(word) || 0;
      tagMap.set(word, Math.max(existing, Number(caption.confidence || 0.5)));
    });
  });
  return tagMap;
};

const deriveMarkersFromAnalysis = (analysis) => {
  const tagMap = buildTagMap(analysis);
  const markers = {};
  Object.entries(keywordMappings).forEach(([marker, keywords]) => {
    const score = scoreForKeywords(tagMap, keywords);
    if (score !== null) {
      markers[marker] = score;
    }
  });
  return markers;
};

const analyseWithAzure = async (downloadUrl) => {
  const client = getClient();
  const analysis = await client.analyzeImage(downloadUrl, {
    visualFeatures: ['Tags', 'Description']
  });
  return deriveMarkersFromAnalysis(analysis);
};

const analyseImage = async ({ markers, downloadUrl }) => {
  let normalizedMarkers = normalizeMarkers(markers);
  if (isConfigured() && downloadUrl) {
    try {
      const azureMarkers = await analyseWithAzure(downloadUrl);
      normalizedMarkers = normalizeMarkers({ ...normalizedMarkers, ...azureMarkers });
    } catch {
      normalizedMarkers = normalizeMarkers(normalizedMarkers);
    }
  }
  const severityImageScore = calculateSi(normalizedMarkers);
  const visionRanAt = severityImageScore === null ? null : new Date().toISOString();
  return {
    markers: normalizedMarkers,
    severityImageScore,
    visionRanAt
  };
};

module.exports = {
  analyseImage,
  calculateSi,
  isConfigured
};
