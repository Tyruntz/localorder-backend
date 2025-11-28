# 🛒 B2B Grosir Order System (Backend API)

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

Backend API yang kuat dan scalable untuk sistem pemesanan toko grosir. Dibangun untuk menggantikan sistem pemesanan manual (WhatsApp) dengan platform digital yang terstruktur, mendukung multi-satuan harga dan validasi bisnis yang kompleks.

**🚀 Live Demo:** [https://domain-railway-anda.up.railway.app](https://domain-railway-anda.up.railway.app)

---

## 🔥 Key Features

Backend ini menangani logika bisnis yang spesifik untuk model bisnis Grosir/Retail:

* **📦 Multi-Unit Pricing System:** Satu produk memiliki banyak varian satuan dengan harga & barcode berbeda (Contoh: *Indomie* bisa dibeli satuan **Pcs** atau **Dus**).
* **🧠 Smart Checkout Logic:**
    * Validasi minimum order (Rp 400.000).
    * Logika pengiriman bertingkat: Belanja < Rp 700.000 wajib *Pickup*, > Rp 700.000 membuka opsi *Delivery*.
* **👮 Role-Based Access Control:** Pemisahan hak akses antara **User (Pembeli)** dan **Admin (Tuan Toko)** menggunakan JWT Middleware.
* **📊 Admin Dashboard Analytics:** API untuk menghitung omset harian, bulanan, dan status pesanan secara real-time.
* **🚚 Shipping & Payment:** Dukungan perhitungan ongkir per wilayah (kecamatan) dan metode pembayaran (COD/Transfer).
* **🔍 Advanced Search:** Pencarian produk dengan indexing database.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MySQL
* **ORM:** Prisma
* **Authentication:** JSON Web Token (JWT) & Bcrypt
* **File Storage:** Cloudinary (untuk gambar produk & bukti bayar)
* **Deployment:** Railway

---

## 🗄️ Database Schema (ERD)

Sistem ini menggunakan relasi database yang terstruktur untuk menjamin integritas data transaksi.

* **Users** 1-N **Orders**
* **Categories** 1-N **Products**
* **Products** 1-N **ProductUnits (Varian)** *<-- Key Feature*
* **Orders** 1-N **OrderItems**

---

## 🚀 Getting Started

Ikuti langkah ini untuk menjalankan server di lokal komputer Anda.

### Prerequisites
* Node.js (v16+)
* MySQL Database

### Installation

1.  **Clone repository**
    ```bash
    git clone [https://github.com/username-anda/nama-repo.git](https://github.com/username-anda/nama-repo.git)
    cd localorder-backend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    Buat file `.env` dan isi konfigurasi berikut:
    ```env
    DATABASE_URL="mysql://user:password@localhost:3306/grosir_db"
    JWT_SECRET="rahasia_super_aman"
    PORT=5000
    # Optional (Cloudinary)
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    ```

4.  **Database Migration**
    ```bash
    npx prisma db push
    ```

5.  **Run Server**
    ```bash
    npm run dev
    ```

Server akan berjalan di `http://localhost:5000` 🚀

---

## 📚 API Documentation

Berikut adalah endpoint utama yang tersedia.

### 🔐 Authentication
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | Pendaftaran user baru |
| POST | `/api/auth/login` | Login & mendapatkan Bearer Token |

### 🛒 Products & Cart
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| GET | `/api/products` | List produk (Support query `?search=` & `?kategoriId=`) |
| GET | `/api/products/:id` | Detail produk lengkap dengan varian harga |
| POST | `/api/cart/calculate` | **(Penting)** Simulasi hitung total & validasi rules belanja |

### 📦 Orders
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/api/orders` | Checkout & Finalisasi pesanan |

### 👨‍💼 Admin Only
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/api/admin/products` | Tambah produk & varian baru |
| GET | `/api/admin/orders` | Lihat semua pesanan masuk |
| PATCH | `/api/admin/orders/:id` | Update status pesanan (Proses/Selesai) |
| GET | `/api/admin/dashboard-stats` | Laporan omset & statistik |

---

## 👨‍💻 Author

**Engelbertus Prayoga**
* Backend Developer
* [Engelbertus Prayoga]
* [eng-portal.com]

---

*Project ini dibuat sebagai solusi digitalisasi UMKM Toko Grosir.*