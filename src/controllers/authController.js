const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const secret = process.env.JWT_SECRET || 'RAHASIA_NEGARA';

// LOGIN
exports.login = async (req, res) => {
  try {
    const { no_wa, password } = req.body;

    // 1. Cari user by WA
    const user = await prisma.pengguna.findUnique({ where: { no_wa } });
    if (!user) {
      return res.status(404).json({ message: 'Nomor WA tidak terdaftar.' });
    }

    // 2. Cek Password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Password salah.' });
    }

    // 3. Buat Token
    const token = jwt.sign({ id: user.id, no_wa: user.no_wa, role: user.role }, secret, {
      expiresIn: '7d', // Login tahan 7 hari
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.nama_lengkap,
        no_wa: user.no_wa,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { nama_lengkap, no_wa, password } = req.body;

    // Cek duplikat
    const existing = await prisma.pengguna.findUnique({ where: { no_wa } });
    if (existing) {
      return res.status(400).json({ message: 'Nomor WA sudah terdaftar.' });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan ke DB
    const newUser = await prisma.pengguna.create({
      data: {
        nama_lengkap,
        no_wa,
        password: hashedPassword
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil, silakan login.',
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};