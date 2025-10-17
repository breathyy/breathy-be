const OpenAI = require('openai');
const config = require('../config/env.config');
const { getPrisma } = require('../config/prisma.config');
const { toBooleanOrNull, toNumberOrNull } = require('../utils/parse.utils');
const { mergeSymptomExtraction, REQUIRED_SYMPTOM_FIELDS, clampConfidence } = require('../utils/triage-metadata');

let openAiClient;

const SYMPTOM_LABELS = {
  feverStatus: 'demam tinggi',
  onsetDays: 'durasi batuk',
  dyspnea: 'keluhan sesak napas',
  comorbidity: 'riwayat komorbiditas'
};

const TASK_DEFINITIONS = {
  feverStatus: {
    label: SYMPTOM_LABELS.feverStatus,
    focus: 'Pastikan apakah pasien mengalami demam tinggi ≥38°C atau sensasi panas yang berulang.',
    followUp: 'Kalau suhu tubuh pernah diukur, sebutkan angkanya ya.'
  },
  onsetDays: {
    label: SYMPTOM_LABELS.onsetDays,
    focus: 'Catat sudah berapa lama batuk berlangsung atau kapan mulai terasa.',
    followUp: 'Boleh sebut kira-kira berapa hari atau sejak tanggal berapa.'
  },
  dyspnea: {
    label: SYMPTOM_LABELS.dyspnea,
    focus: 'Deteksi apakah pasien merasakan sesak, napas pendek, atau cepat lelah saat bernapas.',
    followUp: 'Kalau ada, jelaskan situasinya kapan terasa sesaknya.'
  },
  comorbidity: {
    label: SYMPTOM_LABELS.comorbidity,
    focus: 'Ketahui riwayat penyakit penyerta seperti asma, diabetes, hipertensi, atau lainnya.',
    followUp: 'Sebutkan jenis komorbiditasnya kalau ada.'
  }
};

const TASK_ORDER = ['feverStatus', 'onsetDays', 'dyspnea', 'comorbidity'];
const TASK_STATUSES = ['PENDING', 'ASKING', 'COLLECTED', 'CONFIRMED', 'CLARIFY'];
const CONFIRM_STATES = ['NONE', 'REQUEST', 'CONFIRMED', 'REVISE'];

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

const describeSymptomField = (field, value) => {
  const label = SYMPTOM_LABELS[field] || field;
  if (field === 'onsetDays') {
    const numeric = toNumberOrNull(value);
    if (numeric !== null && !Number.isNaN(numeric)) {
      return `Durasi batuk tercatat ${numeric} hari`;
    }
    return null;
  }
  if (value === true) {
    return `${label} sudah dilaporkan ada`;
  }
  if (value === false) {
    return `${label} dilaporkan tidak ada`;
  }
  return null;
};

const buildInitialTaskState = () => {
  const tasks = {};
  TASK_ORDER.forEach((field) => {
    tasks[field] = {
      field,
      status: 'PENDING',
      lastUpdatedAt: null,
      prompt: null,
      latestAnswer: null
    };
  });
  return tasks;
};

const ensureConversationState = (metadataConversation) => {
  const base = metadataConversation && typeof metadataConversation === 'object' ? { ...metadataConversation } : {};
  const tasks = base.tasks && typeof base.tasks === 'object' ? { ...base.tasks } : buildInitialTaskState();
  TASK_ORDER.forEach((field) => {
    if (!tasks[field] || typeof tasks[field] !== 'object') {
      tasks[field] = buildInitialTaskState()[field];
    } else {
      tasks[field] = {
        field,
        status: TASK_STATUSES.includes(tasks[field].status) ? tasks[field].status : 'PENDING',
        lastUpdatedAt: tasks[field].lastUpdatedAt || null,
        prompt: tasks[field].prompt || null,
        latestAnswer: tasks[field].latestAnswer || null,
        value: tasks[field].value !== undefined ? tasks[field].value : null
      };
    }
  });
  return {
    ...base,
    tasks,
    confirmationState: CONFIRM_STATES.includes(base.confirmationState) ? base.confirmationState : 'NONE',
    lastReply: base.lastReply || null,
    lastUpdatedAt: base.lastUpdatedAt || null,
    readyForDoctor: Boolean(base.readyForDoctor),
    escalatedAt: base.escalatedAt || null,
    allowSmallTalk: base.allowSmallTalk !== undefined ? Boolean(base.allowSmallTalk) : true,
    summary: base.summary || null,
    planContext: base.planContext || null,
    doctorReview: base.doctorReview || null
  };
};

