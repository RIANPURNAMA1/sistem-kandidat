import { Request, Response } from 'express';
import { prisma } from '../config/database';

export async function getFinancialReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
    }

    const [
      payments,
      commissions,
      totalRevenue,
      totalCommissionsSum,
      programs,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: dateFilter,
        include: {
          candidate: { select: { fullName: true } },
          application: { include: { program: { select: { name: true, slug: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commission.findMany({
        where: dateFilter,
        include: {
          affiliate: { select: { code: true, name: true } },
          payment: { include: { candidate: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.aggregate({
        where: { ...dateFilter, status: 'VALID' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: dateFilter,
        _sum: { amount: true },
      }),
      prisma.program.findMany({
        where: { status: 'AKTIF' },
        select: { id: true, name: true, fee: true },
      }),
    ]);

    // Payment status distribution
    const paymentsByStatus: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      const amt = Number(p.amount);
      if (!paymentsByStatus[p.status]) paymentsByStatus[p.status] = { count: 0, total: 0 };
      paymentsByStatus[p.status].count += 1;
      paymentsByStatus[p.status].total += amt;
    }

    // Revenue by program (only valid payments)
    const programRevenue: Record<string, { programName: string; total: number; count: number }> = {};
    for (const p of payments) {
      if (p.status !== 'VALID') continue;
      const name = p.application?.program?.name || 'Unknown';
      const amt = Number(p.amount);
      if (!programRevenue[name]) programRevenue[name] = { programName: name, total: 0, count: 0 };
      programRevenue[name].total += amt;
      programRevenue[name].count += 1;
    }

    // Monthly revenue
    const monthly: Record<string, { month: string; total: number; count: number }> = {};
    for (const p of payments) {
      if (p.status !== 'VALID') continue;
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { month: key, total: 0, count: 0 };
      monthly[key].total += Number(p.amount);
      monthly[key].count += 1;
    }

    // Commission by status
    const commissionsByStatus: Record<string, { count: number; total: number }> = {};
    for (const c of commissions) {
      if (!commissionsByStatus[c.status]) commissionsByStatus[c.status] = { count: 0, total: 0 };
      commissionsByStatus[c.status].count += 1;
      commissionsByStatus[c.status].total += Number(c.amount);
    }

    return res.json({
      success: true,
      data: {
        summary: {
          totalPayments: payments.length,
          totalRevenue: Number(totalRevenue._sum.amount || 0),
          totalValidPayments: payments.filter(p => p.status === 'VALID').length,
          totalCommissions: commissions.length,
          totalCommissionAmount: Number(totalCommissionsSum._sum.amount || 0),
          activePrograms: programs.length,
        },
        paymentsByStatus: Object.entries(paymentsByStatus).map(([status, v]) => ({
          status,
          count: v.count,
          total: v.total,
        })),
        revenueByProgram: Object.values(programRevenue).sort((a, b) => b.total - a.total),
        monthlyRevenue: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
        commissionsByStatus: Object.entries(commissionsByStatus).map(([status, v]) => ({
          status,
          count: v.count,
          total: v.total,
        })),
        recentPayments: payments.slice(0, 20).map(p => ({
          id: p.id,
          candidateName: p.candidate?.fullName || '-',
          programName: p.application?.program?.name || '-',
          amount: Number(p.amount),
          status: p.status,
          date: p.createdAt,
        })),
        recentCommissions: commissions.slice(0, 10).map(c => ({
          id: c.id,
          affiliateCode: c.affiliate?.code || '-',
          affiliateName: c.affiliate?.name || '-',
          candidateName: c.payment?.candidate?.fullName || '-',
          amount: Number(c.amount),
          status: c.status,
          date: c.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan keuangan',
    });
  }
}
