const prisma = require('../config/prisma');

// 1. GET DATA WILAYAH (Untuk Dropdown Pilihan Kecamatan)
exports.getWilayah = async (req, res) => {
  try {
    const wilayah = await prisma.wilayahPengiriman.findMany();
    res.json({ success: true, data: wilayah });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. GET ALAMAT SAYA
exports.getMyAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await prisma.alamat.findMany({
      where: { id_pengguna: userId },
      include: {
        wilayah: true // Kita ambil detail wilayahnya (nama kecamatan & ongkir)
      },
      orderBy: { utama: 'desc' } // Alamat UTAMA muncul paling atas
    });
    res.json({ success: true, data: addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. TAMBAH ALAMAT BARU
exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      label_alamat,     // "Rumah", "Kantor"
      nama_penerima, 
      no_hp_penerima, 
      alamat_lengkap, 
      id_wilayah        // ID dari Dropdown (Angka)
    } = req.body;

    // Cek dulu user ini udah punya alamat belum?
    const count = await prisma.alamat.count({ where: { id_pengguna: userId } });
    
    // Kalau ini alamat pertama, otomatis jadi UTAMA (true). Kalau bukan, jadi false.
    const isUtama = count === 0; 

    const newAddress = await prisma.alamat.create({
      data: {
        id_pengguna: userId,
        label_alamat,
        nama_penerima,
        no_hp_penerima,
        alamat_lengkap,
        id_wilayah: parseInt(id_wilayah), // Pastikan angka
        utama: isUtama
      }
    });

    res.json({ success: true, message: "Alamat berhasil disimpan", data: newAddress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 4. SET ALAMAT UTAMA (Opsional tapi penting)
exports.setPrimaryAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.body;

        // Reset semua alamat user jadi false dulu
        await prisma.alamat.updateMany({
            where: { id_pengguna: userId },
            data: { utama: false }
        });

        // Set alamat yang dipilih jadi true
        await prisma.alamat.update({
            where: { id: parseInt(addressId) },
            data: { utama: true }
        });

        res.json({ success: true, message: "Alamat utama diperbarui" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};