const serializeTaskState = (tasks) => {
  const snapshot = {};
  TASK_ORDER.forEach((field) => {
    const current = tasks[field] || {};
    snapshot[field] = {
      status: current.status || 'PENDING',
      latestAnswer: current.latestAnswer || null,
      prompt: current.prompt || null,
      value: current.value !== undefined ? current.value : null
    };
  });
  return snapshot;
};

const buildTaskContextLines = (tasks) => {
  return TASK_ORDER.map((field) => {
    const definition = TASK_DEFINITIONS[field];
    const task = tasks[field];
    const status = task?.status || 'PENDING';
    const answer = task?.latestAnswer;
    const value = task?.value;
    const parts = [`- ${definition.label}: status ${status}`];
    if (value !== null && value !== undefined) {
      parts.push(`nilai ${value}`);
    }
    if (answer) {
      parts.push(`jawaban: ${answer}`);
    }
    return parts.join('; ');
  }).join('\n');
};

const summarizeContext = (metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const summary = {
    knownStatements: [],
    missingLabels: [],
    awaitingClarification: Boolean(metadata?.questionnaire?.awaitingClarification)
  };

  const lastExtraction = metadata.lastSymptomExtraction;
  if (lastExtraction && typeof lastExtraction === 'object' && lastExtraction.fields) {
    REQUIRED_SYMPTOM_FIELDS.forEach((field) => {
      const narrative = describeSymptomField(field, lastExtraction.fields[field]);
      if (narrative) {
        summary.knownStatements.push(narrative);
      }
    });
  }

  const missing = Array.isArray(metadata?.dataCompleteness?.missingSymptoms)
    ? metadata.dataCompleteness.missingSymptoms
    : [];
  if (missing.length > 0) {
    summary.missingLabels = missing.map((field) => SYMPTOM_LABELS[field] || field);
  }

  const summarySnapshot = metadata?.questionnaire?.summarySnapshot;
  if (summarySnapshot && summarySnapshot.fields) {
    const generatedAt = summarySnapshot.generatedAt ? ` (dibuat ${summarySnapshot.generatedAt})` : '';
    summary.knownStatements.push(`Ringkasan gejala terakhir sudah dibagikan${generatedAt}.`);
  }

  if (summary.knownStatements.length === 0 && summary.missingLabels.length === 0 && !summary.awaitingClarification) {
    return null;
  }

  return summary;
};

const fetchRecentTextMessages = async (prisma, caseId, limit = 8) => {
  if (!prisma || !caseId) {
    return [];
  }
  const records = await prisma.chat_messages.findMany({
    where: { case_id: caseId, message_type: 'text' },
    orderBy: { created_at: 'desc' },
    take: limit,
    select: {
      content: true,
      meta: true
    }
  });
  return records.reverse();
};

const mapHistoryToMessages = (history, latestPatientText) => {
  const messages = [];
  if (Array.isArray(history)) {
    history.forEach((entry) => {
      const content = typeof entry.content === 'string' ? entry.content.trim() : '';
      if (!content) {
        return;
      }
      const direction = entry.meta && typeof entry.meta === 'object' ? entry.meta.direction : null;
      const role = direction === 'OUTBOUND' ? 'assistant' : 'user';
      messages.push({ role, content });
    });
  }
  if (latestPatientText) {
    messages.push({ role: 'user', content: latestPatientText });
  }
  return messages.slice(-10);
};

const parseTaskStatuses = (payload) => {
  const map = {};
  if (!payload || typeof payload !== 'object') {
    return map;
  }
  Object.entries(payload).forEach(([field, entry]) => {
    if (!TASK_ORDER.includes(field)) {
      return;
    }
    let status = null;
    let prompt = null;
    let latestAnswer = null;
    let value = null;
    if (typeof entry === 'string') {
      status = entry.toUpperCase();
    } else if (entry && typeof entry === 'object') {
      const rawStatus = entry.status || entry.state || entry.phase;
      if (typeof rawStatus === 'string') {
        status = rawStatus.toUpperCase();
      }
      if (entry.prompt) {
        prompt = sanitizeText(entry.prompt, 240);
      }
      if (entry.latestAnswer || entry.answer) {
        latestAnswer = sanitizeText(entry.latestAnswer || entry.answer, 240);
      }
      if (Object.prototype.hasOwnProperty.call(entry, 'value')) {
        value = entry.value;
      }
    }
    if (!TASK_STATUSES.includes(status)) {
      status = 'PENDING';
    }
    map[field] = {
      status,
      prompt,
      latestAnswer,
      value
    };
  });
  return map;
};

