const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/patient/otp/request', authController.requestPatientOtp);
router.post('/patient/otp/verify', authController.verifyPatientOtp);
router.post('/login', authController.loginProvider);
router.get('/me', authMiddleware.authenticate, authController.getCurrentProfile);

router.use((req, res) => {
	res.status(501).json({ error: 'auth route not implemented' });
});

module.exports = router;
