import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { catchAsync, sendSuccess } from '../utils/AppError';

export const getRewards = catchAsync(async (_req: Request, res: Response) => {
  const rewards = await prisma.reward.findMany({
    orderBy: { pointsRequired: 'asc' },
  });
  return sendSuccess(res, rewards);
});

export const createReward = catchAsync(async (req: Request, res: Response) => {
  const { name, description, image, pointsRequired, stock } = req.body;
  const reward = await prisma.reward.create({
    data: { name, description, image, pointsRequired: Number(pointsRequired), stock: stock ? Number(stock) : null },
  });
  return sendSuccess(res, reward, 'Reward berhasil dibuat', 201);
});

export const updateReward = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, description, image, pointsRequired, stock, isActive } = req.body;
  const reward = await prisma.reward.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(pointsRequired !== undefined && { pointsRequired: Number(pointsRequired) }),
      ...(stock !== undefined && { stock: stock ? Number(stock) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return sendSuccess(res, reward, 'Reward berhasil diperbarui');
});

export const deleteReward = catchAsync(async (req: Request, res: Response) => {
  await prisma.reward.delete({ where: { id: req.params.id as string } });
  return sendSuccess(res, null, 'Reward berhasil dihapus');
});

export const getMyPoints = catchAsync(async (req: Request, res: Response) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
    select: { id: true, points: true, totalPaid: true },
  });
  if (!affiliate) throw new Error('Affiliate tidak ditemukan');
  return sendSuccess(res, affiliate);
});

export const getMyRedemptions = catchAsync(async (req: Request, res: Response) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
    select: { id: true },
  });
  if (!affiliate) throw new Error('Affiliate tidak ditemukan');

  const redemptions = await prisma.rewardRedemption.findMany({
    where: { affiliateId: affiliate.id },
    include: { reward: { select: { name: true, image: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, redemptions);
});

export const redeemReward = catchAsync(async (req: Request, res: Response) => {
  const { rewardId } = req.body;
  if (!rewardId) throw new Error('Reward harus dipilih');

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!affiliate) throw new Error('Affiliate tidak ditemukan');

  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) throw new Error('Reward tidak ditemukan');
  if (!reward.isActive) throw new Error('Reward tidak aktif');
  if (reward.stock !== null && reward.stock <= 0) throw new Error('Stok reward habis');

  if (affiliate.points < reward.pointsRequired) {
    throw new Error(`Poin tidak mencukupi. Dibutuhkan ${reward.pointsRequired}, tersedia ${affiliate.points}`);
  }

  const [redemption] = await prisma.$transaction([
    prisma.rewardRedemption.create({
      data: {
        affiliateId: affiliate.id,
        rewardId: reward.id,
        pointsSpent: reward.pointsRequired,
        status: 'PENDING',
      },
    }),
    prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { points: { decrement: reward.pointsRequired } },
    }),
    ...(reward.stock !== null
      ? [prisma.reward.update({ where: { id: reward.id }, data: { stock: { decrement: 1 } } })]
      : []),
  ]);

  return sendSuccess(res, redemption, 'Penukaran reward berhasil diajukan');
});

export const getRedemptions = catchAsync(async (_req: Request, res: Response) => {
  const redemptions = await prisma.rewardRedemption.findMany({
    include: {
      affiliate: { select: { user: { select: { email: true } }, name: true, code: true } },
      reward: { select: { name: true, pointsRequired: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, redemptions);
});

export const updateRedemptionStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status, notes } = req.body;
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) throw new Error('Status tidak valid');

  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id },
  });
  if (!redemption) throw new Error('Redemption tidak ditemukan');

  const reward = await prisma.reward.findUnique({ where: { id: redemption.rewardId } });
  if (!reward) throw new Error('Reward tidak ditemukan');

  if (status === 'REJECTED' && redemption.status === 'PENDING') {
    await prisma.$transaction([
      prisma.affiliate.update({
        where: { id: redemption.affiliateId },
        data: { points: { increment: redemption.pointsSpent } },
      }),
      ...(reward.stock !== null
        ? [prisma.reward.update({ where: { id: reward.id }, data: { stock: { increment: 1 } } })]
        : []),
    ]);
  }

  const updated = await prisma.rewardRedemption.update({
    where: { id },
    data: { status, notes },
  });
  return sendSuccess(res, updated, `Redemption ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
});
