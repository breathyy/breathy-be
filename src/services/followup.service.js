const { getPrisma } = require('../config/prisma.config');

const DEFAULT_DAYS = 7;
const DEFAULT_DUE_HOUR = 8;

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const resolveClient = (client) => {
  if (client) {
    return client;
  }
  return getPrisma();
};

const normalizeSeverity = (value) => {
  if (!value || typeof value !== 'string') {
    return 'MILD';
  }
  const normalized = value.trim().toUpperCase();
  if (!['MILD', 'MODERATE', 'SEVERE'].includes(normalized)) {
    return 'MILD';
  }
  return normalized;
};

const buildInstruction = (severity, dayIndex) => {
  if (severity === 'MODERATE') {
    return `Hari ${dayIndex + 1}: Laporkan suhu tubuh, tingkat batuk, dan sesak napas Anda.`;
  }
  return `Hari ${dayIndex + 1}: Isi checklist gejala dan minum obat sesuai arahan dokter.`;
};

const buildDueAt = (startDate, dayOffset) => {
  const base = startDate ? new Date(startDate) : new Date();
  const due = new Date(base.getTime());
  due.setDate(due.getDate() + dayOffset);
  due.setHours(DEFAULT_DUE_HOUR, 0, 0, 0);
  return due;
};

const ensureCaseExists = async (client, caseId) => {
  const record = await client.cases.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      status: true,
      severity_class: true,
      start_date: true,
      end_date: true
    }
  });
  if (!record) {
    throw createError(404, 'Case not found');
  }
  return record;
};

const generateTasks = async ({ caseId, severityClass, prisma, days = DEFAULT_DAYS }) => {
  if (!caseId) {
    throw createError(400, 'caseId is required');
  }
  const client = resolveClient(prisma);
  const record = await ensureCaseExists(client, caseId);
  const severity = normalizeSeverity(severityClass || record.severity_class);
  if (!['MILD', 'MODERATE'].includes(severity)) {
    return [];
  }
  const taskType = severity === 'MODERATE' ? 'CHECKUP' : 'CHECKIN';
  const startDate = record.start_date ? new Date(record.start_date) : new Date();
  await client.daily_tasks.deleteMany({
    where: {
      case_id: caseId,
      task_type: { not: taskType }
    }
  });
  const dueDates = [];
  const results = [];
  for (let index = 0; index < days; index += 1) {
    dueDates[index] = buildDueAt(startDate, index);
    const instruction = buildInstruction(severity, index);
    const existing = await client.daily_tasks.findFirst({
      where: {
        case_id: caseId,
        day_index: index,
        task_type: taskType
      }
    });
    let recordTask;
    if (existing) {
      recordTask = await client.daily_tasks.update({
        where: { id: existing.id },
        data: {
          instruction,
          due_at: dueDates[index],
          done: false,
          completed_at: null
        }
      });
    } else {
      recordTask = await client.daily_tasks.create({
        data: {
          case_id: caseId,
          day_index: index,
          task_type: taskType,
          instruction,
          due_at: dueDates[index]
        }
      });
    }
    results.push(recordTask);
  }
  const endDateCandidate = new Date(dueDates[days - 1] || startDate);
  const endDate = new Date(endDateCandidate.getTime());
  endDate.setHours(23, 59, 59, 0);
  await client.cases.update({
    where: { id: caseId },
    data: {
      start_date: record.start_date || new Date(startDate),
      end_date: record.end_date || endDate
    }
  });
  return results;
};

const listTasks = async ({ caseId, prisma }) => {
  if (!caseId) {
    throw createError(400, 'caseId is required');
  }
  const client = resolveClient(prisma);
  await ensureCaseExists(client, caseId);
  return client.daily_tasks.findMany({
    where: { case_id: caseId },
    orderBy: [{ day_index: 'asc' }, { task_type: 'asc' }]
  });
};

const completeTask = async ({ caseId, taskId, notes, prisma }) => {
  if (!caseId || !taskId) {
    throw createError(400, 'caseId and taskId are required');
  }
  const client = resolveClient(prisma);
  await ensureCaseExists(client, caseId);
  const task = await client.daily_tasks.findFirst({
    where: {
      id: taskId,
      case_id: caseId
    }
  });
  if (!task) {
    throw createError(404, 'Task not found');
  }
  return client.daily_tasks.update({
    where: { id: taskId },
    data: {
      done: true,
      completed_at: new Date(),
      notes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : task.notes
    }
  });
};

module.exports = {
  generateTasks,
  listTasks,
  completeTask
};
