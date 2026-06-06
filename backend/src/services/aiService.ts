import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `Anda adalah asisten AI platform "Mendunia.id" — sistem pendaftaran dan penempatan kandidat kerja di Indonesia.

Anda HARUS menjawab dengan Bahasa Indonesia yang ramah dan informatif.

Platform ini memiliki 5 peran pengguna: SUPER_ADMIN, ADMIN, FINANCE, AFFILIATE, KANDIDAT.

Berikut DATABASE SCHEMA lengkap platform:

=== TABEL & RELASI ===

1. users — Akun pengguna (id, email, password, role, isActive, isVerified)
   Relasi: 1 user memiliki 1 candidate/affiliate, banyak notification & audit_log

2. candidates — Data kandidat (id, userId, nik, fullName, birthPlace, birthDate, gender, 
   maritalStatus, address, kampung, desa, kecamatan, kabupaten, provinsi, 
   lastEducation, graduationYear, height, weight, bloodType, clothingSize, 
   phone, guardianName, guardianPhone, referredBy)
   Relasi: belongsTo user & affiliate (via referredBy), hasMany document, application, payment

3. programs — Program pendaftaran (id, name, slug, categoryId, description, requirements,
   quota, fee, affiliateCommission, commissionType[FIXED/PERCENTAGE], status[AKTIF/NONAKTIF/PENUH/SELESAI])
   Relasi: belongsTo category, hasMany application & affiliateProgram

4. program_categories — Kategori program (id, name, slug)

5. applications — Pendaftaran kandidat ke program (id, candidateId, programId, 
   status[DRAFT/SUBMITTED/REVIEW/INTERVIEW/ACCEPTED/REJECTED/WAITING_PAYMENT/PAID/TRAINING/PLACED/COMPLETED])
   Relasi: belongsTo candidate & program, hasOne payment, hasMany statusHistory

6. application_histories — Riwayat status pendaftaran (id, applicationId, status, notes, changedBy)

7. documents — Dokumen kandidat (id, candidateId, type[KTP/KK/PASPOR/IJAZAH/CV/SERTIFIKAT/LAINNYA],
   status[PENDING/VERIFIED/REJECTED])
   Relasi: belongsTo candidate

8. payments — Pembayaran (id, applicationId, candidateId, amount, 
   status[MENUNGGU_UPLOAD/MENUNGGU_VERIFIKASI/VALID/DITOLAK], proofUrl, ocrData)
   Relasi: belongsTo application & candidate, hasOne commission

9. affiliates — Mitra afiliasi (id, userId, code, referralLink, bankName, bankAccount,
   bankHolder, isActive, totalClicks, totalRegistrations, totalPaid, totalCommission)
   Relasi: belongsTo user, hasMany candidate(referral), commission, withdrawal, clickLog, affiliateProgram

10. affiliate_programs — Mapping afiliasi ke program (affiliateId, programId)

11. affiliate_clicks — Click tracking referral (id, affiliateId, ip, userAgent)

12. commissions — Komisi afiliasi (id, affiliateId, paymentId, amount, 
    status[PENDING/APPROVED/PAID/REJECTED])
    Relasi: belongsTo affiliate & payment

13. withdrawals — Penarikan komisi (id, affiliateId, amount, 
    status[PENDING/APPROVED/REJECTED/PAID], bankName, bankAccount, bankHolder)

14. notifications — Notifikasi in-app (id, userId, title, message, isRead)

15. audit_logs — Log aktivitas (id, userId, action[LOGIN/LOGOUT/CREATE/UPDATE/DELETE/APPROVE/etc], 
    resource, resourceId, before, after)

16. settings — Pengaturan aplikasi (id, key, value, group)

17. banners — Banner halaman utama (id, title, imageUrl, isActive, sortOrder)

18. testimonials — Testimoni (id, name, position, content, rating, isActive, sortOrder)

19. faqs — FAQ (id, question, answer, category, isActive, sortOrder)

=== ALUR BISNIS ===
- Kandidat daftar → pilih program → upload bukti transfer → admin verifikasi pembayaran
- Jika ada referral code (ref), kandidat terhubung ke affiliate
- Affiliate dapat komisi dari pembayaran kandidat yang direferensikan
- Affiliate bisa tarik komisi (withdrawal)
- Admin bisa kelola program, kandidat, pembayaran, affiliate

=== DATA REAL-TIME & LAPORAN ===
Anda bisa melihat data real-time dari database di bawah ini.

KETIKA DIMINTA MEMBUAT LAPORAN (misal "buat laporan", "laporan keuangan", "laporan kandidat", "laporan affiliate", "tampilkan laporan"):
Anda HARUS membuat laporan LANGSUNG di chat ini dalam bentuk TABEL/format rapi menggunakan data real-time yang tersedia di bawah.

PANDUAN MEMBUAT LAPORAN INLINE:
1. Gunakan data real-time yang diberikan untuk menyusun laporan
2. Tampilkan dalam format tabel menggunakan karakter pipe (|) dan strip (-) seperti markdown
3. Sertakan: judul laporan, periode, ringkasan eksekutif, tabel data, dan insight/kesimpulan
4. Untuk laporan keuangan: tampilkan pendapatan per program dalam tabel, status pembayaran, tren bulanan
5. Untuk laporan kandidat: tampilkan daftar kandidat dalam tabel, status pendaftaran
6. Untuk laporan affiliate: tampilkan peringkat affiliate dalam tabel, total komisi, total registrasi
7. Jangan hanya merujuk ke halaman lain — buat laporannya langsung di sini!`;

