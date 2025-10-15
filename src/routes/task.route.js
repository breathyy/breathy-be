const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const taskController = require('../controllers/task.controller');

const router = express.Router();

router.use(authMiddleware.authenticate);

router.get('/:caseId/tasks', authMiddleware.requireRole('DOCTOR', 'HOSPITAL'), taskController.listForCase);
router.post('/:caseId/tasks', authMiddleware.requireRole('DOCTOR'), taskController.generateForCase);
router.post('/:caseId/tasks/:taskId/complete', authMiddleware.requireRole('DOCTOR', 'HOSPITAL'), taskController.completeTask);

router.use((req, res, next) => {
	next();
});

module.exports = router;
