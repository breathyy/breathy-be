const OpenAI = require('openai');
const config = require('../config/env.config');
const { clampConfidence } = require('../utils/triage-metadata');

let openAiClient;

const weights = {
  GREEN: 0.4,
  BLOOD_TINGED: 0.3,
  VISCOUS: 0.2,
  CLEAR: 0.1
};

const VALID_SPUTUM_CATEGORIES = ['GREEN', 'BLOOD_TINGED', 'VISCOUS', 'CLEAR', 'UNKNOWN'];

const getClient = () => {
  if (!config.openAiKey) {
    throw new Error('OpenAI not configured');
  }
  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: config.openAiKey });
  }
  return openAiClient;
};

const sanitizeText = (value, max = 400) => {
  if (!value) {
    return null;
  }
  return String(value).trim().slice(0, max);
};

const toMarkerEntry = (value, defaultSource = 'MODEL') => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const confidence = clampConfidence(value);
    if (confidence === null) {
      return null;
    }
    return {
      confidence,
      source: defaultSource
    };
  }
  if (typeof value === 'object') {
    const confidence = clampConfidence(value.confidence ?? value.score ?? value.value);
    if (confidence === null) {
      return null;
    }
    const entry = {
      confidence,
      source: sanitizeText(value.source || value.provider || defaultSource, 80)
    };
    const rationale = sanitizeText(value.rationale || value.reason || value.summary || value.notes, 400);
    if (rationale) {
      entry.rationale = rationale;
    }
    if (Array.isArray(value.keywords)) {
      const keywords = value.keywords
        .map((item) => sanitizeText(item, 60))
        .filter(Boolean)
        .slice(0, 6);
      if (keywords.length > 0) {
        entry.keywords = keywords;
      }
    }
    return entry;
  }
  return null;
};

const normalizeMarkers = (input, defaultSource = 'MODEL') => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return Object.entries(input).reduce((acc, [key, value]) => {
    const markerKey = String(key).toUpperCase();
    const entry = toMarkerEntry(value, defaultSource);
    if (!entry) {
      return acc;
    }
    const existing = acc[markerKey];
    if (!existing || (entry.confidence !== null && entry.confidence > existing.confidence)) {
      acc[markerKey] = entry;
    } else if (existing && entry.rationale && !existing.rationale) {
      acc[markerKey] = {
        ...existing,
        rationale: entry.rationale
      };
    }
    return acc;
  }, {});
};

const mergeMarkerMaps = (primary, secondary) => {
  const result = { ...primary };
  Object.entries(secondary || {}).forEach(([marker, entry]) => {
    const existing = result[marker];
    if (!existing || (entry.confidence !== null && entry.confidence > existing.confidence)) {
      result[marker] = { ...entry };
    } else if (existing) {
      const merged = { ...existing };
      if (!merged.rationale && entry.rationale) {
        merged.rationale = entry.rationale;
      }
      if (!merged.keywords && entry.keywords) {
        merged.keywords = entry.keywords;
      }
      result[marker] = merged;
    }
  });
  return result;
};

const calculateSi = (markers) => {
  const normalized = normalizeMarkers(markers);
  let numerator = 0;
  let denominator = 0;
  Object.entries(weights).forEach(([marker, weight]) => {
    const entry = normalized[marker];
    if (!entry) {
      return;
    }
    const confidence = clampConfidence(entry.confidence);
    if (confidence === null || confidence <= 0) {
      return;
    }
    numerator += confidence * weight;
    denominator += weight;
  });
  if (denominator === 0) {
    return null;
  }
  return Number((numerator / denominator).toFixed(2));
};

const parseJsonBlock = (content) => {
  if (!content || typeof content !== 'string') {
    return null;
  }
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1] : content;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

const analyseWithOpenAi = async ({ downloadUrl }) => {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: config.openAiModel || 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical imaging assistant. Analyse sputum or throat photos and return JSON with severity markers. Keys: markers (object with GREEN, BLOOD_TINGED, VISCOUS, CLEAR each having {confidence: 0-1, rationale?: string}), summary (string), recommendedCategory (GREEN|BLOOD_TINGED|VISCOUS|CLEAR|UNKNOWN). Respond ONLY with JSON.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Evaluate this image and extract severity markers for sputum/throat analysis.'
          },
          {
            type: 'image_url',
            image_url: {
              url: downloadUrl
            }
          }
        ]
      }
    ]
  });
  const rawContent = completion?.choices?.[0]?.message?.content || '';
  const parsed = parseJsonBlock(rawContent) || {};
  const markers = parsed.markers && typeof parsed.markers === 'object' ? parsed.markers : {};
  const summary = sanitizeText(parsed.summary, 600);
  const recommendedCategoryRaw = sanitizeText(
    parsed.recommendedCategory || parsed.dominantMarker || parsed.primaryMarker,
    40
  );
  const recommendedCategory = recommendedCategoryRaw
    ? VALID_SPUTUM_CATEGORIES.includes(recommendedCategoryRaw.toUpperCase())
      ? recommendedCategoryRaw.toUpperCase()
      : 'UNKNOWN'
    : null;
  return {
    markers,
    summary,
    provider: 'OPENAI_GPT4O',
    model: config.openAiModel || 'gpt-4o-mini',
    raw: {
      parsed,
      rawExcerpt: sanitizeText(rawContent, 1000)
    },
    recommendedCategory
  };
};

const determineSputumCategory = (markers) => {
  const normalized = normalizeMarkers(markers);
  let bestCategory = 'UNKNOWN';
  let bestConfidence = null;
  Object.keys(weights).forEach((marker) => {
    const entry = normalized[marker];
    if (!entry) {
      return;
    }
    const confidence = clampConfidence(entry.confidence);
    if (confidence === null) {
      return;
    }
    if (bestConfidence === null || confidence > bestConfidence) {
      bestCategory = marker;
      bestConfidence = confidence;
    }
  });
  return {
    category: bestCategory,
    confidence: bestConfidence
  };
};

const analyseImage = async ({ markers, downloadUrl, blobName }) => {
  const timestamp = new Date().toISOString();
  let combinedMarkers = normalizeMarkers(markers || {}, 'MANUAL_INPUT');
  let aiResult = null;
  if (downloadUrl && config.openAiKey) {
    try {
      aiResult = await analyseWithOpenAi({ downloadUrl });
      const modelMarkers = normalizeMarkers(aiResult.markers, 'OPENAI_GPT4O');
      combinedMarkers = mergeMarkerMaps(combinedMarkers, modelMarkers);
    } catch {
      // swallow and fallback to manual markers only
    }
  }
  const normalizedMarkers = normalizeMarkers(combinedMarkers);
  const severityImageScore = calculateSi(normalizedMarkers);
  const sputum = determineSputumCategory(normalizedMarkers);
  const provider = aiResult
    ? aiResult.provider
    : Object.keys(normalizedMarkers).length > 0
      ? 'MANUAL_INPUT'
      : 'UNKNOWN';
  return {
    markers: normalizedMarkers,
    severityImageScore,
    visionRanAt: severityImageScore !== null || aiResult ? timestamp : null,
    summary: aiResult ? aiResult.summary : null,
    provider,
    model: aiResult ? aiResult.model : null,
    raw: aiResult ? aiResult.raw : {},
    sputumCategory: aiResult && aiResult.recommendedCategory ? aiResult.recommendedCategory : sputum.category,
    sputumCategoryConfidence: sputum.confidence,
    blobName: blobName || null
  };
};

module.exports = {
  analyseImage,
  calculateSi,
  normalizeMarkers,
  determineSputumCategory
};
