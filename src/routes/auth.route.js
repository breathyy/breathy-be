const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { otpLimiter, authLimiter } = require('../middlewares/rate-limiter.middleware');

const router = express.Router();

router.post('/patient/otp/request', otpLimiter, authController.requestPatientOtp);
router.post('/patient/otp/verify', otpLimiter, authController.verifyPatientOtp);
router.post('/patient/register', authLimiter, authController.registerPatient);
router.post('/patient/login', authLimiter, authController.loginPatient);
router.post('/login', authLimiter, authController.loginProvider);
router.get('/me', authMiddleware.authenticate, authController.getCurrentProfile);

router.use((req, res) => {
	res.status(501).json({ error: 'auth route not implemented' });
});

module.exports = router;