interface DataContext {
  totalUsers: number
  totalCandidates: number
  totalAffiliates: number
  totalPrograms: number
  totalPaymentsValid: number
  totalPaymentsPending: number
  totalPaymentsWaitingUpload: number
  totalPaymentsRejected: number
  totalCommissions: number
  totalCommissionsPending: number
  totalCommissionsPaid: number
  totalRevenue: string
  totalCommissionAmount: string
  recentCandidates: { fullName: string; program: string; status: string; createdAt: string }[]
  topAffiliates: { code: string; name: string; totalCommission: string; totalRegistrations: number }[]
  applicationStats: { status: string; count: number }[]
  programs: { name: string; fee: string; quota: number; status: string; applicationsCount: number }[]
  paymentsByStatus: { status: string; count: number; total: string }[]
  monthlyData: { month: string; revenue: string; count: number }[]
}

async function getDataContext(): Promise<DataContext> {
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    totalUsers, totalCandidates, totalAffiliates, totalPrograms,
    validPayments, pendingVerif, waitingUpload, rejectedPayments,
    commissions, pendingCommissions, paidCommissions, totalCommSum,
    programs, recentCandidates, topAffiliates, appStatuses,
    paymentsByStatus,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.affiliate.count(),
    prisma.program.count({ where: { status: 'AKTIF' } }),
    prisma.payment.findMany({ where: { status: 'VALID' }, select: { amount: true } }),
    prisma.payment.count({ where: { status: 'MENUNGGU_VERIFIKASI' } }),
    prisma.payment.count({ where: { status: 'MENUNGGU_UPLOAD' } }),
    prisma.payment.count({ where: { status: 'DITOLAK' } }),
    prisma.commission.findMany({ select: { amount: true, status: true } }),
    prisma.commission.count({ where: { status: 'PENDING' } }),
    prisma.commission.count({ where: { status: 'PAID' } }),
    prisma.commission.aggregate({ _sum: { amount: true } }),
    prisma.program.findMany({
      where: { status: 'AKTIF' },
      select: { id: true, name: true, fee: true, quota: true, status: true },
    }),
    prisma.candidate.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        applications: { include: { program: { select: { name: true } } }, take: 1 },
      },
    }),
    prisma.affiliate.findMany({
      take: 5,
      orderBy: { totalCommission: 'desc' },
      select: { code: true, name: true, totalCommission: true, totalRegistrations: true },
    }),
    prisma.application.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
    }),
  ])

  const totalRevenue = validPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  const appCounts = await Promise.all(
    programs.map(p =>
      prisma.application.count({ where: { programId: p.id } })
    )
  )

  const allPayments = await prisma.payment.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { amount: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const monthlyMap: Record<string, { revenue: number; count: number }> = {}
  for (const p of allPayments) {
    if (p.status !== 'VALID') continue
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, count: 0 }
    monthlyMap[key].revenue += Number(p.amount)
    monthlyMap[key].count += 1
  }

  return {
    totalUsers,
    totalCandidates,
    totalAffiliates,
    totalPrograms,
    totalPaymentsValid: validPayments.length,
    totalPaymentsPending: pendingVerif,
    totalPaymentsWaitingUpload: waitingUpload,
    totalPaymentsRejected: rejectedPayments,
    totalCommissions: commissions.length,
    totalCommissionsPending: pendingCommissions,
    totalCommissionsPaid: paidCommissions,
    totalRevenue: totalRevenue.toLocaleString('id-ID'),
    totalCommissionAmount: Number(totalCommSum._sum.amount || 0).toLocaleString('id-ID'),
    recentCandidates: recentCandidates.map(c => ({
      fullName: c.fullName,
      program: c.applications[0]?.program.name || '-',
      status: c.applications[0]?.status || '-',
      createdAt: c.createdAt.toISOString().split('T')[0],
    })),
    topAffiliates: topAffiliates.map(a => ({
      code: a.code,
      name: a.name || '-',
      totalCommission: Number(a.totalCommission).toLocaleString('id-ID'),
      totalRegistrations: a.totalRegistrations,
    })),
    applicationStats: appStatuses.map(s => ({ status: s.status, count: s._count })),
    programs: programs.map((p, i) => ({
      name: p.name,
      fee: Number(p.fee).toLocaleString('id-ID'),
      quota: p.quota,
      status: p.status,
      applicationsCount: appCounts[i],
    })),
    paymentsByStatus: paymentsByStatus.map(s => ({
      status: s.status,
      count: s._count,
      total: Number(s._sum.amount || 0).toLocaleString('id-ID'),
    })),
    monthlyData: Object.entries(monthlyMap).map(([month, d]) => ({
      month,
      revenue: d.revenue.toLocaleString('id-ID'),
      count: d.count,
    })),
  }
}

