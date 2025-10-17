const dotenv = require('dotenv');
const { getPrisma, disconnectPrisma } = require('../config/prisma.config');
const { hashPassword } = require('../services/auth.service');

dotenv.config();

const hospitals = [
  {
    name: 'RSUP Dr. Hasan Sadikin Bandung',
    address: 'Jl. Pasteur No.38, Pasteur, Kec. Sukajadi, Kota Bandung, Jawa Barat',
    latitude: -6.893095,
    longitude: 107.594873,
    contactNumber: '+62222034375'
  },
  {
    name: 'RSUP Persahabatan Jakarta',
    address: 'Jl. Persahabatan Raya No.1, Rawamangun, Pulo Gadung, Kota Jakarta Timur, DKI Jakarta',
    latitude: -6.200248,
    longitude: 106.890663,
    contactNumber: '+62214897777'
  },
  {
    name: 'RSUD Bali Mandara',
    address: 'Jl. By Pass Ngurah Rai No.548, Sanur Kaja, Denpasar Selatan, Kota Denpasar, Bali',
    latitude: -8.683459,
    longitude: 115.23631,
    contactNumber: '+623614486777'
  },
  {
    name: 'Apotek Kimia Farma Dago',
    address: 'Jl. Ir. H. Juanda No.97, Lebakgede, Kec. Coblong, Kota Bandung, Jawa Barat',
    latitude: -6.889487,
    longitude: 107.613976,
    contactNumber: '+62222503510'
  }
];

const doctorAccounts = [
  {
    phoneNumber: '+628111000001',
    displayName: 'Dr. Arif Wibowo',
    fullName: 'Dr. Arif Wibowo',
    email: 'arif.wibowo@breathy.test',
    specialty: 'Pulmonologi',
    password: 'DoctorPass123!'
  },
  {
    phoneNumber: '+628111000002',
    displayName: 'Dr. Ratna Pratiwi',
    fullName: 'Dr. Ratna Pratiwi',
    email: 'ratna.pratiwi@breathy.test',
    specialty: 'Mikrobiologi Klinik',
    password: 'DoctorPass123!'
  }
];

const hospitalOperatorAccounts = [
  {
    phoneNumber: '+628111000101',
    displayName: 'Operator Hasan Sadikin',
    email: 'operator.hasansadikin@breathy.test',
    hospitalName: 'RSUP Dr. Hasan Sadikin Bandung',
    password: 'HospitalPass123!'
  },
  {
    phoneNumber: '+628111000102',
    displayName: 'Operator Persahabatan',
    email: 'operator.persahabatan@breathy.test',
    hospitalName: 'RSUP Persahabatan Jakarta',
    password: 'HospitalPass123!'
  }
];

const patientAccounts = [
  {
    phoneNumber: '+628111000201',
    displayName: 'Budi Pasien',
    password: 'PatientPass123!'
  },
  {
    phoneNumber: '+628111000202',
    displayName: 'Siti Pasien',
    password: 'PatientPass123!'
  }
];

const upsertHospital = async (prisma, hospital) => {
  const existing = await prisma.hospitals.findFirst({ where: { name: hospital.name } });
  if (existing) {
    await prisma.hospitals.update({
      where: { id: existing.id },
      data: {
        address: hospital.address,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        contact_number: hospital.contactNumber
      }
    });
    return existing;
  }
  return prisma.hospitals.create({
    data: {
      name: hospital.name,
      address: hospital.address,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      contact_number: hospital.contactNumber
    }
  });
};

const upsertUser = async (prisma, { phoneNumber, displayName }) => {
  return prisma.users.upsert({
    where: { phone_number: phoneNumber },
    update: {
      display_name: displayName,
      is_verified: true
    },
    create: {
      phone_number: phoneNumber,
      display_name: displayName,
      is_verified: true
    }
  });
};

const seedHospitals = async (prisma) => {
  for (const hospital of hospitals) {
    await upsertHospital(prisma, hospital);
  }
};

const seedDoctors = async (prisma) => {
  for (const doctor of doctorAccounts) {
    const user = await upsertUser(prisma, doctor);
    const passwordHash = await hashPassword(doctor.password);
    await prisma.doctor_users.upsert({
      where: { email: doctor.email },
      update: {
        user_id: user.id,
        full_name: doctor.fullName,
        specialty: doctor.specialty,
        password_hash: passwordHash,
        role: 'DOCTOR'
      },
      create: {
        user_id: user.id,
        full_name: doctor.fullName,
        email: doctor.email,
        specialty: doctor.specialty,
        password_hash: passwordHash,
        role: 'DOCTOR'
      }
    });
  }
};

const seedHospitalOperators = async (prisma) => {
  for (const operator of hospitalOperatorAccounts) {
    const hospital = await prisma.hospitals.findFirst({ where: { name: operator.hospitalName } });
    if (!hospital) {
      throw new Error(`Hospital '${operator.hospitalName}' belum disiapkan, jalankan seed rumah sakit lebih dulu.`);
    }
    const user = await upsertUser(prisma, operator);
    const passwordHash = await hashPassword(operator.password);
    await prisma.hospital_users.upsert({
      where: { email: operator.email },
      update: {
        user_id: user.id,
        hospital_id: hospital.id,
        password_hash: passwordHash,
        role: 'HOSPITAL'
      },
      create: {
        user_id: user.id,
        hospital_id: hospital.id,
        email: operator.email,
        password_hash: passwordHash,
        role: 'HOSPITAL'
      }
    });
  }
};

const seedPatients = async (prisma) => {
  for (const patient of patientAccounts) {
    const user = await upsertUser(prisma, patient);
    const passwordHash = await hashPassword(patient.password);
    await prisma.patient_credentials.upsert({
      where: { user_id: user.id },
      update: { password_hash: passwordHash },
      create: {
        user_id: user.id,
        password_hash: passwordHash
      }
    });
  }
};

const run = async () => {
  const prisma = getPrisma();
  try {
    await seedHospitals(prisma);
    await seedDoctors(prisma);
    await seedHospitalOperators(prisma);
    await seedPatients(prisma);
    console.log('Seed completed');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
};

run();
