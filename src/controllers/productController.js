const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==========================================
// 1. PUBLIC API (Bisa Diakses User & Admin)
// ==========================================

// AMBIL SEMUA PRODUK (Logic V2 - Anti Bug)
exports.getProducts = async (req, res) => {
  try {
    const { kategoriId, search, showAll } = req.query;

    // Log Request untuk Debugging di Railway
    console.log("🔥 REQUEST GET PRODUCTS:", { kategoriId, search, showAll });

    // Bangun Query Filter Secara Manual (Lebih Aman)
    const filterQuery = {};

    // Logic Status:
    // Jika Admin minta showAll='true', jangan filter aktif (tampilkan semua).
    // Jika tidak, paksa hanya tampilkan yang aktif = true.
    if (showAll !== 'true') {
      filterQuery.aktif = true;
    }

    // Logic Kategori
    if (kategoriId) {
      filterQuery.id_kategori = parseInt(kategoriId);
    }

    // Logic Search
    if (search) {
      filterQuery.nama_produk = { contains: search };
    }

    console.log("🔥 FILTER DATABASE:", filterQuery);

    const products = await prisma.produk.findMany({
      where: filterQuery,
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

// AMBIL DETAIL SATU PRODUK
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

// AMBIL LIST KATEGORI
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.kategori.findMany();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 2. ADMIN API (CRUD Produk)
// ==========================================

// UPLOAD GAMBAR KE CLOUDINARY
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload.' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'grosir-products',
    });

    // Hapus file sampah di server (biar storage aman)
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      url: result.secure_url
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// TAMBAH PRODUK BARU
exports.createProduct = async (req, res) => {
  try {
    const { 
      nama_produk, 
      deskripsi, 
      id_kategori, 
      url_gambar, 
      varian 
    } = req.body;

    if (!varian || varian.length === 0) {
      return res.status(400).json({ message: "Minimal harus ada 1 varian satuan." });
    }

    const newProduct = await prisma.produk.create({
      data: {
        nama_produk,
        deskripsi,
        url_gambar,
        kategori: { connect: { id: parseInt(id_kategori) } },
        daftar_varian: {
          create: varian.map(v => ({
            nama_satuan: v.name,
            harga: parseInt(v.price),
            barcode: v.barcode || null
          }))
        }
      },
      include: { daftar_varian: true }
    });

    res.status(201).json({ success: true, message: "Produk berhasil dibuat!", data: newProduct });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE DATA PRODUK UTAMA
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
        aktif,
        id_kategori: id_kategori ? parseInt(id_kategori) : undefined
      }
    });

    res.json({ success: true, message: "Info produk diperbarui", data: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE HARGA VARIAN
exports.updateVariant = async (req, res) => {
  try {
    const { id, price, barcode } = req.body;
    
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

// HAPUS PRODUK (Soft Delete)
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