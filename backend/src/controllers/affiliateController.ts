import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';

function generateAffiliateCode(userId: string): string {
  const prefix = 'AFF';
  const suffix = userId.slice(0, 6).toUpperCase().replace(/-/g, '');
  return `${prefix}${suffix}`;
}

export const registerAffiliate = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const existing = await prisma.affiliate.findUnique({ where: { userId } });
  if (existing) throw new AppError('Sudah terdaftar sebagai affiliate', 409);

  const code = generateAffiliateCode(userId);
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const referralLink = `${baseUrl}/register?ref=${code}`;

  const qrCodeData = await QRCode.toDataURL(referralLink);

  const affiliate = await prisma.affiliate.create({
    data: {
      userId,
      code,
      referralLink,
      qrCode: qrCodeData,
      bankName: req.body.bankName,
      bankAccount: req.body.bankAccount,
      bankHolder: req.body.bankHolder,
    },
  });

  // Update user role to AFFILIATE
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'AFFILIATE' },
  });

  return sendSuccess(res, affiliate, 'Registrasi affiliate berhasil', 201);
});

export const getMyAffiliate = catchAsync(async (req: Request, res: Response) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
    include: {
      commissions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      withdrawals: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      _count: {
        select: { referrals: true, commissions: true, clickLogs: true },
      },
    },
  });

  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);
  return sendSuccess(res, affiliate);
});

export const trackClick = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.params;

  const affiliate = await prisma.affiliate.findUnique({ where: { code } });
  if (!affiliate) throw new AppError('Kode affiliate tidak valid', 404);

  await Promise.all([
    prisma.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
      },
    }),
    prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { totalClicks: { increment: 1 } },
    }),
  ]);

  return sendSuccess(res, { code }, 'Click tercatat');
});

export const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
  const { sortBy = 'totalCommission' } = req.query;

  const affiliates = await prisma.affiliate.findMany({
    where: { isActive: true },
    include: {
      user: { select: { email: true } },
    },
    orderBy: { [String(sortBy)]: 'desc' },
    take: 50,
  });

  const leaderboard = affiliates.map((a, index) => ({
    rank: index + 1,
    code: a.code,
    name: a.name,
    email: a.user?.email,
    totalClicks: a.totalClicks,
    totalRegistrations: a.totalRegistrations,
    totalPaid: a.totalPaid,
    totalCommission: a.totalCommission,
  }));

  return sendSuccess(res, leaderboard);
});

export const requestWithdrawal = catchAsync(async (req: Request, res: Response) => {
  const { amount, bankName, bankAccount, bankHolder } = req.body;

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
  });

  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  // Check pending commission balance
  const approvedCommissions = await prisma.commission.aggregate({
    where: { affiliateId: affiliate.id, status: 'APPROVED' },
    _sum: { amount: true },
  });

  const availableBalance = Number(approvedCommissions._sum.amount || 0);
  if (amount > availableBalance) {
    throw new AppError(`Saldo tidak cukup. Saldo tersedia: ${availableBalance}`, 400);
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      affiliateId: affiliate.id,
      amount,
      bankName,
      bankAccount,
      bankHolder,
      status: 'PENDING',
    },
  });

  return sendSuccess(res, withdrawal, 'Pengajuan pencairan berhasil', 201);
});

export const listAffiliates = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};
  if (search) where.code = { contains: String(search) };

  const [affiliates, total] = await Promise.all([
    prisma.affiliate.findMany({
      where,
      include: {
        user: { select: { email: true, isActive: true } },
        _count: { select: { referrals: true, commissions: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { totalCommission: 'desc' },
    }),
    prisma.affiliate.count({ where }),
  ]);

  return sendPaginated(res, affiliates, total, Number(page), Number(limit));
});

export const approveCommission = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const commission = await prisma.commission.update({
    where: { id },
    data: {
      status: status as any,
      approvedAt: status === 'APPROVED' ? new Date() : null,
      approvedBy: req.user!.userId,
    },
  });

  return sendSuccess(res, commission, `Komisi ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
});

export const getMyPrograms = catchAsync(async (req: Request, res: Response) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  const programs = await prisma.affiliateProgram.findMany({
    where: { affiliateId: affiliate.id },
    include: { program: true },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = programs.map(p => {
    const prog = p as typeof p & { program: any }
    return {
      ...prog.program,
      affiliateProgramId: p.affiliateId + '-' + p.programId,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${affiliate.code}&programId=${p.programId}`,
    }
  })

  return sendSuccess(res, mapped);
});

export const addProgram = catchAsync(async (req: Request, res: Response) => {
  const programId = req.body.programId as string;
  if (!programId) throw new AppError('Program ID diperlukan', 400);

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new AppError('Program tidak ditemukan', 404);

  const existing = await prisma.affiliateProgram.findUnique({
    where: { affiliateId_programId: { affiliateId: affiliate.id, programId } },
  });
  if (existing) throw new AppError('Program sudah ditambahkan', 409);

  await prisma.affiliateProgram.create({
    data: { affiliateId: affiliate.id, programId },
  });

  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${affiliate.code}&programId=${programId}`;
  return sendSuccess(res, { program, referralLink: link }, 'Program berhasil ditambahkan');
});

export const removeProgram = catchAsync(async (req: Request, res: Response) => {
  const programId = req.params.programId as string;

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  await prisma.affiliateProgram.delete({
    where: { affiliateId_programId: { affiliateId: affiliate.id, programId } },
  });

  return sendSuccess(res, null, 'Program berhasil dihapus');
});

export const adminGetAffiliatePrograms = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  const programs = await prisma.affiliateProgram.findMany({
    where: { affiliateId: id },
    include: { program: true },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = programs.map(p => {
    const prog = p as typeof p & { program: any }
    return {
      ...prog.program,
      affiliateProgramId: p.affiliateId + '-' + p.programId,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${affiliate.code}&programId=${p.programId}`,
    }
  })

  return sendSuccess(res, mapped);
});

export const adminAddProgram = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { programId } = req.body;
  if (!programId) throw new AppError('Program ID diperlukan', 400);

  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new AppError('Program tidak ditemukan', 404);

  const existing = await prisma.affiliateProgram.findUnique({
    where: { affiliateId_programId: { affiliateId: id, programId } },
  });
  if (existing) throw new AppError('Program sudah ditambahkan', 409);

  await prisma.affiliateProgram.create({
    data: { affiliateId: id, programId },
  });

  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${affiliate.code}&programId=${programId}`;
  return sendSuccess(res, { program, referralLink: link }, 'Program berhasil ditambahkan');
});

export const adminRemoveProgram = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const programId = req.params.programId as string;

  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) throw new AppError('Data affiliate tidak ditemukan', 404);

  await prisma.affiliateProgram.delete({
    where: { affiliateId_programId: { affiliateId: id, programId } },
  });

  return sendSuccess(res, null, 'Program berhasil dihapus');
});
