#!/bin/bash
set -e

echo "======================================"
echo "  KerjaNusantara - Deploy Script"
echo "======================================"

if [ ! -f ".env" ]; then
  echo "❌ File .env tidak ditemukan. Jalankan: cp .env.example .env"
  exit 1
fi

# Pull latest (jika pakai git)
# git pull origin main

echo "🐳 Building Docker images..."
docker compose build --no-cache

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Menunggu database siap..."
sleep 15

echo "🔧 Running database migrations..."
docker compose exec backend npx prisma migrate deploy

echo "🌱 Running seeder..."
docker compose exec backend node dist/utils/seeder.js

echo ""
echo "======================================"
echo "✅ Deployment selesai!"
echo "🌐 Frontend : http://localhost"
echo "🔌 API      : http://localhost/api"
echo "📦 MinIO    : http://localhost:9001"
echo "======================================"
