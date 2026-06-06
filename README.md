# 🌏 KerjaNusantara — Sistem Pendaftaran Kandidat & Affiliate Berbasis AI OCR

Platform digital terintegrasi untuk mengelola pendaftaran kandidat program kerja luar negeri, dilengkapi sistem affiliate marketing, pembayaran manual, dan verifikasi AI OCR menggunakan Google Gemini Vision.

---

## 🚀 Fitur Utama

| Modul | Fitur |
|-------|-------|
| **Landing Page** | Hero, Program Unggulan, Testimoni, FAQ, CTA |
| **Kandidat** | Registrasi, Profil Lengkap, Upload Dokumen, Daftar Program, Upload Bukti Bayar |
| **Affiliate** | Kode Referral Otomatis, QR Code, Link Tracking, Komisi Otomatis |
| **Pembayaran** | Transfer Manual + AI OCR Verifikasi Otomatis |
| **Admin** | Dashboard KPI, Manajemen Semua Data, Audit Log |
| **Finance** | Verifikasi Pembayaran, Approval Komisi, Laporan |
| **AI OCR** | Gemini 2.5 Flash Vision — ekstrak data bukti transfer otomatis |

---

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js + TypeScript
- Prisma ORM + MySQL
- JWT Authentication + RBAC
- MinIO (File Storage)
- Google Gemini Vision API (OCR)
- Nodemailer (Email)
- Winston (Logger)

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + Shadcn UI
- React Query + Zustand
- React Hook Form + Zod
- Recharts (Charts)

### Infrastructure
- Docker + Docker Compose
- Nginx (Reverse Proxy)

---

## 📁 Struktur Project

```
kandidat-system/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # Prisma client
│   │   │   └── minio.ts           # MinIO storage
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── candidateController.ts
│   │   │   ├── programController.ts
│   │   │   ├── paymentController.ts
│   │   │   ├── affiliateController.ts
│   │   │   ├── documentController.ts
│   │   │   ├── dashboardController.ts
│   │   │   └── settingsController.ts
│   │   ├── middlewares/
│   │   │   ├── auth.ts            # JWT middleware
│   │   │   ├── authorize.ts       # RBAC middleware
│   │   │   ├── upload.ts          # Multer middleware
│   │   │   ├── auditLog.ts        # Audit logging
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── candidateRoutes.ts
│   │   │   ├── programRoutes.ts
│   │   │   ├── paymentRoutes.ts
│   │   │   ├── affiliateRoutes.ts
│   │   │   ├── documentRoutes.ts
│   │   │   ├── dashboardRoutes.ts
│   │   │   └── settingsRoutes.ts
│   │   ├── services/
│   │   │   └── ocrService.ts      # Gemini AI OCR
│   │   ├── utils/
│   │   │   ├── AppError.ts
│   │   │   ├── logger.ts
│   │   │   └── seeder.ts
│   │   └── index.ts               # App entry point
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── LandingLayout.tsx
│   │   │   │   └── DashboardLayout.tsx
│   │   │   └── ui/
│   │   │       ├── button.tsx
│   │   │       ├── index.tsx      # Card, Badge, Input, Label, etc.
│   │   │       └── toaster.tsx
│   │   ├── pages/
│   │   │   ├── landing/           # Home, ProgramList, ProgramDetail
│   │   │   ├── auth/              # Login, Register
│   │   │   ├── admin/             # Dashboard, Candidates, Programs, etc.
│   │   │   ├── candidate/         # Dashboard, Profile, Documents, etc.
│   │   │   ├── finance/           # Dashboard, Payments, Commissions
│   │   │   └── affiliate/         # Dashboard, Leaderboard
│   │   ├── services/
│   │   │   └── api.ts             # Axios instance
│   │   ├── stores/
│   │   │   └── authStore.ts       # Zustand auth store
│   │   ├── lib/
│   │   │   └── utils.ts           # Utility functions
│   │   ├── App.tsx                # Router & routes
│   │   └── main.tsx
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── nginx/
│   └── nginx.conf                 # Production nginx
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quick Start (Development)

### Prasyarat
- Node.js >= 20
- Docker & Docker Compose
- MySQL 8.0
- MinIO (atau pakai Docker)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd kandidat-system
cp .env.example .env
```

### 2. Start Database & MinIO via Docker

```bash
docker compose up -d mysql minio
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env sesuai kebutuhan
npm install
npm run prisma:push
npm run seed
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Buka: http://localhost:5173

---

## 🐳 Deployment dengan Docker Compose

```bash
# Copy dan edit env
cp .env.example .env
nano .env   # set semua variabel

# Build & run all services
docker compose up -d --build

# Jalankan migrasi & seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

---

## 👤 Akun Default (Setelah Seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@system.com | password123 |
| Admin | admin@system.com | password123 |
| Finance | finance@system.com | password123 |
| Affiliate | affiliate@system.com | password123 |
| Kandidat | kandidat@system.com | password123 |

---

## 🤖 Konfigurasi AI OCR (Gemini)

1. Buka [Google AI Studio](https://aistudio.google.com)
2. Buat API Key
3. Isi di `.env`:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```

OCR akan otomatis membaca:
- Nama pengirim
- Nominal transfer
- Bank pengirim & tujuan
- Nomor referensi
- Tanggal & jam
- Confidence score (0-100)

---

## 🔗 Sistem Affiliate

URL referral format:
```
https://domain.com/register?ref=AFF001
```

Flow komisi:
1. Kandidat daftar via link affiliate → tracking klik + registrasi
2. Kandidat bayar & diverifikasi → komisi otomatis dibuat (status: PENDING)
3. Finance approve komisi → status: APPROVED
4. Affiliate ajukan pencairan → Finance proses pencairan

---

## 📋 API Endpoints Utama

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/programs
GET    /api/programs/:slug
POST   /api/programs/:id/apply

GET    /api/candidates/profile
POST   /api/candidates/profile
PUT    /api/candidates/profile

POST   /api/documents/upload
GET    /api/documents/my

POST   /api/payments/:id/upload-proof
PUT    /api/payments/:id/verify

POST   /api/affiliates/register
GET    /api/affiliates/my
GET    /api/affiliates/leaderboard
POST   /api/affiliates/track/:code

GET    /api/dashboard/admin
GET    /api/dashboard/finance
GET    /api/dashboard/affiliate
```

---

## 🔐 Role & Akses

| Endpoint | Super Admin | Admin | Finance | Affiliate | Kandidat |
|----------|:-----------:|:-----:|:-------:|:---------:|:--------:|
| Dashboard Admin | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard Finance | ✅ | ✅ | ✅ | ❌ | ❌ |
| Verifikasi Pembayaran | ✅ | ✅ | ✅ | ❌ | ❌ |
| CRUD Program | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard Affiliate | ❌ | ❌ | ❌ | ✅ | ❌ |
| Profil Kandidat | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 📄 Lisensi

MIT License — Bebas digunakan dan dikembangkan.
# sistem-kandidat
