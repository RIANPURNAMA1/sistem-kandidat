import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { catchAsync, sendSuccess } from '../utils/AppError';

export const getAdminDashboard = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'month';
  const customStart = req.query.startDate as string | undefined;
  const customEnd = req.query.endDate as string | undefined;

  let startDate: Date;
  let groupFormat: 'month' | 'week' = 'month';
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
