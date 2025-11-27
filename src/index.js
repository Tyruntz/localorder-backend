require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Agar Frontend beda port bisa akses
app.use(express.json()); // Agar bisa baca JSON body

// Routing
// Semua API akan diawali dengan /api
// Contoh: /api/products, /api/auth/login
app.use('/api', apiRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Backend Grosir Order System is Running!');
});

// Error Handling Global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Terjadi kesalahan pada server.',
    error: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});