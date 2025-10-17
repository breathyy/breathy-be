const REQUIRED_FIELDS = {
  feverStatus: {
    label: 'demam tinggi',
    prompt:
      'Hai, aku Breathy — teman ngobrol kamu soal pernapasan. Ceritain ya, belakangan ini ada demam tinggi (sekitar ≥38°C) atau badan berasa panas berulang?',
    summary: (value) => {
      if (value === true) {
        return 'Demam tinggi terkonfirmasi';
      }
      if (value === false) {
        return 'Tidak ada demam tinggi';
      }
      return 'Status demam belum jelas';
    }
  },
  onsetDays: {
    label: 'durasi batuk',
    prompt:
      'Boleh cerita sudah berapa lama batuknya dirasakan? Bisa sebut kira-kira berapa hari atau sejak kapan mulai terasa.',
    summary: (value) => (typeof value === 'number' ? `Batuk ${value} hari` : 'Durasi batuk belum pasti')
  },
  dyspnea: {
    label: 'sesak napas',
    prompt:
      'Untuk napasnya gimana? Ada rasa berat, sesak, atau cepat cape kalau bernapas? Ceritain kondisinya ya.',
    summary: (value) => {
      if (value === true) {
        return 'Sesak napas dirasakan';
      }
      if (value === false) {
        return 'Tidak ada sesak napas';
      }
      return 'Status sesak napas belum jelas';
    }
  },
  comorbidity: {
    label: 'komorbid',
    prompt:
      'Kalau soal riwayat kesehatan lain, ada kondisi seperti asma, diabetes, hipertensi, atau yang lain yang biasanya kamu alami?',
    summary: (value) => {
      if (value === true) {
        return 'Memiliki komorbiditas';
      }
      if (value === false) {
        return 'Tidak ada komorbiditas signifikan';
      }
      return 'Riwayat komorbiditas belum jelas';
    }
  }
};

const OPTIONAL_TOPICS = [
  {
    key: 'exposureHistory',
    prompt:
      'Terima kasih ya! Ada info tambahan nggak, misal sempat kontak dekat dengan orang yang batuk/ISPA dalam 2 minggu terakhir?' 
  },
  {
    key: 'medicationUse',
    prompt: 'Oke noted. Kalau soal obat, lagi konsumsi obat apa pun sekarang? Ceritain aja walau obat bebas.'
  }
];

const YES_VARIANTS = new Set([
  'y',
  'ya',
  'iya',
  'iyaa',
  'iyah',
  'yes',
  'yup',
  'sip',
  'siap',
  'betul',
  'benar',
  'sudah',
  'udah',
  'ok',
  'oke',
  'okey',
  'okeh'
]);
const NO_VARIANTS = new Set([
  'n',
  'no',
  'nope',
  'tidak',
  'tdk',
  'tak',
  'ndak',
  'ga',
  'gak',
  'enggak',
  'engga',
  'belum',
  'bukan',
  'tidak ada'
]);
const NO_CHANGE_PHRASES = [
  'tidak ada yang perlu diperbaiki',
  'tidak ada perubahan',
  'tidak ada tambahan',
  'tidak ada lagi',
  'tidak ada yang ditambahkan',
  'sudah cukup',
  'cukup segitu',
  'cukup gitu',
  'itu saja',
  'itu aja',
  'udah segitu',
  'udah begitu',
  'udah gitu aja',
  'sudah sesuai',
  'sudah benar',
  'sudah pas',
  'semua sudah',
  'ga ada tambahan',
  'gak ada tambahan',
  'nggak ada tambahan',
  'enggak ada tambahan'
];

const normalizeReply = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim().toLowerCase();
};
const containsVariant = (text, variants) => {
  const normalized = normalizeReply(text);
  if (!normalized) {
    return false;
  }
  if (variants.has(normalized)) {
    return true;
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.some((token) => variants.has(token));
};

const isAffirmative = (text) => containsVariant(text, YES_VARIANTS);
const isNegative = (text) => containsVariant(text, NO_VARIANTS);
const isNoChangeResponse = (text) => {
  const normalized = normalizeReply(text);
  if (!normalized) {
    return false;
  }
  if (containsVariant(normalized, NO_VARIANTS)) {
    return true;
  }
  return NO_CHANGE_PHRASES.some((phrase) => normalized.includes(phrase));
};

const buildSummaryLines = (fields) => {
  const summary = [];
  if (!fields || typeof fields !== 'object') {
    return summary;
  }
  Object.entries(REQUIRED_FIELDS).forEach(([field, config]) => {
    const value = fields[field];
    summary.push(config.summary(value));
  });
  return summary;
};

const buildSummaryMessage = (fields) => {
  const lines = buildSummaryLines(fields);
  if (lines.length === 0) {
    return 'Aku sudah catat cerita kamu sejauh ini. Kalau sudah pas, bilang aja “sudah beres” atau lanjut cerita kalau ada yang kurang.';
  }
  return `Ringkasan sementara versi aku:\n- ${lines.join('\n- ')}\nKalau sudah cocok, boleh bilang “sudah pas” atau “oke kok”. Kalau ada bagian yang mau diluruskan, tinggal ceritain aja ya.`;
};

module.exports = {
  REQUIRED_FIELDS,
  OPTIONAL_TOPICS,
  normalizeReply,
  isAffirmative,
  isNegative,
  isNoChangeResponse,
  buildSummaryMessage
};
