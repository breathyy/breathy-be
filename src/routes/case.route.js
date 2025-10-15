const express = require('express');
const caseController = require('../controllers/case.controller');
const caseImageController = require('../controllers/case-image.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware.authenticate);

router.get('/:caseId', authMiddleware.requireRole('DOCTOR', 'HOSPITAL'), caseController.getCaseDetail);
router.post('/:caseId/approve', authMiddleware.requireRole('DOCTOR'), caseController.approveCase);
router.post('/:caseId/images/upload-url', authMiddleware.requireRole('DOCTOR', 'HOSPITAL'), caseImageController.requestUploadUrl);
router.post('/:caseId/images', authMiddleware.requireRole('DOCTOR', 'HOSPITAL'), caseImageController.registerImage);
router.get('/:caseId/images', authMiddleware.requireRole('DOCTOR', 'HOSPITAL'), caseImageController.listImages);

router.use((req, res) => {
	res.status(501).json({ error: 'cases route not implemented' });
});

module.exports = router;
