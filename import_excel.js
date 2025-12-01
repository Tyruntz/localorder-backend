const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importData() {
  console.log("🚀 Memulai import dari Excel...");

  try {
    // 1. Siapkan Kategori Default (Karena di Excel tidak ada kategori)
    let category = await prisma.kategori.findFirst({
      where: { nama_kategori: "UMUM" }
    });

    if (!category) {
      console.log("📦 Membuat Kategori Default 'UMUM'...");
      category = await prisma.kategori.create({
        data: { nama_kategori: "UMUM" }
      });
    }

    // 2. Baca File Excel
    const workbook = XLSX.readFile('data_barang.xlsx'); // Pastikan nama file sama
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📄 Ditemukan ${data.length} baris data.`);

    for (const row of data) {
      // Mapping nama kolom dari Excel (Sesuai Screenshot Anda)
      // Pastikan tulisan di dalam kurung siku [] SAMA PERSIS dengan header Excel
      const barcodeRaw = row['Barcode'] || row['barcode'];
      const namaProduk = row['Items Name (Do Not Edit)'] || row['Items Name'] || row['nama'];
      const namaVarian = row['Variant nam'] || row['Variant name'] || row['varian'] || 'Pcs';
      const harga = row['Basic - Price'] || row['harga'] || 0;

      if (!namaProduk) continue; // Skip kalau nama kosong

      // Konversi Barcode ke String aman
      const barcodeFix = barcodeRaw ? String(barcodeRaw).trim() : null;

      // Cek apakah Produk Induk sudah ada?
      let product = await prisma.produk.findFirst({
        where: { nama_produk: namaProduk }
      });

      if (!product) {
        // Buat Produk Baru
        product = await prisma.produk.create({
          data: {
            nama_produk: namaProduk,
            id_kategori: category.id,
            deskripsi: "Imported from Excel",
            url_gambar: "" // Biarkan kosong dulu
          }
        });
        console.log(`✅ [NEW] Produk: ${namaProduk}`);
      }

      // Buat/Simpan Varian (Pcs/Dus)
      // Cek dulu biar gak duplikat barcode
      const existingVariant = await prisma.varianSatuan.findFirst({
        where: { 
            OR: [
                { barcode: barcodeFix },
                { id_produk: product.id, nama_satuan: namaVarian }
            ]
        }
      });

      if (!existingVariant) {
          await prisma.varianSatuan.create({
            data: {
              id_produk: product.id,
              nama_satuan: namaVarian,
              harga: parseInt(harga),
              barcode: barcodeFix
            }
          });
          console.log(`   └─ Varian: ${namaVarian} | Rp ${harga} | ${barcodeFix}`);
      } else {
          console.log(`   ⚠️ Skip Varian ${namaVarian} (Barcode/Nama sudah ada)`);
      }
    }

    console.log("\n🎉 IMPORT SELESAI!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();