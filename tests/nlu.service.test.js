const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config/env.config');
const nluService = require('../src/services/nlu.service');

const { extractSymptoms, calculateSymptomScore, __test__ } = nluService;

test('extractSymptoms throws when OpenAI key is missing', async () => {
  __test__.resetOpenAiClient();
  config.openAiKey = '';

  await assert.rejects(
    extractSymptoms('Pasien bilang tidak demam'),
    /OpenAI key not configured/i
  );
});

test('extractSymptoms parses OpenAI response payload', async () => {
  const fakeClient = {
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: `\`\`\`json
${JSON.stringify({
  reply: 'Halo, aku sudah catat keluhannya ya.',
  symptoms: {
    feverStatus: { value: true, confidence: 0.9 },
    onsetDays: { value: 3, confidence: 0.8 },
    dyspnea: { value: false, confidence: 0.7 },
    comorbidity: { value: true, confidence: 0.6 }
  },
  taskStatus: {
    feverStatus: { status: 'COLLECTED' },
    onsetDays: { status: 'ASKING', prompt: 'Sejak kapan batuknya terasa?' }
  },
  confirmation: { state: 'REQUEST', summary: 'Mohon cek kembali ringkasannya.' },
  recommendImage: false,
  notes: ['catatan model']
})}
\`\`\``
              }
            }
          ]
        })
      }
    }
  };

  __test__.setOpenAiClient(fakeClient);
  config.openAiKey = 'test-key';
  config.openAiModel = 'fake-model';

  const analysis = await extractSymptoms('Pasien demam tinggi dan batuk 3 hari.');

  assert.equal(analysis.provider, 'OPENAI_GPT4O');
  assert.equal(analysis.model, 'fake-model');
  assert.equal(analysis.replyMessage, 'Halo, aku sudah catat keluhannya ya.');
  assert.equal(analysis.fields.onsetDays, 3);
  assert.equal(analysis.fields.feverStatus, true);
  assert.equal(analysis.conversation.confirmationState, 'REQUEST');
  assert.equal(analysis.fallbackUsed, false);
  assert.deepStrictEqual(analysis.notes, ['catatan model']);

  __test__.resetOpenAiClient();
  config.openAiKey = '';
  config.openAiModel = 'gpt-4o-mini';
});

test('calculateSymptomScore applies configured weights', () => {
  const score = calculateSymptomScore({
    feverStatus: true,
    onsetDays: null,
    dyspnea: true,
    comorbidity: true
  });

  assert.equal(score, 0.8);
});
