const followupService = require('../services/followup.service');

const normalizeCaseId = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  return value.trim();
};

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const mapTask = (task) => ({
  id: task.id,
  caseId: task.case_id,
  dayIndex: task.day_index,
  taskType: task.task_type,
  instruction: task.instruction,
  done: task.done,
  dueAt: task.due_at,
  completedAt: task.completed_at,
  notes: task.notes,
  createdAt: task.created_at
});

const listForCase = async (req, res, next) => {
  try {
    const caseId = normalizeCaseId(req.params.caseId);
    if (!caseId) {
      throw createError(400, 'caseId is required');
    }
    const items = await followupService.listTasks({ caseId });
    res.status(200).json({ success: true, data: items.map((task) => mapTask(task)) });
  } catch (error) {
    next(error);
  }
};

const generateForCase = async (req, res, next) => {
  try {
    const caseId = normalizeCaseId(req.params.caseId);
    if (!caseId) {
      throw createError(400, 'caseId is required');
    }
    const { severityClass } = req.body || {};
    const tasks = await followupService.generateTasks({ caseId, severityClass });
    res.status(200).json({ success: true, data: tasks.map((task) => mapTask(task)) });
  } catch (error) {
    next(error);
  }
};

const completeTask = async (req, res, next) => {
  try {
    const caseId = normalizeCaseId(req.params.caseId);
    const taskId = normalizeCaseId(req.params.taskId);
    if (!caseId || !taskId) {
      throw createError(400, 'caseId and taskId are required');
    }
    const { notes } = req.body || {};
    const result = await followupService.completeTask({ caseId, taskId, notes });
    res.status(200).json({ success: true, data: mapTask(result) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listForCase,
  generateForCase,
  completeTask
};
