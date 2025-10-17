const OpenAI = require('openai');
const config = require('../config/env.config');
const { getPrisma } = require('../config/prisma.config');
const { toBooleanOrNull, toNumberOrNull } = require('../utils/parse.utils');
const { mergeSymptomExtraction, REQUIRED_SYMPTOM_FIELDS, clampConfidence } = require('../utils/triage-metadata');

let openAiClient;

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
  if (value === undefined || value === null) {
    return null;
  }
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
};

const heuristicsExtract = (text) => {
  const baseline = {
    fields: {},
    confidences: {},
    rationales: {},
    heuristicsSignals: [],
    recommendImage: true
  };
  if (!text || typeof text !== 'string') {
    return baseline;
  }
  const normalized = text.toLowerCase();
  const { fields, confidences, rationales, heuristicsSignals } = baseline;

  if (normalized.includes('demam') || normalized.includes('fever')) {
    fields.feverStatus = true;
    confidences.feverStatus = 0.4;
    rationales.feverStatus = 'Keyword indicates fever >=38°C.';
    heuristicsSignals.push('keyword:fever');
  }
  const SYMPTOM_LABELS = {
    feverStatus: 'demam tinggi',
    onsetDays: 'durasi batuk',
    dyspnea: 'keluhan sesak napas',
    comorbidity: 'riwayat komorbiditas'
  };


  const coughPattern =
    normalized.match(/batuk(?:\s+selama)?\s+(\d{1,2})\s*(hari|day|days)/) ||
    normalized.match(/cough(?:ing)?\s+(for\s+)?(\d{1,2})\s*(day|days)/);
  if (coughPattern) {
    const value = coughPattern[1] || coughPattern[2];
    const days = Number(value);
    if (!Number.isNaN(days)) {
      fields.onsetDays = days;
      confidences.onsetDays = 0.35;
      rationales.onsetDays = 'Detected cough duration reference.';
      heuristicsSignals.push('pattern:cough_duration');
    }
  }
  if (fields.onsetDays === undefined && (normalized.includes('batuk') || normalized.includes('cough'))) {
    fields.onsetDays = null;
    heuristicsSignals.push('keyword:cough');
  }

  const dyspneaTerms = ['sesak', 'napas', 'nafas', 'shortness of breath', 'short of breath', 'difficulty breathing'];
  if (dyspneaTerms.some((term) => normalized.includes(term))) {
    fields.dyspnea = true;
    confidences.dyspnea = 0.45;
    rationales.dyspnea = 'Detected dyspnea indicator.';
    heuristicsSignals.push('keyword:dyspnea');
  }

  const comorbidityKeywords = ['komorbid', 'diabetes', 'hipertensi', 'hypertension', 'asma', 'asthma', 'tb', 'tuberkulosis', 'tuberculosis', 'hiv'];
  if (comorbidityKeywords.some((keyword) => normalized.includes(keyword))) {
    fields.comorbidity = true;
    confidences.comorbidity = 0.4;
    rationales.comorbidity = 'Detected comorbidity keyword.';
    heuristicsSignals.push('keyword:comorbidity');
  }

  baseline.recommendImage = /foto|photo|gambar|image|sputum|dahak|tenggorokan/.test(normalized) || baseline.recommendImage;
  return baseline;
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

const parseSymptomResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return {
      fields: {},
      confidences: {},
      rationales: {},
      notes: [],
      missingFields: [],
      recommendImage: undefined
    };
  }

  const symptoms = payload.symptoms && typeof payload.symptoms === 'object' ? payload.symptoms : {};
  const fields = {};
  const confidences = {};
  const rationales = {};
  REQUIRED_SYMPTOM_FIELDS.forEach((field) => {
    const entry = symptoms[field];
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const value = entry.value;
    if (field === 'onsetDays') {
      const numeric = toNumberOrNull(value);
      fields.onsetDays = numeric;
    } else {
      const bool = toBooleanOrNull(value);
      if (bool !== null) {
        fields[field] = bool;
      }
    }
    const confidence = clampConfidence(entry.confidence);
    if (confidence !== null) {
      confidences[field] = confidence;
    }
    const rationale = sanitizeText(entry.rationale || entry.reason || entry.notes, 400);
    if (rationale) {
      rationales[field] = rationale;
    }
  });

  const notes = Array.isArray(payload.notes)
    ? payload.notes.map((note) => sanitizeText(note, 200)).filter(Boolean)
    : [];
  const missingFields = Array.isArray(payload.missingFields)
    ? payload.missingFields
        .map((item) => String(item))
        .filter((item) => REQUIRED_SYMPTOM_FIELDS.includes(item))
    : [];
  const recommendImage = typeof payload.recommendImage === 'boolean' ? payload.recommendImage : undefined;

  return {
    fields,
    confidences,
    rationales,
    notes,
    missingFields,
    recommendImage
  };
};

