#!/bin/bash
set -e

echo "======================================"
echo "  KerjaNusantara - Install Script"
echo "======================================"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak ditemukan. Install Node.js >= 20 terlebih dahulu."
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "❌ Node.js versi $NODE_VER terlalu lama. Butuh >= 20."
  exit 1
fi

echo "✅ Node.js $(node -v) terdeteksi"

# Copy env files
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "📄 .env dibuat dari .env.example — EDIT sebelum melanjutkan!"
fi

if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "📄 backend/.env dibuat"
fi

if [ ! -f "frontend/.env" ]; then
  cp frontend/.env.example frontend/.env
  echo "📄 frontend/.env dibuat"
fi

# Install backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install
echo "✅ Backend dependencies installed"

# Generate Prisma
echo "🔧 Generating Prisma client..."
npm run prisma:generate
echo "✅ Prisma client generated"
cd ..

# Install frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend && npm install
echo "✅ Frontend dependencies installed"
cd ..

echo ""
echo "======================================"
echo "✅ Instalasi selesai!"
echo ""
echo "Langkah selanjutnya:"
echo "1. Edit backend/.env (set DATABASE_URL, GEMINI_API_KEY, dll)"
echo "2. Jalankan: cd backend && npm run prisma:push"
echo "3. Jalankan: cd backend && npm run seed"
echo "4. Jalankan: cd backend && npm run dev"
echo "5. Di terminal lain: cd frontend && npm run dev"
echo "======================================"
