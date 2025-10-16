const test = require('node:test');
const assert = require('node:assert/strict');

const {
  __test__: { parseEnumList, parseDate, sanitizeSearchTerm, buildWhereFilters, buildWhereClause, parseAssignedFilter }
} = require('../src/controllers/doctor-case.controller');

const ALLOWED_STATUS = ['IN_CHATBOT', 'WAITING_DOCTOR', 'MILD', 'MODERATE', 'SEVERE'];

test('parseEnumList normalizes comma separated string', () => {
  const result = parseEnumList('waiting_doctor, mild,unknown', ALLOWED_STATUS);
  assert.deepEqual(result, ['WAITING_DOCTOR', 'MILD']);
});

test('parseDate returns valid Date or null', () => {
  const valid = parseDate('2025-10-16T10:00:00Z');
  assert.equal(valid instanceof Date, true);
  assert.equal(valid.toISOString(), '2025-10-16T10:00:00.000Z');
  assert.equal(parseDate('not-a-date'), null);
});

test('sanitizeSearchTerm trims whitespace', () => {
  assert.equal(sanitizeSearchTerm('  Breathy  '), 'Breathy');
  assert.equal(sanitizeSearchTerm(''), null);
});

test('parseAssignedFilter defaults to ALL', () => {
  assert.equal(parseAssignedFilter(undefined), 'ALL');
  assert.equal(parseAssignedFilter('mine'), 'MINE');
  assert.equal(parseAssignedFilter('invalid'), 'ALL');
});

test('buildWhereFilters composes status and search filters', () => {
  const filters = buildWhereFilters({
    statusList: ['WAITING_DOCTOR'],
    severityList: [],
    dateFrom: null,
    dateTo: null,
    searchTerm: 'Sukma',
    assignedFilter: 'ALL',
    doctorId: 'doctor-1'
  });
  assert.equal(filters.length, 2);
  assert.deepEqual(filters[0], { status: { in: ['WAITING_DOCTOR'] } });
  const searchFilter = filters[1];
  assert.ok(Array.isArray(searchFilter.OR));
  assert.equal(searchFilter.OR.length >= 2, true);
});

test('buildWhereFilters adds doctor filter when assigned=mine', () => {
  const filters = buildWhereFilters({
    statusList: [],
    severityList: [],
    dateFrom: null,
    dateTo: null,
    searchTerm: null,
    assignedFilter: 'MINE',
    doctorId: 'doc-5'
  });
  assert.deepEqual(filters[0], { doctor_id: 'doc-5' });
});

test('buildWhereClause merges filters into AND array', () => {
  const filters = [{ status: { in: ['WAITING_DOCTOR'] } }, { created_at: { gte: new Date() } }];
  const clause = buildWhereClause(filters);
  assert.ok(clause.AND);
  assert.equal(clause.AND.length, 2);
  assert.deepEqual(clause.AND[0], filters[0]);
});
