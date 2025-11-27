const prisma = require('../config/prisma');

// HITUNG TOTAL BELANJA (CART CALCULATION)
exports.calculateCart = async (req, res) => {
  try {
    const { items } = req.body; 

    let subTotal = 0;
    
    // Hitung subtotal real-time
    for (const item of items) {
      const variant = await prisma.varianSatuan.findUnique({
        where: { id: item.variantId }
      });
      if (variant) {
        subTotal += variant.harga * item.qty;
      }
    }

    // === LOGIKA BARU (BENEDIK REQUEST) ===
    const minOrder = 400000;
    const minDelivery = 700000;

    let canCheckout = subTotal >= minOrder;
    
    // 1. Defaultnya CUMA boleh AMBIL SENDIRI
    let availableMethods = ["AMBIL_SENDIRI"];
    
    // 2. Jika belanja tembus 700rb, OPSI "DIANTAR" DITAMBAHKAN (Unlocked)
    // Jadi user punya 2 pilihan: ["AMBIL_SENDIRI", "DIANTAR"]
    if (subTotal >= minDelivery) {
      availableMethods.push("DIANTAR");
    }

    // Buat pesan info untuk Frontend
    let infoMessage = "";
    if (subTotal < minDelivery) {
      infoMessage = `Tambah Rp ${(minDelivery - subTotal).toLocaleString()} lagi agar bisa diantar.`;
    } else {
      infoMessage = "Selamat! Anda bisa memilih layanan antar atau ambil sendiri.";
    }

    res.json({
      success: true,
      subTotal,
      canCheckout,
      availableMethods, 
      messages: {
        error: subTotal < minOrder ? `Minimal belanja Rp ${minOrder.toLocaleString()}` : null,
        info: infoMessage
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// BUAT PESANAN (CHECKOUT FINAL)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { 
      items,            
      jenis_pengiriman, // "AMBIL_SENDIRI" atau "DIANTAR"
      id_wilayah,       
      alamat_tujuan,    
      nama_penerima,
      metode_pembayaran,
      bukti_bayar 
    } = req.body;

    // 1. Validasi Subtotal
    let subTotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const variant = await prisma.varianSatuan.findUnique({ where: { id: item.variantId } });
      if (!variant) throw new Error(`Produk ID ${item.variantId} tidak ditemukan`);
      
      const totalItem = variant.harga * item.qty;
      subTotal += totalItem;

      orderItemsData.push({
        id_varian_satuan: variant.id,
        jumlah: item.qty,
        harga_saat_beli: variant.harga,
        total_per_item: totalItem
      });
    }

    // 2. Validasi Rules (Server Side Protection)
    
    // Rule A: Minimal Belanja 400rb
    if (subTotal < 400000) {
      return res.status(400).json({ message: "Gagal: Minimal belanja Rp 400.000." });
    }

    // Validasi Metode Pembayaran
    if (!['COD', 'TRANSFER'].includes(metode_pembayaran)) {
      return res.status(400).json({ message: "Metode pembayaran tidak valid." });
    }
    
    // Rule B: Validasi Pengiriman
    // Kalau User pilih DIANTAR, tapi belanjaan < 700rb -> TOLAK
    if (jenis_pengiriman === 'DIANTAR' && subTotal < 700000) {
      return res.status(400).json({ message: "Gagal: Belum mencapai Rp 700.000 untuk layanan antar." });
    }

    // Kalau User pilih AMBIL_SENDIRI, berapapun subtotalnya (asal > 400rb) -> BOLEH LANJUT
    // Jadi tidak ada blokir untuk AMBIL_SENDIRI di nominal tinggi.

    // 3. Hitung Ongkir
    let biaya_ongkir = 0;
    
    if (jenis_pengiriman === 'DIANTAR') {
      if (!id_wilayah) return res.status(400).json({ message: "Wajib pilih wilayah pengiriman." });
      
      const wilayahData = await prisma.wilayahPengiriman.findUnique({ where: { id: id_wilayah } });
      if (!wilayahData) return res.status(400).json({ message: "Wilayah tidak valid." });
      
      biaya_ongkir = wilayahData.biaya_ongkir;
    }

    // 4. Simpan ke Database
    const nomor_nota = `INV-${Date.now()}-${userId}`;

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.pesanan.create({
        data: {
          nomor_nota,
          id_pengguna: userId,
          jenis_pengiriman,
          metode_pembayaran,
          bukti_bayar: bukti_bayar || null,
          id_wilayah: id_wilayah || null,
          alamat_tujuan: alamat_tujuan || null,
          nama_penerima: nama_penerima || null,
          sub_total: subTotal,
          biaya_ongkir,
          total_bayar: subTotal + biaya_ongkir,
          status: "MENUNGGU",
        }
      });

      await tx.itemPesanan.createMany({
        data: orderItemsData.map(item => ({
          ...item,
          id_pesanan: order.id
        }))
      });

      return order;
    });

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat!",
      orderId: newOrder.id,
      nota: newOrder.nomor_nota
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// ... (Kode Admin lainnya jangan dihapus, biarkan di bawah sini)
// Copy paste fungsi getAllOrdersAdmin & updateOrderStatus dari chat sebelumnya ke sini jika belum ada
exports.getAllOrdersAdmin = async (req, res) => {
    // ... (Isi fungsi admin)
};

exports.updateOrderStatus = async (req, res) => {
    // ... (Isi fungsi admin)
};