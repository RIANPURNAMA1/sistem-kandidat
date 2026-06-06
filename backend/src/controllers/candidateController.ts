import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';

export const createProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const existing = await prisma.candidate.findUnique({ where: { userId } });
  if (existing) throw new AppError('Profil sudah ada', 409);

  const candidate = await prisma.candidate.create({
    data: { ...req.body, userId },
  });

  return sendSuccess(res, candidate, 'Profil berhasil dibuat', 201);
});

export const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const candidate = await prisma.candidate.findUnique({
    where: { userId: req.user!.userId },
    include: {
      documents: true,
      applications: {
        include: {
          program: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  });

  if (!candidate) throw new AppError('Profil tidak ditemukan', 404);
  return sendSuccess(res, candidate);
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const candidate = await prisma.candidate.update({
    where: { userId: req.user!.userId },
    data: req.body,
  });
  return sendSuccess(res, candidate, 'Profil berhasil diperbarui');
});

// Admin: list all candidates
export const listCandidates = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, status, startDate, endDate } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (search) {
    where.OR = [
      { fullName: { contains: String(search) } },
      { nik: { contains: String(search) } },
      { phone: { contains: String(search) } },
    ];
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate) + 'T23:59:59.999Z');
  }
  if (status === 'active') where.user = { isActive: true };
  else if (status === 'inactive') where.user = { isActive: false };

  // Hanya tampilkan kandidat yang belum memiliki pembayaran
  // atau semua pembayarannya sudah VALID (terverifikasi)
  where.payments = {
    every: { status: 'VALID' },
  };

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        user: { select: { email: true, isActive: true } },
        applications: {
          include: {
            program: { select: { name: true } },
            payment: { select: { id: true, amount: true, status: true } },
          },
        },
        affiliate: { select: { id: true, code: true, user: { select: { email: true } } } },
        _count: { select: { documents: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.candidate.count({ where }),
  ]);

  return sendPaginated(res, candidates, total, Number(page), Number(limit));
});

export const getCandidateById = catchAsync(async (req: Request, res: Response) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, isActive: true, lastLoginAt: true } },
      affiliate: { select: { id: true, code: true, user: { select: { email: true } } } },
      documents: true,
      applications: {
        include: {
          program: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });

  if (!candidate) throw new AppError('Kandidat tidak ditemukan', 404);
  return sendSuccess(res, candidate);
});
