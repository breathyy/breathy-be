const test = require('node:test');
const assert = require('node:assert/strict');

const {
  __test__: { handleQuestionnaireProgress }
} = require('../src/services/chat.service');

const buildPrismaStub = (caseRecordRef) => {
  return {
    cases: {
      update: async ({ data }) => {
        Object.assign(caseRecordRef, data);
        return { ...caseRecordRef };
      }
    }
  };
};

test('handleQuestionnaireProgress asks missing mandatory field with persona tone', async () => {
  const caseRecord = {
    id: 'case-1',
    status: 'IN_CHATBOT',
    triage_metadata: {}
  };
  const prisma = buildPrismaStub(caseRecord);
  const captured = [];
  const analysis = {
    fields: {},
    missingFields: ['feverStatus', 'dyspnea']
  };
  const metadata = {};

  const result = await handleQuestionnaireProgress({
    prisma,
    caseRecord,
    metadata,
    analysis,
    latestText: null,
    user: { phone_number: '+628111000001' },
    sendMessage: async (payload) => {
      captured.push(payload);
      return 'submitted';
    }
  });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].metadata.reason, 'ASK_MANDATORY');
  assert.equal(captured[0].metadata.field, 'feverStatus');
  assert.match(captured[0].message, /Hai, aku Breathy/i);
  assert.equal(result.updatedCase.status, 'IN_CHATBOT');
  assert.ok(result.triageMetadata.questionnaire.asked.feverStatus);
});

test('handleQuestionnaireProgress asks optional topic after mandatory completion', async () => {
  const caseRecord = {
    id: 'case-2',
    status: 'IN_CHATBOT',
    triage_metadata: {}
  };
  const prisma = buildPrismaStub(caseRecord);
  const captured = [];
  const analysis = {
    fields: {
      feverStatus: true,
      onsetDays: 4,
      dyspnea: false,
      comorbidity: false
    },
    missingFields: []
  };
  const metadata = {
    questionnaire: {
      asked: {
        feverStatus: '2025-10-16T00:00:00.000Z',
        onsetDays: '2025-10-16T00:01:00.000Z',
        dyspnea: '2025-10-16T00:02:00.000Z',
        comorbidity: '2025-10-16T00:03:00.000Z'
      },
      optionalAsked: {}
    }
  };

  const result = await handleQuestionnaireProgress({
    prisma,
    caseRecord,
    metadata,
    analysis,
    latestText: null,
    user: { phone_number: '+628111000002' },
    sendMessage: async (payload) => {
      captured.push(payload);
      return 'submitted';
    }
  });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].metadata.reason, 'ASK_OPTIONAL');
  assert.equal(captured[0].metadata.topic, 'exposureHistory');
  assert.match(captured[0].message, /kontak dekat/i);
  assert.equal(result.updatedCase.status, 'IN_CHATBOT');
  assert.ok(result.triageMetadata.questionnaire.optionalAsked.exposureHistory);
});

test('handleQuestionnaireProgress confirms summary and promotes case to WAITING_DOCTOR', async () => {
  const caseRecord = {
    id: 'case-3',
    status: 'IN_CHATBOT',
    triage_metadata: {}
  };
  const prisma = buildPrismaStub(caseRecord);
  const captured = [];
  const metadata = {
    questionnaire: {
      asked: {
        feverStatus: '2025-10-16T00:00:00.000Z',
        onsetDays: '2025-10-16T00:01:00.000Z',
        dyspnea: '2025-10-16T00:02:00.000Z',
        comorbidity: '2025-10-16T00:03:00.000Z'
      },
      optionalAsked: {
        exposureHistory: '2025-10-16T00:05:00.000Z',
        medicationUse: '2025-10-16T00:06:00.000Z'
      },
      awaitingConfirmation: true,
      summarySnapshot: {
        fields: {
          feverStatus: true,
          onsetDays: 4,
          dyspnea: false,
          comorbidity: false
        }
      }
    }
  };
  const analysis = {
    fields: {
      feverStatus: true,
      onsetDays: 4,
      dyspnea: false,
      comorbidity: false
    },
    missingFields: []
  };

  const result = await handleQuestionnaireProgress({
    prisma,
    caseRecord,
    metadata,
    analysis,
    latestText: 'YA',
    user: { phone_number: '+628111000003' },
    sendMessage: async (payload) => {
      captured.push(payload);
      return 'submitted';
    }
  });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].metadata.reason, 'CONFIRMED_ESCALATION');
  assert.equal(result.updatedCase.status, 'WAITING_DOCTOR');
  assert.ok(result.triageMetadata.questionnaire.patientConfirmation);
});