export async function chatWithAI(message: string): Promise<string> {
  try {
    if (!message.trim()) {
      return 'Silakan ketik pesan Anda.';
    }

    const dataContext = await getDataContext();

    const DATA_BLOCK = `
=== DATA REAL-TIME SAAT INI ===
RINGKASAN:
- Total Users: ${dataContext.totalUsers} | Kandidat: ${dataContext.totalCandidates} | Affiliate: ${dataContext.totalAffiliates} | Program Aktif: ${dataContext.totalPrograms}
- Pendapatan: Rp ${dataContext.totalRevenue} | Komisi: Rp ${dataContext.totalCommissionAmount}
- Pembayaran: ${dataContext.totalPaymentsValid} Valid | ${dataContext.totalPaymentsPending} Menunggu Verif | ${dataContext.totalPaymentsWaitingUpload} Menunggu Upload | ${dataContext.totalPaymentsRejected} Ditolak
- Komisi: ${dataContext.totalCommissionsPending} Pending | ${dataContext.totalCommissionsPaid} Dibayar | Total: ${dataContext.totalCommissions} Komisi

PROGRAM AKTIF:
${dataContext.programs.map(p => `- ${p.name} | Biaya: Rp ${p.fee} | Kuota: ${p.quota} | Pendaftar: ${p.applicationsCount} orang | Status: ${p.status}`).join('\n')}

PEMBAYARAN PER STATUS:
${dataContext.paymentsByStatus.map(s => `- ${s.status}: ${s.count} transaksi (Rp ${s.total})`).join('\n')}

PENDAPATAN BULANAN (6 bulan terakhir):
${dataContext.monthlyData.map(m => `- ${m.month}: Rp ${m.revenue} (${m.count} transaksi)`).join('\n')}

5 KANDIDAT TERBARU:
${dataContext.recentCandidates.map(c => `- ${c.fullName} | Program: ${c.program} | Status: ${c.status} | Tgl: ${c.createdAt}`).join('\n')}

5 AFFILIATE TOP (by Komisi):
${dataContext.topAffiliates.map(a => `- ${a.code} (${a.name}) | Komisi: Rp ${a.totalCommission} | Registrasi: ${a.totalRegistrations}`).join('\n')}

STATUS PENDAFTARAN:
${dataContext.applicationStats.map(s => `- ${s.status}: ${s.count}`).join('\n')}
`;

    const prompt = `${SYSTEM_PROMPT}\n${DATA_BLOCK}\n\nPertanyaan pengguna: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash', 
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    const text = response.text ?? '';
    logger.info(`AI chat response received, length: ${text.length}`);
    return text || 'Maaf, saya tidak bisa memberikan jawaban saat ini. Silakan coba lagi.';
  } catch (error: any) {
    logger.error('AI chat error:', {
      message: error.message,
      status: error.status,
    });

    if (error.message?.includes('quota') || error.status === 429) {
      return 'Maaf, layanan AI sedang sibuk karena kuota terbatas. Silakan coba lagi nanti.';
    }

    return 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi nanti.';
  }
}
