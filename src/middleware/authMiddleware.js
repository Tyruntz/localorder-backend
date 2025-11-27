const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Format header: "Bearer TOKEN_DISINI"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak, token tidak ada.' });
  }

  // Ganti 'RAHASIA_NEGARA' dengan process.env.JWT_SECRET nanti
  const secret = process.env.JWT_SECRET || 'RAHASIA_NEGARA';

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token tidak valid.' });
    }
    // Simpan data user (id, no_wa) ke request object agar bisa dipakai di controller
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;