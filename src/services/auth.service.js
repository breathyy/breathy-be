const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env.config');
const { getPrisma } = require('../config/prisma.config');
const { normalizePhone, ensureActiveCase } = require('./chat.service');

const SALT_ROUNDS = 12;

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeEmail = (value) => {
  if (!value) {
    return null;
  }
  return String(value).trim().toLowerCase();
};

const getJwtSecret = () => {
  if (config.jwtSecret && config.jwtSecret.trim().length > 0) {
    return config.jwtSecret;
  }
  throw createError(500, 'JWT secret not configured');
};

const signToken = (payload, options = {}) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: config.jwtExpiresIn || '1h',
    ...options
  });
};

const signPatientSession = ({ userId, phoneNumber, caseId, displayName }) => {
  if (!userId || !caseId) {
    throw createError(500, 'Patient session requires user and case');
  }
  const token = signToken({
    sub: userId,
    role: 'PATIENT',
    userId,
    caseId,
    phoneNumber: phoneNumber || null,
    displayName: displayName || null
  });
  return {
    token,
    expiresIn: config.jwtExpiresIn || '1h'
  };
};

const mapDoctorProfile = (record) => ({
  id: record.id,
  userId: record.user_id,
  role: record.role,
  email: record.email,
  fullName: record.full_name,
  specialty: record.specialty,
  phoneNumber: record.users ? record.users.phone_number : null,
  displayName: record.users ? record.users.display_name : null
});

const mapHospitalProfile = (record) => ({
  id: record.id,
  userId: record.user_id,
  role: record.role,
  email: record.email,
  hospital: record.hospitals
    ? {
        id: record.hospitals.id,
        name: record.hospitals.name,
        contactNumber: record.hospitals.contact_number
      }
    : null,
  phoneNumber: record.users ? record.users.phone_number : null
});

const ensureRoleSupported = (role) => {
  const normalized = role ? String(role).trim().toUpperCase() : '';
  if (!normalized) {
    throw createError(400, 'Role is required');
  }
  if (!['DOCTOR', 'HOSPITAL', 'ADMIN'].includes(normalized)) {
    throw createError(400, 'Unsupported role');
  }
  return normalized;
};

const fetchProviderByEmail = async (prisma, role, email) => {
  if (role === 'DOCTOR') {
    return prisma.doctor_users.findUnique({
      where: { email },
      include: { users: true }
    });
  }
  return prisma.hospital_users.findUnique({
    where: { email },
    include: { hospitals: true, users: true }
  });
};

const fetchProviderById = async (prisma, role, id) => {
  if (role === 'DOCTOR') {
    return prisma.doctor_users.findUnique({
      where: { id },
      include: { users: true }
    });
  }
  return prisma.hospital_users.findUnique({
    where: { id },
    include: { hospitals: true, users: true }
  });
};

const assertPasswordHash = (record) => {
  if (!record.password_hash) {
    throw createError(500, 'Credential store incomplete');
  }
};

const fetchPatientWithCredentials = async (prisma, phoneNumber) => {
  return prisma.users.findUnique({
    where: { phone_number: phoneNumber },
    include: { patient_credentials: true }
  });
};

