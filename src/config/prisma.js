const { PrismaClient } = require('@prisma/client');

// Best practice untuk inisialisasi Prisma Client
// agar tidak membuka terlalu banyak koneksi
const prisma = new PrismaClient();

module.exports = prisma;