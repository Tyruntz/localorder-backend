const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer'); // Import Multer

// Setup Multer (Simpan sementara di folder 'uploads/' sebelum ke Cloudinary)
const upload = multer({ dest: 'uploads/' });

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const adminMiddleware = require('../middleware/adminMiddleware');
const reportController = require('../controllers/reportController');

// === AUTH ===
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);

// === PRODUCTS (Public & Admin) ===
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductDetail);
router.get('/categories', productController.getCategories);

// Endpoint Upload Gambar (Khusus Admin/User Login)
// Frontend hit ini dulu -> dapat URL -> baru hit POST /products dengan URL gambarnya
router.post('/products/upload', authenticateToken, upload.single('image'), productController.uploadImage);

// === ORDERS ===
router.post('/cart/calculate', authenticateToken, orderController.calculateCart);
router.post('/orders', authenticateToken, orderController.createOrder);

// === ADMIN ROUTES ===
// Harus Login (authenticateToken) DAN harus Admin (adminMiddleware)
router.get('/admin/orders', authenticateToken, adminMiddleware, orderController.getAllOrdersAdmin);
router.patch('/admin/orders/:id', authenticateToken, adminMiddleware, orderController.updateOrderStatus);

// === ADMIN ROUTES (CRUD PRODUK) ===
// Create
router.post('/admin/products', authenticateToken, adminMiddleware, productController.createProduct);

// Update Info Dasar (Nama, Foto, Kategori)
router.put('/admin/products/:id', authenticateToken, adminMiddleware, productController.updateProduct);

// Update Harga Varian Spesifik
router.put('/admin/variants/price', authenticateToken, adminMiddleware, productController.updateVariant);

// Delete (Soft Delete)
router.delete('/admin/products/:id', authenticateToken, adminMiddleware, productController.deleteProduct);

// Dashboard Report (Omset & Stats)
router.get('/admin/dashboard-stats', authenticateToken, adminMiddleware, reportController.getDashboardStats);

module.exports = router;