const ensureFieldDefaults = (fields) => {
  const result = { ...fields };
  REQUIRED_SYMPTOM_FIELDS.forEach((field) => {
    if (result[field] === undefined) {
      result[field] = null;
    } else if (field === 'onsetDays') {
      result[field] = toNumberOrNull(result[field]);
    } else {
      const bool = toBooleanOrNull(result[field]);
      result[field] = bool;
    }
  });
  return result;
};

const extractSymptoms = async (text, options = {}) => {
  const { context } = options;
  if (!text || typeof text !== 'string') {
    return {
      fields: ensureFieldDefaults({}),
      confidences: {},
      rationales: {},
      missingFields: [...REQUIRED_SYMPTOM_FIELDS],
      recommendImage: true,
      provider: 'NONE',
      model: null,
      heuristicsApplied: [],
      fallbackUsed: true,
      notes: [],
      raw: {}
    };
  }

  const heuristics = heuristicsExtract(text);
  const contextSummary = summarizeContext(context);
  let fields = { ...heuristics.fields };
  let confidences = { ...heuristics.confidences };
  let rationales = { ...heuristics.rationales };
  let recommendImage = heuristics.recommendImage;
  let provider = 'HEURISTIC';
  let model = null;
  let fallbackUsed = false;
  let notes = [];
  const raw = {
    heuristics: {
      signals: heuristics.heuristicsSignals || [],
      recommendImage: heuristics.recommendImage
    }
  };
  if (contextSummary) {
    raw.context = contextSummary;
  }

  if (config.openAiKey) {
    try {
      const client = getClient();
      const baseSystemPrompt =
        'You are Breathy, a warm Indonesian virtual respiratory triage companion. Interpret patient stories (including slang or mixed languages) and extract structured respiratory triage data. Respond ONLY with JSON matching {"symptoms":{"feverStatus":{"value":boolean|null,"confidence":0-1,"rationale?":string},"onsetDays":{"value":number|null,"confidence":0-1,"rationale?":string},"dyspnea":{"value":boolean|null,"confidence":0-1,"rationale?":string},"comorbidity":{"value":boolean|null,"confidence":0-1,"rationale?":string}},"missingFields":string[],"recommendImage":boolean,"notes"?:string[]}. When unsure, set value null and include the field in missingFields. Use Bahasa Indonesia for notes and suggest gentle follow-up questions.';
      const messages = [{ role: 'system', content: baseSystemPrompt }];
      if (contextSummary) {
        const contextLines = [];
        if (contextSummary.knownStatements.length > 0) {
          contextLines.push(`Informasi yang sudah tercatat: ${contextSummary.knownStatements.join('; ')}.`);
        }
        if (contextSummary.missingLabels.length > 0) {
          contextLines.push(`Prioritaskan melengkapi: ${contextSummary.missingLabels.join(', ')}.`);
        }
        if (contextSummary.awaitingClarification) {
          contextLines.push('Ringkasan sebelumnya sedang menunggu klarifikasi pasien.');
        }
        const contextInstruction = `Gunakan konteks percakapan sejauh ini. Jika cerita baru berbeda dengan catatan lama, utamakan pesan terbaru pasien.${
          contextLines.length > 0 ? `\n${contextLines.join('\n')}` : ''
        }`;
        messages.push({
          role: 'system',
          content: contextInstruction
        });
      }
      messages.push({
        role: 'user',
        content: `Pesan pasien terbaru (gunakan bahasa aslinya):\n${text}`
      });

      const completion = await client.chat.completions.create({
        model: config.openAiModel || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 600,
        messages
      });
      const rawContent = completion?.choices?.[0]?.message?.content || '';
      const parsed = parseJsonBlock(rawContent);
      if (parsed) {
        const ai = parseSymptomResponse(parsed);
        fields = { ...fields, ...ai.fields };
        confidences = { ...confidences, ...ai.confidences };
        rationales = { ...rationales, ...ai.rationales };
        if (ai.notes.length > 0) {
          notes = ai.notes;
        }
        if (ai.recommendImage !== undefined) {
          recommendImage = ai.recommendImage;
        }
        provider = 'OPENAI_GPT4O';
        model = config.openAiModel || 'gpt-4o-mini';
        raw.parsed = parsed;
        raw.rawExcerpt = sanitizeText(rawContent, 1000);
        if (Array.isArray(parsed.missingFields)) {
          raw.missingFromModel = parsed.missingFields;
        }
      }
    } catch (error) {
      if (Object.keys(fields).length === 0) {
        const err = new Error('OpenAI NLU failed');
        err.cause = error;
        throw err;
      }
      fallbackUsed = true;
      raw.error = sanitizeText(error.message, 160);
    }
  } else {
    fallbackUsed = true;
  }

  fields = ensureFieldDefaults(fields);
  const missingFields = REQUIRED_SYMPTOM_FIELDS.filter((field) => fields[field] === null || fields[field] === undefined);
  const analysis = {
    fields,
    confidences,
    rationales,
    missingFields,
    recommendImage: recommendImage ?? true,
    provider,
    model,
    heuristicsApplied: heuristics.heuristicsSignals || [],
    fallbackUsed,
    notes,
    raw,
    readyForPreprocessing: missingFields.length === 0
  };
  analysis.raw.notes = notes;
  return analysis;
};

