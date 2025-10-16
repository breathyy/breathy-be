const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const doctorCaseController = require('../controllers/doctor-case.controller');

const router = express.Router();

router.use(authMiddleware.authenticate);
router.use(authMiddleware.requireRole('DOCTOR', 'ADMIN'));

router.get('/cases', doctorCaseController.listCases);
router.post('/cases/:caseId/claim', doctorCaseController.claimCase);

router.use((req, res) => {
  res.status(501).json({ error: 'doctor route not implemented' });
});

module.exports = router;