const parseConversationExtras = (parsed) => {
  const reply = sanitizeText(parsed?.reply, 900);
  const taskStatus = parseTaskStatuses(parsed?.taskStatus || parsed?.tasks);
  const confirmationRaw = parsed?.confirmation || {};
  let confirmationState = 'NONE';
  if (confirmationRaw && typeof confirmationRaw === 'object' && typeof confirmationRaw.state === 'string') {
    const normalized = confirmationRaw.state.toUpperCase();
    if (CONFIRM_STATES.includes(normalized)) {
      confirmationState = normalized;
    }
  }
  const confirmationSummary = sanitizeText(
    (confirmationRaw && (confirmationRaw.summary || confirmationRaw.message || confirmationRaw.notes)) || null,
    400
  );
  const allowSmallTalk = parsed?.allowSmallTalk !== undefined ? Boolean(parsed.allowSmallTalk) : true;
  const planContext = parsed?.planContext && typeof parsed.planContext === 'object' ? parsed.planContext : null;
  const notes = Array.isArray(parsed?.notes)
    ? parsed.notes.map((item) => sanitizeText(item, 200)).filter(Boolean)
    : [];
  const recommendImage =
    typeof parsed?.recommendImage === 'boolean'
      ? parsed.recommendImage
      : typeof parsed?.requestImage === 'boolean'
        ? parsed.requestImage
        : undefined;
  return {
    replyMessage: reply || null,
    taskStatus,
    confirmationState,
    confirmationSummary,
    allowSmallTalk,
    planContext,
    notes,
    recommendImage
  };
};