const calculateSymptomScore = (fields) => {
  if (!fields || typeof fields !== 'object') {
    return 0;
  }
  const feverScore = fields.feverStatus === true ? 0.3 : 0;
  const coughDays = toNumberOrNull(fields.onsetDays);
  const coughScore = coughDays !== null && coughDays > 3 ? 0.2 : 0;
  const dyspneaScore = fields.dyspnea === true ? 0.35 : 0;
  const comorbidityScore = fields.comorbidity === true ? 0.15 : 0;
  return Number((feverScore + coughScore + dyspneaScore + comorbidityScore).toFixed(2));
};

const buildSymptomsPayload = ({ text, analysis }) => {
  const fields = analysis.fields || {};
  const analysisSnapshot = {
    provider: analysis.provider,
    model: analysis.model,
    confidences: analysis.confidences,
    rationales: analysis.rationales,
    missingFields: analysis.missingFields,
    recommendImage: analysis.recommendImage,
    heuristicsSignals: analysis.heuristicsApplied,
    fallbackUsed: analysis.fallbackUsed,
    notes: analysis.notes,
    readyForPreprocessing: analysis.readyForPreprocessing,
    rawExcerpt: analysis.raw && analysis.raw.rawExcerpt,
    parsed: analysis.raw && analysis.raw.parsed,
    heuristics: analysis.raw && analysis.raw.heuristics,
    missingFromModel: analysis.raw && analysis.raw.missingFromModel
  };

  Object.keys(analysisSnapshot).forEach((key) => {
    if (analysisSnapshot[key] === undefined || analysisSnapshot[key] === null) {
      delete analysisSnapshot[key];
    }
  });

  return {
    feverStatus: toBooleanOrNull(fields.feverStatus),
    onsetDays: toNumberOrNull(fields.onsetDays),
    dyspnea: toBooleanOrNull(fields.dyspnea),
    comorbidity: toBooleanOrNull(fields.comorbidity),
    rawText: {
      text,
      analysis: analysisSnapshot
    }
  };
};

const evaluateText = async ({ caseId, text, prisma, context }) => {
  const client = prisma || getPrisma();
  if (!caseId) {
    throw new Error('caseId is required');
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required');
  }

  const analysis = await extractSymptoms(text, { context });
  const payload = buildSymptomsPayload({ text, analysis });
  const severitySymptom = calculateSymptomScore(analysis.fields);

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

  const [symptomCount, caseRecord] = await Promise.all([
    client.symptoms.count({ where: { case_id: caseId } }),
    client.cases.findUnique({
      where: { id: caseId },
      select: { triage_metadata: true }
    })
  ]);

  const existingMetadata =
    caseRecord && caseRecord.triage_metadata && typeof caseRecord.triage_metadata === 'object'
      ? caseRecord.triage_metadata
      : {};
  const now = new Date();
  const mergedMetadata = mergeSymptomExtraction(
    existingMetadata,
    {
      at: now.toISOString(),
      severitySymptom,
      fields: {
        feverStatus: payload.feverStatus,
        onsetDays: payload.onsetDays,
        dyspnea: payload.dyspnea,
        comorbidity: payload.comorbidity
      },
      confidences: analysis.confidences,
      rationales: analysis.rationales,
      missingFields: analysis.missingFields,
      recommendImage: analysis.recommendImage,
      provider: analysis.provider,
      model: analysis.model,
      heuristicsApplied: analysis.heuristicsApplied && analysis.heuristicsApplied.length > 0,
      heuristicsSignals: analysis.heuristicsApplied,
      fallbackUsed: analysis.fallbackUsed,
      raw: analysis.raw
    },
    { symptomEntries: symptomCount }
  );

  await client.cases.update({
    where: { id: caseId },
    data: {
      triage_metadata: mergedMetadata,
      updated_at: now
    }
  });

  return {
    severitySymptom,
    payload: result,
    analysis: {
      ...analysis,
      severitySymptom,
      readyForPreprocessing:
        mergedMetadata.dataCompleteness?.readyForPreprocessing ?? analysis.readyForPreprocessing
    },
    triageMetadata: mergedMetadata
  };
};

module.exports = {
  evaluateText,
  calculateSymptomScore,
  extractSymptoms
};
