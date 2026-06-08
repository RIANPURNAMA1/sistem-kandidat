import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { catchAsync, sendSuccess } from '../utils/AppError';

export const getAdminDashboard = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'month';
  const customStart = req.query.startDate as string | undefined;
  const customEnd = req.query.endDate as string | undefined;

  let startDate: Date;
  let groupFormat: string = 'month';
  const now = new Date();

  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 28);
    groupFormat = 'week';
  } else if (period === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    groupFormat = 'day';
  } else {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
  }
  startDate.setHours(0, 0, 0, 0);
  const endDate = period === 'custom' && customEnd ? new Date(customEnd) : undefined;

  const dateFilter = endDate ? { gte: startDate, lte: endDate } : { gte: startDate };

  const [
    totalCandidates,
    totalPrograms,
    totalAffiliates,
    totalPayments,
    pendingPayments,
    paymentStats,
    recentApplications,
    commissionStats,
    topPayments,
    topCommissions,
    paymentStatusStats,
    genderStats,
    educationStats,
    documentStats,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.program.count({ where: { status: 'AKTIF' } }),
    prisma.affiliate.count({ where: { isActive: true } }),
    prisma.payment.count({ where: { status: 'VALID' } }),
    prisma.payment.count({ where: { status: 'MENUNGGU_VERIFIKASI' } }),
    prisma.payment.aggregate({
      where: { status: 'VALID' },
      _sum: { amount: true },
    }),
    prisma.application.findMany({
      take: 10,
      orderBy: { submittedAt: 'desc' },
      include: {
        candidate: { select: { fullName: true } },
        program: { select: { name: true } },
      },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    }),
    prisma.payment.findMany({
      where: { status: 'VALID', verifiedAt: dateFilter },
      select: { amount: true, application: { select: { program: { select: { id: true, name: true } } } } },
    }),
    prisma.commission.findMany({
      where: { status: { in: ['APPROVED', 'PAID'] }, createdAt: dateFilter },
      select: { amount: true, affiliate: { select: { id: true, name: true, code: true } } },
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.candidate.groupBy({
      by: ['gender'],
      _count: { _all: true },
    }),
    prisma.candidate.groupBy({
      by: ['lastEducation'],
      _count: { _all: true },
      orderBy: { _count: { lastEducation: 'desc' } },
    }),
    prisma.document.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
      },
    }),
  ]);

  const [candidatesTrend, affiliatesTrend, paymentsTrend, commissionsTrend, applicationStatusCounts] = await Promise.all([
    prisma.candidate.findMany({
      where: { createdAt: dateFilter },
      select: { createdAt: true }
    }),
    prisma.affiliate.findMany({
      where: { createdAt: dateFilter },
      select: { createdAt: true }
    }),
    prisma.payment.findMany({
      where: { status: 'VALID', verifiedAt: dateFilter },
      select: { amount: true, verifiedAt: true, createdAt: true }
    }),
    prisma.commission.findMany({
      where: { status: { in: ['APPROVED', 'PAID'] }, createdAt: dateFilter },
      select: { amount: true, createdAt: true }
    }),
    prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true }
    })
  ]);

  interface StatItem {
    key: string;
    label: string;
    candidates: number;
    affiliates: number;
    revenue: number;
    commission: number;
  }

  // Top Programs by Revenue
  const programRevenueMap = new Map<string, { id: string; name: string; totalRevenue: number; totalSales: number }>();
  for (const p of topPayments) {
    const prog = p.application.program;
    const key = prog.id;
    if (!programRevenueMap.has(key)) {
      programRevenueMap.set(key, { id: prog.id, name: prog.name, totalRevenue: 0, totalSales: 0 });
    }
    const item = programRevenueMap.get(key)!;
    item.totalRevenue += Number(p.amount);
    item.totalSales += 1;
  }
  const topPrograms = Array.from(programRevenueMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Top Affiliates by Commission
  const affiliateStatsMap = new Map<string, { id: string; name: string; code: string; totalCommission: number; totalCommissions: number }>();
  for (const c of topCommissions) {
    const aff = c.affiliate;
    const key = aff.id;
    if (!affiliateStatsMap.has(key)) {
      affiliateStatsMap.set(key, { id: aff.id, name: aff.name || aff.code, code: aff.code, totalCommission: 0, totalCommissions: 0 });
    }
    const item = affiliateStatsMap.get(key)!;
    item.totalCommission += Number(c.amount);
    item.totalCommissions += 1;
  }
  const topAffiliates = Array.from(affiliateStatsMap.values())
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, 10);

  const statsMap = new Map<string, StatItem>();

  const addOrCreate = (date: Date, candidates = 0, affiliates = 0, revenue = 0, commission = 0) => {
    let key: string;
    let label: string;
    if (period === 'week') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      key = `${startOfWeek.getFullYear()}-W${String(Math.ceil((startOfWeek.getDate() + new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
      label = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`;
    } else if (period === 'custom') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      label = `${date.getDate()}/${date.getMonth() + 1}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      label = date.toLocaleString('id-ID', { month: 'short' });
    }
    if (!statsMap.has(key)) {
      statsMap.set(key, { key, label, candidates: 0, affiliates: 0, revenue: 0, commission: 0 });
    }
    const item = statsMap.get(key)!;
    item.candidates += candidates;
    item.affiliates += affiliates;
    item.revenue += revenue;
    item.commission += commission;
  };

  // Pre-fill empty slots
  if (period === 'month') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      addOrCreate(d);
    }
  } else if (period === 'week') {
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      addOrCreate(d);
    }
  } else if (period === 'custom') {
    const start = new Date(startDate);
    const end = endDate || new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      addOrCreate(new Date(d));
    }
  }

  candidatesTrend.forEach(c => addOrCreate(c.createdAt, 1));
  affiliatesTrend.forEach(a => addOrCreate(a.createdAt, 0, 1));
  paymentsTrend.forEach(p => {
    const date = p.verifiedAt || p.createdAt;
    addOrCreate(date, 0, 0, Number(p.amount));
  });
  commissionsTrend.forEach(c => addOrCreate(c.createdAt, 0, 0, 0, Number(c.amount)));

  const monthlyStats = Array.from(statsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  const isDbEmpty = totalCandidates === 0 && totalAffiliates === 0 && totalPayments === 0;
  let statusStats = applicationStatusCounts.map(a => ({ status: a.status, count: a._count._all }));

  if (isDbEmpty) {
    const demoCandidates = [12, 19, 32, 25, 41, 56];
    const demoAffiliates = [3, 7, 10, 14, 18, 28];
    const demoRevenues = [5000000, 8500000, 15000000, 12000000, 22500000, 31000000];
    const demoCommissions = [500000, 850000, 1500000, 1200000, 2250000, 3100000];

    const filled: StatItem[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('id-ID', { month: 'short' });
      filled.push({
        key, label,
        candidates: demoCandidates[i] || 0,
        affiliates: demoAffiliates[i] || 0,
        revenue: demoRevenues[i] || 0,
        commission: demoCommissions[i] || 0
      });
    }
    monthlyStats.length = 0;
    monthlyStats.push(...filled);

    statusStats = [
      { status: 'ACCEPTED', count: 18 },
      { status: 'INTERVIEW', count: 8 },
      { status: 'REVIEW', count: 12 },
      { status: 'WAITING_PAYMENT', count: 5 },
      { status: 'REJECTED', count: 3 }
    ];
  }

  // Demo data for new stats when empty
  const finalPaymentStatusStats = isDbEmpty
    ? [
        { status: 'VALID', count: 95 },
        { status: 'MENUNGGU_VERIFIKASI', count: 7 },
        { status: 'MENUNGGU_UPLOAD', count: 12 },
        { status: 'DITOLAK', count: 3 },
      ]
    : paymentStatusStats.map(p => ({ status: p.status, count: p._count._all }));

  const finalGenderStats = isDbEmpty
    ? [
        { gender: 'LAKI_LAKI', count: 38 },
        { gender: 'PEREMPUAN', count: 18 },
      ]
    : genderStats.map(g => ({ gender: g.gender, count: g._count._all }));

  const finalEducationStats = isDbEmpty
    ? [
        { lastEducation: 'SMA/SMK', count: 32 },
        { lastEducation: 'D3', count: 12 },
        { lastEducation: 'S1', count: 10 },
        { lastEducation: 'SMP', count: 2 },
      ]
    : educationStats.map(e => ({ lastEducation: e.lastEducation, count: e._count._all }));

  const finalDocumentStats = isDbEmpty
    ? [
        { status: 'VERIFIED', count: 65 },
        { status: 'PENDING', count: 28 },
        { status: 'REJECTED', count: 4 },
      ]
    : documentStats.map(d => ({ status: d.status, count: d._count._all }));

  const finalAuditLogs = recentAuditLogs.map(log => ({
    id: log.id,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    userEmail: log.user?.email || null,
    createdAt: log.createdAt,
  }));

  // Demo top programs & affiliates when empty
  const finalTopPrograms = isDbEmpty
    ? [
        { id: '1', name: 'Program Tokutei Ginou Jepang 2024', totalRevenue: 125000000, totalSales: 10 },
        { id: '2', name: 'Program EPS-TOPIK Korea 2024', totalRevenue: 85000000, totalSales: 10 },
        { id: '3', name: 'Magang Jerman - Hospitality & Kuliner', totalRevenue: 45000000, totalSales: 3 },
        { id: '4', name: 'Program Tokutei Ginou Jepang 2025', totalRevenue: 37500000, totalSales: 3 },
        { id: '5', name: 'Program EPS-TOPIK Korea 2025', totalRevenue: 25500000, totalSales: 3 },
      ]
    : topPrograms;

  const finalTopAffiliates = isDbEmpty
    ? [
        { id: '1', name: 'John Affiliate', code: 'AFF001', totalCommission: 5000000, totalCommissions: 10 },
        { id: '2', name: 'Sarah Wijaya', code: 'AFF002', totalCommission: 3500000, totalCommissions: 7 },
        { id: '3', name: 'Andi Pratama', code: 'AFF003', totalCommission: 2100000, totalCommissions: 5 },
        { id: '4', name: 'Dewi Lestari', code: 'AFF004', totalCommission: 1500000, totalCommissions: 3 },
        { id: '5', name: 'Budi Hartono', code: 'AFF005', totalCommission: 1000000, totalCommissions: 2 },
      ]
    : topAffiliates;

  return sendSuccess(res, {
    kpi: {
      totalCandidates,
      totalPrograms,
      totalAffiliates,
      totalPayments,
      pendingPayments,
      totalRevenue: paymentStats._sum.amount || 0,
      totalCommission: commissionStats._sum.amount || 0,
    },
    recentApplications,
    monthlyStats,
    statusStats,
    topPrograms: finalTopPrograms,
    topAffiliates: finalTopAffiliates,
    paymentStatusStats: finalPaymentStatusStats,
    genderStats: finalGenderStats,
    educationStats: finalEducationStats,
    documentStats: finalDocumentStats,
    recentAuditLogs: finalAuditLogs,
    isDemo: isDbEmpty,
  });
});

export const getAffiliateDashboard = catchAsync(async (req: Request, res: Response) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!affiliate) return sendSuccess(res, null);

  const [commissions, withdrawals, recentReferrals, clicksLast30] = await Promise.all([
    prisma.commission.groupBy({
      by: ['status'],
      where: { affiliateId: affiliate.id },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.withdrawal.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.candidate.findMany({
      where: { referredBy: affiliate.code },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { fullName: true, createdAt: true },
    }),
    prisma.affiliateClick.count({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return sendSuccess(res, {
    affiliate,
    commissions,
    withdrawals,
    recentReferrals,
    clicksLast30,
  });
});

export const getFinanceDashboard = catchAsync(async (_req: Request, res: Response) => {
  const [pending, validated, rejected, commissionPending, monthlyRevenue] = await Promise.all([
    prisma.payment.count({ where: { status: 'MENUNGGU_VERIFIKASI' } }),
    prisma.payment.count({ where: { status: 'VALID' } }),
    prisma.payment.count({ where: { status: 'DITOLAK' } }),
    prisma.commission.count({ where: { status: 'PENDING' } }),
    prisma.payment.aggregate({
      where: {
        status: 'VALID',
        verifiedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
  ]);

  return sendSuccess(res, {
    paymentSummary: { pending, validated, rejected },
    commissionPending,
    monthlyRevenue: monthlyRevenue._sum?.amount || 0,
  });
});
