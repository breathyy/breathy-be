const test = require('node:test');
const assert = require('node:assert/strict');

const { ensureActiveCase } = require('../src/services/chat.service');

const buildPrismaMock = (handlers) => {
  return {
    cases: {
      findFirst: handlers.findFirst || (async () => null),
      findMany: handlers.findMany || (async () => []),
      create: handlers.create || (async () => ({}))
    }
  };
};

test('ensureActiveCase returns requested case when caseId provided', async () => {
  const expected = { id: 'case-123', user_id: 'user-1', status: 'IN_CHATBOT' };
  const prisma = buildPrismaMock({
    findFirst: async ({ where }) => {
      if (where.id === expected.id && where.user_id === expected.user_id) {
        return expected;
      }
      return null;
    }
  });

  const result = await ensureActiveCase(prisma, 'user-1', { caseId: expected.id });
  assert.equal(result, expected);
});

test('ensureActiveCase throws when requested case is not found for user', async () => {
  const prisma = buildPrismaMock({
    findFirst: async () => null
  });

  await assert.rejects(
    ensureActiveCase(prisma, 'user-2', { caseId: 'missing-case' }),
    (error) => {
      assert.equal(error.status, 404);
      assert.match(error.message, /Case not found/i);
      return true;
    }
  );
});