const mergeConversationSnapshot = (metadata, analysis, timestampIso) => {
  const base = metadata && typeof metadata === 'object' ? JSON.parse(JSON.stringify(metadata)) : {};
  const conversation = ensureConversationState(base.conversation);
  const incomingTasks = analysis?.conversation?.taskStatus || {};
  TASK_ORDER.forEach((field) => {
    const task = conversation.tasks[field];
    const updates = incomingTasks[field] || {};
    if (updates.status && TASK_STATUSES.includes(updates.status)) {
      task.status = updates.status;
    }
    if (updates.prompt) {
      task.prompt = updates.prompt;
    }
    if (updates.latestAnswer) {
      task.latestAnswer = updates.latestAnswer;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'value')) {
      task.value = updates.value;
    }
    const incomingValue = analysis.fields[field];
    if (incomingValue !== undefined && incomingValue !== null) {
      task.value = field === 'onsetDays' ? toNumberOrNull(incomingValue) : incomingValue;
      if (task.status === 'PENDING' || task.status === 'ASKING' || task.status === 'CLARIFY') {
        task.status = 'COLLECTED';
      }
      if (!task.latestAnswer) {
        task.latestAnswer = sanitizeText(String(incomingValue), 160);
      }
      task.lastUpdatedAt = timestampIso;
    }
    conversation.tasks[field] = task;
  });

  const confirmationState = analysis?.conversation?.confirmationState || conversation.confirmationState;
  if (CONFIRM_STATES.includes(confirmationState)) {
    conversation.confirmationState = confirmationState;
  }
  if (analysis?.conversation?.confirmationSummary) {
    conversation.summary = analysis.conversation.confirmationSummary;
  }
  if (analysis?.conversation?.allowSmallTalk !== undefined) {
    conversation.allowSmallTalk = Boolean(analysis.conversation.allowSmallTalk);
  }
  if (analysis?.conversation?.planContext) {
    conversation.planContext = analysis.conversation.planContext;
  }
  if (analysis?.conversation?.recommendImage !== undefined) {
    conversation.recommendImage = Boolean(analysis.conversation.recommendImage);
  }
  if (analysis.replyMessage) {
    conversation.lastReply = analysis.replyMessage;
  }
  conversation.lastUpdatedAt = timestampIso;

  if (conversation.confirmationState === 'CONFIRMED') {
    TASK_ORDER.forEach((field) => {
      conversation.tasks[field].status = 'CONFIRMED';
      conversation.tasks[field].lastUpdatedAt = timestampIso;
    });
  }

  const allCollected = TASK_ORDER.every((field) => {
    const status = conversation.tasks[field].status;
    return status === 'COLLECTED' || status === 'CONFIRMED';
  });

  const shouldEscalate =
    allCollected && conversation.confirmationState === 'CONFIRMED' && !conversation.escalatedAt && !conversation.readyForDoctor;
  if (shouldEscalate) {
    conversation.readyForDoctor = true;
  }
  if (conversation.confirmationState === 'REVISE') {
    conversation.readyForDoctor = false;
  }

  base.conversation = conversation;
  const conversationInfo = {
    reply: analysis.replyMessage || null,
    confirmationState: conversation.confirmationState,
    shouldEscalate,
    summary: conversation.summary || null,
    taskStatus: serializeTaskState(conversation.tasks)
  };

  return {
    metadata: base,
    conversationInfo
  };
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
  const { context, prisma, caseId, conversationState: existingConversationState } = options;
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
      fallbackUsed: false,
      notes: [],
      raw: {},
      replyMessage: null,
      conversation: {
        taskStatus: serializeTaskState(buildInitialTaskState()),
        confirmationState: 'NONE',
        confirmationSummary: null,
        allowSmallTalk: true,
        planContext: null,
        notes: []
      }
    };
  }

  if (!config.openAiKey || config.openAiKey.trim().length === 0) {
    throw new Error('OpenAI key not configured');
  }

  const conversationState = ensureConversationState(existingConversationState);
  const contextSummary = summarizeContext(context);
  const taskSnapshot = serializeTaskState(conversationState.tasks);
  let conversationExtras = {
    replyMessage: null,
    taskStatus: JSON.parse(JSON.stringify(taskSnapshot)),
    confirmationState: 'NONE',
    confirmationSummary: null,
    allowSmallTalk: true,
    planContext: null,
    notes: [],
    recommendImage: true
  };
  let fields = {};
  let confidences = {};
  let rationales = {};
  let recommendImage = true;
  let provider = 'OPENAI_GPT4O';
  let model = config.openAiModel || 'gpt-4o-mini';
  let notes = [];
  const raw = {};
  if (contextSummary) {
    raw.context = contextSummary;
  }

  try {
    const client = getClient();
    const baseSystemPrompt =
      'You are Breathy, a warm Indonesian virtual respiratory triage companion. Jaga percakapan alami namun tetap pastikan empat data wajib terkumpul: demam tinggi, durasi batuk, sesak napas, dan komorbiditas. Output harus berupa JSON valid tanpa penjelasan di luar JSON. Struktur wajib: {"reply":string,"symptoms":{...},"taskStatus":{field:{"status":string,"prompt?":string,"latestAnswer?":string,"value?":any}},"confirmation":{"state":"NONE|REQUEST|CONFIRMED|REVISE","summary?":string},"recommendImage":boolean,"notes"?:string[],"planContext"?:object}. Balas dalam Bahasa Indonesia yang empatik.';
    const systemTaskPrompt = `Status pengumpulan data saat ini:\n${buildTaskContextLines(conversationState.tasks)}\nSelalu hormati preferensi pengguna. Jika pasien ingin bercerita lebih panjang, tanggapi dulu lalu arahkan pelan-pelan ke pertanyaan wajib.`;
    const taskDefinitionPrompt = `Definisi tugas wajib:\n${JSON.stringify(TASK_DEFINITIONS)}`;
    const metadataPrompt = `Snapshot tugas JSON:\n${JSON.stringify(taskSnapshot)}`;
    const messages = [
      { role: 'system', content: baseSystemPrompt },
      { role: 'system', content: taskDefinitionPrompt },
      { role: 'system', content: metadataPrompt },
      { role: 'system', content: systemTaskPrompt }
    ];
    if (contextSummary) {
      const contextLines = [];
      if (contextSummary.knownStatements.length > 0) {
        contextLines.push(`Informasi yang sudah tercatat: ${contextSummary.knownStatements.join('; ')}.`);
      }
      if (contextSummary.missingLabels.length > 0) {
        contextLines.push(`Prioritaskan melengkapi: ${contextSummary.missingLabels.join(', ')}.`);
      }
      if (contextSummary.awaitingClarification) {
        contextLines.push('Ringkasan sebelumnya menunggu klarifikasi pasien.');
      }
      if (contextLines.length > 0) {
        messages.push({ role: 'system', content: contextLines.join('\n') });
      }
    }

    let historyRecords = [];
    if (prisma && caseId) {
      historyRecords = await fetchRecentTextMessages(prisma, caseId, 8);
    }
    const historyMessages = mapHistoryToMessages(historyRecords, text);
    historyMessages.forEach((msg) => {
      messages.push(msg);
    });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages
    });

    const messageContent = completion?.choices?.[0]?.message?.content;
    let rawContent = '';
    if (Array.isArray(messageContent)) {
      rawContent = messageContent
        .map((part) => {
          if (typeof part === 'string') {
            return part;
          }
          if (part && typeof part === 'object' && typeof part.text === 'string') {
            return part.text;
          }
          return '';
        })
        .join('');
    } else if (typeof messageContent === 'string') {
      rawContent = messageContent;
    }
    rawContent = rawContent ? rawContent.trim() : '';

    raw.rawExcerpt = sanitizeText(rawContent, 1000);
    const parsed = parseJsonBlock(rawContent);
    if (!parsed) {
      const snippet = rawContent ? rawContent.slice(0, 160) : 'empty response';
      throw new Error(`OpenAI response missing JSON payload: ${snippet}`);
    }
    raw.parsed = parsed;
    if (Array.isArray(parsed.missingFields)) {
      raw.missingFromModel = parsed.missingFields;
    }

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

    const extras = parseConversationExtras(parsed);
    const mergedTaskStatus = { ...conversationExtras.taskStatus };
    TASK_ORDER.forEach((field) => {
      if (extras.taskStatus[field]) {
        mergedTaskStatus[field] = {
          ...mergedTaskStatus[field],
          ...extras.taskStatus[field],
          status: TASK_STATUSES.includes(extras.taskStatus[field].status)
            ? extras.taskStatus[field].status
            : mergedTaskStatus[field].status
        };
      }
    });
    conversationExtras = {
      ...conversationExtras,
      ...extras,
      taskStatus: mergedTaskStatus,
      recommendImage: extras.recommendImage !== undefined ? extras.recommendImage : conversationExtras.recommendImage,
      notes: extras.notes && extras.notes.length > 0 ? extras.notes : conversationExtras.notes
    };
  } catch (error) {
    console.error('[nlu] OpenAI request failed:', error.message);
    const err = new Error(`OpenAI NLU failed: ${error.message}`);
    err.cause = error;
    throw err;
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
    heuristicsApplied: [],
    fallbackUsed: false,
    notes: notes.length > 0 ? notes : conversationExtras.notes || [],
    raw,
    readyForPreprocessing: missingFields.length === 0,
    replyMessage: conversationExtras.replyMessage,
    conversation: {
      taskStatus: conversationExtras.taskStatus,
      confirmationState: conversationExtras.confirmationState,
      confirmationSummary: conversationExtras.confirmationSummary,
      allowSmallTalk: conversationExtras.allowSmallTalk,
      planContext: conversationExtras.planContext,
      recommendImage: conversationExtras.recommendImage,
      notes: conversationExtras.notes
    }
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
    missingFromModel: analysis.raw && analysis.raw.missingFromModel,
    context: analysis.raw && analysis.raw.context
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

  const existingCase = await client.cases.findUnique({
    where: { id: caseId },
    select: {
      triage_metadata: true,
      status: true
    }
  });
  if (!existingCase) {
    throw new Error('Case not found');
  }

  const baseMetadata =
    existingCase.triage_metadata && typeof existingCase.triage_metadata === 'object'
      ? existingCase.triage_metadata
      : {};

  const analysis = await extractSymptoms(text, {
    context: context || baseMetadata,
    prisma: client,
    caseId,
    conversationState: baseMetadata.conversation
  });
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

  const symptomCount = await client.symptoms.count({ where: { case_id: caseId } });

  const now = new Date();
  const timestampIso = now.toISOString();

  const conversationMerged = mergeConversationSnapshot(baseMetadata, analysis, timestampIso);

  const mergedMetadata = mergeSymptomExtraction(
    conversationMerged.metadata,
    {
      at: timestampIso,
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
      raw: {
        ...analysis.raw,
        conversation: conversationMerged.conversationInfo
      }
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
    triageMetadata: mergedMetadata,
    conversation: {
      ...conversationMerged.conversationInfo,
      readyForDoctor: Boolean(mergedMetadata?.conversation?.readyForDoctor)
    }
  };
};

const setOpenAiClient = (client) => {
  openAiClient = client;
};

const resetOpenAiClient = () => {
  openAiClient = null;
};

module.exports = {
  evaluateText,
  calculateSymptomScore,
  extractSymptoms,
  __test__: {
    setOpenAiClient,
    resetOpenAiClient
  }
};
