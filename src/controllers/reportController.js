const prisma = require('../config/prisma');

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    // Set jam ke 00:00:00 hari ini
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    
    // Set tanggal ke tgl 1 bulan ini
    const startOfMonth = new Date(new Date().setDate(1));
    startOfMonth.setHours(0,0,0,0);

    // 1. HITUNG OMSET HARI INI (Hanya yang status SELESAI)
    const omsetHariIni = await prisma.pesanan.aggregate({
      _sum: { total_bayar: true },
      where: {
        status: 'SELESAI', // Penting! Jangan hitung yang belum bayar/batal
        dibuat_pada: { gte: startOfDay }
      }
    });

    // 2. HITUNG OMSET BULAN INI
    const omsetBulanIni = await prisma.pesanan.aggregate({
      _sum: { total_bayar: true },
      where: {
        status: 'SELESAI',
        dibuat_pada: { gte: startOfMonth }
      }
    });

    // 3. HITUNG JUMLAH PESANAN PER STATUS
    // Biar tahu ada berapa yg "MENUNGGU" (Butuh tindakan segera)
    const statusCounts = await prisma.pesanan.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Format data biar enak dibaca Frontend
    const stats = {
      omset_hari_ini: omsetHariIni._sum.total_bayar || 0,
      omset_bulan_ini: omsetBulanIni._sum.total_bayar || 0,
      pesanan_menunggu: 0,
      pesanan_diproses: 0,
      pesanan_selesai: 0,
      pesanan_batal: 0
    };

    // Mapping hasil group by ke object stats
    statusCounts.forEach(item => {
      if (item.status === 'MENUNGGU') stats.pesanan_menunggu = item._count.id;
      if (item.status === 'DIPROSES') stats.pesanan_diproses = item._count.id;
      if (item.status === 'SELESAI') stats.pesanan_selesai = item._count.id;
      if (item.status === 'BATAL') stats.pesanan_batal = item._count.id;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};