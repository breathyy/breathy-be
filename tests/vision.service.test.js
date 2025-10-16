const test = require('node:test');
const assert = require('node:assert/strict');

process.env.OPENAI_KEY = '';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

const { calculateSi, normalizeMarkers, determineSputumCategory } = require('../src/services/vision.service');

test('normalizeMarkers preserves highest confidence per marker', () => {
  const markers = normalizeMarkers({
    GREEN: { confidence: 0.7, source: 'manual' },
    green: { confidence: 0.5, source: 'second' },
    BLOOD_TINGED: 0.3
  });

  assert.equal(markers.GREEN.confidence, 0.7);
  assert.equal(markers.GREEN.source, 'manual');
  assert.equal(markers.BLOOD_TINGED.confidence, 0.3);
});

test('calculateSi returns weighted score with new marker structure', () => {
  const markers = {
    GREEN: { confidence: 0.9 },
    BLOOD_TINGED: { confidence: 0.1 }
  };
  const score = calculateSi(markers);

  const expected = Number(((0.9 * 0.4 + 0.1 * 0.3) / (0.4 + 0.3)).toFixed(2));
  assert.equal(score, expected);
});

test('determineSputumCategory picks marker with highest confidence', () => {
  const result = determineSputumCategory({
    GREEN: { confidence: 0.6 },
    BLOOD_TINGED: { confidence: 0.8 }
  });

  assert.equal(result.category, 'BLOOD_TINGED');
  assert.equal(result.confidence, 0.8);
});
