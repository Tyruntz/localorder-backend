# Script untuk membuat struktur folder Backend Express + Prisma
# Jalankan dengan mengetik: .\setup_project.ps1 di terminal VS Code

Write-Host "🚀 Memulai setup struktur project..." -ForegroundColor Cyan

# 1. Buat Folder Utama
$folders = @(
    "src",
    "src\config",
    "src\controllers",
    "src\middleware",
    "src\routes",
    "prisma"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "✅ Folder dibuat: $folder" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Folder sudah ada: $folder" -ForegroundColor Yellow
    }
}

# 2. Buat File-File Kosong (untuk di-paste kode nanti)
$files = @(
    ".env",
    "prisma\schema.prisma",
    "src\index.js",
    "src\config\prisma.js",
    "src\middleware\authMiddleware.js",
    "src\controllers\authController.js",
    "src\controllers\productController.js",
    "src\controllers\orderController.js",
    "src\routes\api.js"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "📄 File dibuat: $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  File sudah ada: $file" -ForegroundColor Yellow
    }
}

Write-Host "`n✨ Setup Selesai! Silakan copy-paste kode ke file masing-masing." -ForegroundColor Cyan