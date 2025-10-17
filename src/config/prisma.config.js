const { PrismaClient } = require('@prisma/client');

let prisma;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

const disconnectPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
};

module.exports = {
  getPrisma,
  disconnectPrisma
};
