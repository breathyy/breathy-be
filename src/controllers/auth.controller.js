const otpService = require('../services/otp.service');
const authService = require('../services/auth.service');

const requestPatientOtp = async (req, res, next) => {
  try {
    const { phone, dryRun } = req.body || {};
    if (!phone) {
      throw Object.assign(new Error('Phone is required'), { status: 400 });
    }
    const result = await otpService.requestOtp({ phone, dryRun: Boolean(dryRun) });
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const verifyPatientOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) {
      throw Object.assign(new Error('Phone and OTP are required'), { status: 400 });
    }
    const result = await otpService.verifyOtp({ phone, otp });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const loginProvider = async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    const result = await authService.loginProvider({ email, password, role });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getCurrentProfile = async (req, res, next) => {
  try {
    const context = req.user || {};
    const profile = await authService.getCurrentProfile({ id: context.id, role: context.role });
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestPatientOtp,
  verifyPatientOtp,
  loginProvider,
  getCurrentProfile
};