const registerPatient = async ({ phone, password, displayName }) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw createError(400, 'Nomor WhatsApp tidak valid');
  }
  if (!password || String(password).trim().length === 0) {
    throw createError(400, 'Password wajib diisi');
  }
  const sanitizedPassword = String(password).trim();
  const sanitizedName = displayName && String(displayName).trim().length > 0 ? String(displayName).trim() : null;
  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchPatientWithCredentials(tx, normalizedPhone);
    if (existing && existing.patient_credentials) {
      throw createError(409, 'Nomor WhatsApp sudah terdaftar');
    }
    const passwordHash = await hashPassword(sanitizedPassword);
    let userRecord;
    if (existing) {
      userRecord = await tx.users.update({
        where: { id: existing.id },
        data: {
          display_name: sanitizedName || existing.display_name,
          is_verified: true
        }
      });
    } else {
      userRecord = await tx.users.create({
        data: {
          phone_number: normalizedPhone,
          display_name: sanitizedName,
          is_verified: true
        }
      });
    }

    await tx.patient_credentials.upsert({
      where: { user_id: userRecord.id },
      update: { password_hash: passwordHash },
      create: {
        user_id: userRecord.id,
        password_hash: passwordHash
      }
    });

    const activeCase = await ensureActiveCase(tx, userRecord.id);
    const session = signPatientSession({
      userId: userRecord.id,
      phoneNumber: normalizedPhone,
      caseId: activeCase.id,
      displayName: userRecord.display_name
    });

    return {
      userId: userRecord.id,
      caseId: activeCase.id,
      caseStatus: activeCase.status,
      token: session.token,
      expiresIn: session.expiresIn
    };
  });

  return result;
};

const loginPatient = async ({ phone, password }) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw createError(400, 'Nomor WhatsApp tidak valid');
  }
  if (!password || String(password).trim().length === 0) {
    throw createError(400, 'Password wajib diisi');
  }
  const prisma = getPrisma();
  const existing = await fetchPatientWithCredentials(prisma, normalizedPhone);
  if (!existing || !existing.patient_credentials) {
    throw createError(401, 'Kredensial tidak valid');
  }
  const passwordMatch = await bcrypt.compare(String(password), existing.patient_credentials.password_hash);
  if (!passwordMatch) {
    throw createError(401, 'Kredensial tidak valid');
  }

  const activeCase = await ensureActiveCase(prisma, existing.id);
  const session = signPatientSession({
    userId: existing.id,
    phoneNumber: normalizedPhone,
    caseId: activeCase.id,
    displayName: existing.display_name
  });

  return {
    userId: existing.id,
    caseId: activeCase.id,
    caseStatus: activeCase.status,
    token: session.token,
    expiresIn: session.expiresIn
  };
};

const loginProvider = async ({ email, password, role }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw createError(400, 'Email is required');
  }
  if (!password || String(password).length === 0) {
    throw createError(400, 'Password is required');
  }
  const normalizedRole = ensureRoleSupported(role);
  const prisma = getPrisma();
  const provider = await fetchProviderByEmail(prisma, normalizedRole === 'DOCTOR' ? 'DOCTOR' : 'HOSPITAL', normalizedEmail);
  if (!provider) {
    throw createError(401, 'Invalid credentials');
  }
  if (provider.role !== normalizedRole) {
    throw createError(403, 'Role mismatch');
  }
  assertPasswordHash(provider);
  const passwordMatch = await bcrypt.compare(password, provider.password_hash);
  if (!passwordMatch) {
    throw createError(401, 'Invalid credentials');
  }
  const token = signToken({
    sub: provider.id,
    role: provider.role,
    userId: provider.user_id
  });
  const profile = normalizedRole === 'DOCTOR' ? mapDoctorProfile(provider) : mapHospitalProfile(provider);
  return {
    token,
    expiresIn: config.jwtExpiresIn || '1h',
    profile
  };
};

const getCurrentProfile = async ({ id, role }) => {
  if (!id || !role) {
    throw createError(401, 'Unauthorized');
  }
  const normalizedRole = ensureRoleSupported(role);
  const prisma = getPrisma();
  const provider = await fetchProviderById(prisma, normalizedRole === 'DOCTOR' ? 'DOCTOR' : 'HOSPITAL', id);
  if (!provider) {
    throw createError(404, 'Profile not found');
  }
  if (provider.role !== normalizedRole) {
    throw createError(403, 'Role mismatch');
  }
  return normalizedRole === 'DOCTOR' ? mapDoctorProfile(provider) : mapHospitalProfile(provider);
};

const hashPassword = async (password) => {
  if (!password || String(password).length === 0) {
    throw createError(400, 'Password is required');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

module.exports = {
  registerPatient,
  loginPatient,
  loginProvider,
  getCurrentProfile,
  hashPassword,
  signPatientSession
};
