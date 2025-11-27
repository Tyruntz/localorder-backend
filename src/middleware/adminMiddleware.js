const adminMiddleware = (req, res, next) => {
  // req.user didapat dari authMiddleware sebelumnya
  if (req.user && req.user.role === 'ADMIN') {
    next(); // Silakan lewat Tuan Toko
  } else {
    res.status(403).json({ message: "Akses Ditolak: Khusus Admin!" });
  }
};

module.exports = adminMiddleware;