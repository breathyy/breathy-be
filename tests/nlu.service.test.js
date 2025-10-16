const test = require('node:test');
const assert = require('node:assert/strict');

// Ensure OpenAI integration falls back to heuristics for test determinism.
process.env.OPENAI_KEY = '';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

const config = require('../src/config/env.config');
config.openAiKey = '';

const { extractSymptoms, calculateSymptomScore } = require('../src/services/nlu.service');

const SAMPLE_TEXT = 'Saya demam 39 derajat, batuk sudah 4 hari, sesak napas, dan punya asma kronis.';

test('extractSymptoms returns complete fields with heuristics fallback', async () => {
  const analysis = await extractSymptoms(SAMPLE_TEXT);

  assert.equal(analysis.provider, 'HEURISTIC');
  assert.equal(analysis.readyForPreprocessing, false);
  assert.deepStrictEqual(analysis.missingFields, ['onsetDays']);

  const expectedFields = {
    feverStatus: true,
    onsetDays: null,
    dyspnea: true,
    comorbidity: true
  };
  assert.deepStrictEqual(analysis.fields, expectedFields);

  const expectedConfidences = ['feverStatus', 'dyspnea', 'comorbidity'];
  expectedConfidences.forEach((field) => {
    assert.ok(typeof analysis.confidences[field] === 'number', `confidence for ${field} should exist`);
  });
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
