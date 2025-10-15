const crypto = require('crypto');
const { getPrisma } = require('../config/prisma.config');
const acsService = require('./acs.service');
const { normalizePhone, ensureActiveCase } = require('./chat.service');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const activeMetadata = { purpose: 'OTP' };

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generateOtpCode = () => {
  const value = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return value.toString().padStart(OTP_LENGTH, '0');
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const requestOtp = async ({ phone, dryRun = false }) => {
  const prisma = getPrisma();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw createError(400, 'Nomor telepon tidak valid');
  }
  let user = await prisma.users.findUnique({ where: { phone_number: normalizedPhone } });
  if (!user) {
    user = await prisma.users.create({
      data: {
        phone_number: normalizedPhone,
        display_name: null,
        is_verified: false
      }
    });
  }
  const latestOtp = await prisma.otp_codes.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' }
  });
  const now = Date.now();
  if (latestOtp) {
    const createdAt = new Date(latestOtp.created_at).getTime();
    if (now - createdAt < RESEND_COOLDOWN_SECONDS * 1000) {
      throw createError(429, 'Terlalu banyak permintaan OTP, coba lagi nanti');
    }
  }
  await prisma.otp_codes.deleteMany({ where: { user_id: user.id } });
  const otp = generateOtpCode();
  const expiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000);
  await prisma.otp_codes.create({
    data: {
      user_id: user.id,
      hash: hashOtp(otp),
      expires_at: expiresAt,
      attempts: 0
    }
  });
  const message = `Kode OTP Breathy: ${otp}. Berlaku ${OTP_TTL_MINUTES} menit.`;
  const acsReady = acsService.isConfigured();
  if (!acsReady && !dryRun) {
    throw createError(503, 'ACS belum dikonfigurasi untuk pengiriman OTP');
  }
  let delivery;
  if (acsReady) {
    delivery = await acsService.sendWhatsAppText({
      to: normalizedPhone,
      message,
      metadata: activeMetadata,
      dryRun
    });
  } else {
    delivery = {
      status: 'dry-run',
      reason: 'ACS tidak tersedia, OTP dikembalikan pada respons'
    };
  }
  const response = {
    expiresAt: expiresAt.toISOString(),
    delivery
  };
  if (dryRun || !acsReady) {
    response.otp = otp;
  }
  return response;
};

const verifyOtp = async ({ phone, otp }) => {
  const prisma = getPrisma();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw createError(400, 'Nomor telepon tidak valid');
  }
  if (!otp || typeof otp !== 'string' || otp.trim().length === 0) {
    throw createError(400, 'OTP diperlukan');
  }
  const sanitizedOtp = otp.trim();
  const user = await prisma.users.findUnique({ where: { phone_number: normalizedPhone } });
  if (!user) {
    throw createError(404, 'Pengguna tidak ditemukan');
  }
  const otpRecord = await prisma.otp_codes.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' }
  });
  if (!otpRecord) {
    throw createError(400, 'OTP tidak ditemukan atau sudah digunakan');
  }
  const now = new Date();
  if (new Date(otpRecord.expires_at) < now) {
    await prisma.otp_codes.deleteMany({ where: { user_id: user.id } });
    throw createError(400, 'OTP kedaluwarsa');
  }
  if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw createError(429, 'Percobaan OTP telah melebihi batas');
  }
  const hashedInput = hashOtp(sanitizedOtp);
  if (otpRecord.hash !== hashedInput) {
    await prisma.otp_codes.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 }
    });
    throw createError(400, 'OTP tidak valid');
  }
  const result = await prisma.$transaction(async (tx) => {
    await tx.otp_codes.deleteMany({ where: { user_id: user.id } });
    await tx.users.update({
      where: { id: user.id },
      data: { is_verified: true }
    });
    const activeCase = await ensureActiveCase(tx, user.id);
    return {
      userId: user.id,
      caseId: activeCase.id,
      caseStatus: activeCase.status
    };
  });
  return result;
};

module.exports = {
  requestOtp,
  verifyOtp
};
