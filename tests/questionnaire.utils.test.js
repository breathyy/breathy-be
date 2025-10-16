const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSummaryMessage,
  isAffirmative,
  isNegative
} = require('../src/utils/questionnaire');

test('buildSummaryMessage includes all mandatory fields in summary (Indonesian persona)', () => {
  const summary = buildSummaryMessage({
    feverStatus: true,
    onsetDays: 5,
    dyspnea: false,
    comorbidity: null
  });

  assert.ok(summary.includes('Demam'), 'summary should mention fever status');
  assert.ok(summary.includes('Batuk 5 hari'));
  assert.ok(summary.toLowerCase().includes('sesak'), 'summary should mention dyspnea');
  assert.ok(summary.toLowerCase().includes('komorbid'), 'summary should mention comorbidity');
});

test('isAffirmative detects yes variants', () => {
  assert.equal(isAffirmative('YA'), true);
  assert.equal(isAffirmative('  yes '), true);
  assert.equal(isAffirmative('tidak'), false);
});

test('isNegative detects no variants', () => {
  assert.equal(isNegative('tidak'), true);
  assert.equal(isNegative('No'), true);
  assert.equal(isNegative('ya'), false);
});
