const REQUIRED_FIELDS = {
  feverStatus: {
    label: 'demam tinggi',
    prompt:
      'Hai, aku Breathy — asisten perawatan ISPA kamu. 😄 Apa belakangan ini kamu merasakan demam tinggi (≥38°C)? Balas YA atau TIDAK ya!',
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
      'Noted, sekarang aku ingin tahu ya — sudah berapa hari batuknya dirasakan? Tulis angkanya saja ya (contoh: 3).',
    summary: (value) => (typeof value === 'number' ? `Batuk ${value} hari` : 'Durasi batuk belum pasti')
  },
  dyspnea: {
    label: 'sesak napas',
    prompt:
      'Apakah kamu merasa sesak atau berat saat bernapas akhir-akhir ini? Balas YA jika ada, atau TIDAK bila tidak merasakan.',
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
      'Adakah penyakit penyerta yang kamu miliki? Misalnya asma, diabetes, hipertensi, atau kondisi lain. Balas YA kalau ada ya.',
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
      'Terima kasih ya! Satu hal lagi, apakah kamu sempat kontak dekat dengan seseorang yang sakit ISPA dalam 14 hari terakhir?'
  },
  {
    key: 'medicationUse',
    prompt: 'Oke noted. Saat ini kamu sedang mengonsumsi obat apa pun? Ceritakan ya walau obat bebas.'
  }
];

const YES_VARIANTS = new Set(['y', 'ya', 'iya', 'yes', 'benar', 'betul', 'sudah', 'ok', 'oke']);
const NO_VARIANTS = new Set(['n', 'no', 'tidak', 'tak', 'belum', 'bukan']);

const normalizeReply = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim().toLowerCase();
};

const isAffirmative = (text) => YES_VARIANTS.has(normalizeReply(text));
const isNegative = (text) => NO_VARIANTS.has(normalizeReply(text));

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
    return 'Aku sudah catat semuanya. Tolong cek kembali dan balas YA bila sudah benar, atau TIDAK kalau ada yang perlu direvisi ya.';
  }
  return `Ringkasan gejala kamu: \n- ${lines.join('\n- ')}\nSudah sesuai belum? Balas YA jika sudah pas, atau TIDAK kalau ada yang ingin diperbaiki.`;
};

module.exports = {
  REQUIRED_FIELDS,
  OPTIONAL_TOPICS,
  normalizeReply,
  isAffirmative,
  isNegative,
  buildSummaryMessage
};
