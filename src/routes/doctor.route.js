const express = require('express');
const doctorCaseController = require('../controllers/doctor-case.controller');

const router = express.Router();

router.get('/cases', doctorCaseController.listCases);
router.post('/cases/:caseId/claim', doctorCaseController.claimCase);

router.use((req, res) => {
  res.status(501).json({ error: 'doctor route not implemented' });
});

module.exports = router;
