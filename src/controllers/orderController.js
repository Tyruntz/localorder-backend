const prisma = require('../config/prisma');

// HITUNG TOTAL BELANJA (CART CALCULATION)
exports.calculateCart = async (req, res) => {
  try {
    const { items } = req.body; 
    const userId = req.user.id; 

    // 1. Cek Status VIP User (DENGAN PENGAMAN)
    const user = await prisma.pengguna.findUnique({ where: { id: userId } });
    
    // --- TAMBAHAN PENGAMAN ---
    if (!user) {
        // Kalau user gak ketemu di DB (misal habis reset DB), jangan crash!
        // Anggap saja user biasa (bukan VIP)
        console.log("⚠️ Warning: User ID dari token tidak ditemukan di DB.");
    }
    
    // Kalau user null, isVip otomatis false.
    const isVip = user ? user.is_vip : false; 
    // -------------------------

    let subTotal = 0;
    
    // 2. HITUNG HARGA (Logika Grosir)
    for (const item of items) {
      const variant = await prisma.varianSatuan.findUnique({
        where: { id: item.variantId },
        include: { daftar_grosir: true }
      });

      if (variant) {
        let hargaFinal = variant.harga; 

        if (variant.daftar_grosir && variant.daftar_grosir.length > 0) {
           const rules = variant.daftar_grosir.sort((a, b) => b.min_qty - a.min_qty);
           for (const rule of rules) {
             if (item.qty >= rule.min_qty) {
               hargaFinal = rule.harga_potongan;
               break; 
             }
           }
        }
        subTotal += hargaFinal * item.qty;
      }
    }

    // 3. LOGIKA MINIMAL BELANJA (Masih Hardcode dulu gapapa)
    const minBelanja = 250000;
    const minDelivery = 500000; 

    let canCheckout = subTotal >= minBelanja;
    
    // 4. ATURAN PENGIRIMAN
    let availablePayments = ["TRANSFER"]; 
    let availableShipping = ["AMBIL_SENDIRI"];
    
    if (subTotal >= minDelivery) {
      availableShipping.push("DIANTAR");
    }

    const ONGIR_DEFAULT = 15000; // Harusnya ambil dari DB PengaturanToko, tapi hardcode dulu oke.
    const isFreeShipping = isVip;

    const finalShippingCost = isFreeShipping ? 0 : ONGIR_DEFAULT;

    res.json({
      success: true,
      subTotal,
      canCheckout,
      availableShipping,
      availablePayments,
      isFreeShipping,
      shippingCost: finalShippingCost,
      messages: {
        error: subTotal < minBelanja ? `Minimal belanja Rp ${minBelanja.toLocaleString()}` : null,
        info: isVip ? "Anda Pelanggan VIP! Bebas Ongkir." : null
      }
    });

  } catch (error) {
    console.error("❌ ERROR CALCULATE CART:", error); // Biar muncul di terminal
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

// === FITUR ADMIN (LENGKAP) ===

// 1. AMBIL SEMUA PESANAN (Optimized Query)
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Log biar tau ada yang request
    console.log("🔍 FETCHING ORDERS ADMIN - Status:", status);

    const orders = await prisma.pesanan.findMany({
      where: status ? { status: status } : {},
      // GUNAKAN SELECT (Bukan Include) Biar Ringan & Cepat
      select: {
        id: true,
        nomor_nota: true,
        dibuat_pada: true,
        total_bayar: true,
        status: true,
        jenis_pengiriman: true,
        metode_pembayaran: true,
        sub_total: true,
        biaya_ongkir: true,
        alamat_tujuan: true,
        
        // Ambil data user seperlunya saja
        pengguna: {
          select: {
            nama_lengkap: true,
            no_wa: true
          }
        },
        
        // Ambil item tapi jangan terlalu dalam nested-nya
        daftar_item: {
          select: {
            id: true,
            jumlah: true,
            total_per_item: true,
            harga_saat_beli: true,
            varian: {
              select: {
                nama_satuan: true,
                produk: {
                  select: { nama_produk: true }
                }
              }
            }
          }
        }
      },
      orderBy: { dibuat_pada: 'desc' } // Urutkan dari yang terbaru
    });

    console.log(`✅ BERHASIL: DITEMUKAN ${orders.length} PESANAN`);

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("❌ ERROR FETCH ORDERS:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. UPDATE STATUS PESANAN
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, catatan_admin } = req.body;

    const updatedOrder = await prisma.pesanan.update({
      where: { id: parseInt(id) },
      data: {
        status: status,         
        catatan_admin: catatan_admin 
      }
    });

    res.json({ success: true, message: "Status diperbarui", data: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};