const prisma = require('../config/prisma');

// AMBIL SEMUA PRODUK (Bisa Filter by Kategori)
exports.getProducts = async (req, res) => {
  try {
    const { kategoriId, search, showAll } = req.query;

    // 1. DEBUGGING LOG (Cek di Railway Logs nanti)
    console.log(">>> REQUEST MASUK:", { kategoriId, search, showAll });

    // 2. BANGUN QUERY SECARA DINAMIS (Cara paling aman)
    const filterQuery = {};

    // Logic: Kalau showAll BUKAN 'true', maka paksa filter aktif = true.
    // Kalau showAll == 'true', filter ini jangan dimasukkan sama sekali.
    if (showAll !== 'true') {
      filterQuery.aktif = true;
    }

    if (kategoriId) {
      filterQuery.id_kategori = parseInt(kategoriId);
    }

    if (search) {
      filterQuery.nama_produk = { contains: search };
    }

    console.log(">>> FILTER DATABASE:", filterQuery);

    // 3. EKSEKUSI PRISMA
    const products = await prisma.produk.findMany({
      where: filterQuery, // Masukkan object yang kita susun tadi
      include: {
        kategori: true,
        daftar_varian: true
      },
      orderBy: {
        nama_produk: 'asc'
      }
    });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error("ERROR GET PRODUCTS:", error);
    res.status(500).json({ message: error.message });
  }
};

// AMBIL DETAIL PRODUK
exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.produk.findUnique({
      where: { id: parseInt(id) },
      include: { daftar_varian: true, kategori: true }
    });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// AMBIL SEMUA KATEGORI (Untuk Menu Frontend)
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.kategori.findMany();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tambahan di productController.js
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Konfigurasi Cloudinary (Dapat dari Dashboard Cloudinary nanti)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload.' });
    }

    // Upload ke Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'grosir-products', // Nama folder di Cloudinary
    });

    // Hapus file temporary di server local (supaya server gak penuh)
    fs.unlinkSync(req.file.path);

    // Kembalikan URL ke Frontend
    res.json({
      success: true,
      url: result.secure_url // URL ini nanti disimpan Frontend saat create product
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// === FITUR ADMIN: KELOLA PRODUK ===

// 1. TAMBAH PRODUK BARU (Create)
exports.createProduct = async (req, res) => {
  try {
    const { 
      nama_produk, 
      deskripsi, 
      id_kategori, 
      url_gambar, 
      varian // Array: [{ name: "Pcs", price: 3000, barcode: "123" }, ...]
    } = req.body;

    // Validasi input
    if (!varian || varian.length === 0) {
      return res.status(400).json({ message: "Minimal harus ada 1 varian satuan (misal: Pcs)." });
    }

    // Gunakan Nested Write Prisma (Simpan Induk + Anak sekaligus)
    const newProduct = await prisma.produk.create({
      data: {
        nama_produk,
        deskripsi,
        url_gambar,
        // Hubungkan ke kategori
        kategori: { connect: { id: parseInt(id_kategori) } },
        // Buat varian sekaligus
        daftar_varian: {
          create: varian.map(v => ({
            nama_satuan: v.name,
            harga: parseInt(v.price),
            barcode: v.barcode || null
          }))
        }
      },
      include: { daftar_varian: true } // Return data lengkap biar frontend langsung update
    });

    res.status(201).json({ success: true, message: "Produk berhasil dibuat!", data: newProduct });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. UPDATE PRODUK
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, deskripsi, id_kategori, url_gambar, aktif } = req.body;

    const updatedProduct = await prisma.produk.update({
      where: { id: parseInt(id) },
      data: {
        nama_produk,
        deskripsi,
        url_gambar,
        aktif, // Bisa set false untuk sembunyikan produk
        id_kategori: id_kategori ? parseInt(id_kategori) : undefined
      }
    });

    res.json({ success: true, message: "Info produk diperbarui", data: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. UPDATE HARGA/VARIAN (Case Khusus)
// Disarankan pisah endpoint biar aman. Ini untuk tambah/edit varian.
exports.updateVariant = async (req, res) => {
  try {
    const { id, price, barcode } = req.body; // ID VarianSatuan
    
    const updatedVariant = await prisma.varianSatuan.update({
      where: { id: parseInt(id) },
      data: {
        harga: parseInt(price),
        barcode: barcode
      }
    });

    res.json({ success: true, message: "Harga berhasil diupdate", data: updatedVariant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// src/controllers/productController.js

// AMBIL SEMUA PRODUK (Filter Kategori & Search)
exports.getProducts = async (req, res) => {
  try {
    // Ambil parameter dari URL
    // Contoh: ?kategoriId=1&search=soto
    const { kategoriId, search } = req.query; 

    const products = await prisma.produk.findMany({
      where: {
        aktif: true, // Selalu hanya tampilkan yang aktif
        
        // 1. Filter Kategori (Jika ada yang dipilih)
        id_kategori: kategoriId ? parseInt(kategoriId) : undefined,
        
        // 2. Filter Pencarian (Jika user mengetik sesuatu)
        nama_produk: search ? { 
          contains: search // Mencari text yang mengandung kata kunci
        } : undefined
      },
      include: {
        kategori: true,
        daftar_varian: true
      },
      orderBy: {
        nama_produk: 'asc' // Urutkan A-Z biar rapi
      }
    });

    res.json({
      success: true,
      count: products.length, // Info ada berapa hasil ditemukan
      data: products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 4. HAPUS PRODUK (Soft Delete)
// Kita tidak benar-benar menghapus dari DB supaya riwayat pesanan aman.
// Kita cuma set aktif = false.
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.produk.update({
      where: { id: parseInt(id) },
      data: { aktif: false }
    });

    res.json({ success: true, message: "Produk dinonaktifkan (Soft Delete)." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

