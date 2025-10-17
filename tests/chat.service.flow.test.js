const test = require('node:test');
const assert = require('node:assert/strict');

const {
  __test__: { applyConversationOutcome }
} = require('../src/services/chat.service');

test('applyConversationOutcome sends assistant reply without escalating', async () => {
  const caseRecord = {
    id: 'case-1',
    status: 'IN_CHATBOT',
    triage_metadata: {}
  };
  const triageMetadata = {
    conversation: {}
  };
  let updatePayload = null;
  const captured = [];
  const prisma = {
    cases: {
      update: async ({ data }) => {
        updatePayload = data;
        return {
          ...caseRecord,
          ...data
        };
      }
    }
  };

  const result = await applyConversationOutcome({
    prisma,
    caseRecord,
    triageMetadata,
    conversation: {
      reply: 'Halo, terima kasih sudah berbagi ceritanya.',
      shouldEscalate: false,
      confirmationState: 'NONE'
    },
    user: { phone_number: '+628111000001' },
    sendMessage: async (payload) => {
      captured.push(payload);
      return 'ok';
    }
  });

  assert.equal(captured.length, 2);
  assert.equal(captured[0].metadata.reason, 'ASSISTANT_REPLY');
  assert.equal(captured[1].metadata.reason, 'REQUEST_IMAGE');
  assert.ok(updatePayload);
  assert.ok(updatePayload.triage_metadata.conversation.waitingForImage);
  assert.ok(result.triageMetadata.conversation.waitingForImage);
});

test('applyConversationOutcome escalates case and notifies patient', async () => {
  const caseRecord = {
    id: 'case-2',
    status: 'IN_CHATBOT',
    triage_metadata: {
      conversation: {},
      dataCompleteness: {
        missingSymptoms: [],
        readyForPreprocessing: true,
        imageProvided: true,
        imageRecommended: true,
        needsMoreSymptoms: false,
        updatedAt: new Date().toISOString()
      }
    }
  };
  let updatePayload = null;
  const prisma = {
    cases: {
      update: async ({ data }) => {
        updatePayload = data;
        return {
          ...caseRecord,
          status: data.status,
          triage_metadata: data.triage_metadata
        };
      }
    }
  };
  const captured = [];

  const result = await applyConversationOutcome({
    prisma,
    caseRecord,
    triageMetadata: caseRecord.triage_metadata,
    conversation: {
      reply: null,
      shouldEscalate: true,
      confirmationState: 'CONFIRMED'
    },
    user: { phone_number: '+628111000002' },
    sendMessage: async (payload) => {
      captured.push(payload);
      return 'ok';
    }
  });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].metadata.reason, 'ESCALATE_TO_DOCTOR');
  assert.ok(updatePayload);
  assert.equal(updatePayload.status, 'WAITING_DOCTOR');
  assert.ok(updatePayload.triage_metadata.conversation.readyForDoctor);
  assert.ok(updatePayload.triage_metadata.conversation.escalatedAt);
  assert.equal(result.updatedCase.status, 'WAITING_DOCTOR');
});
