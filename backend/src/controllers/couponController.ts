import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';

export const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const { code, description, discountType, discountValue, programId, maxUses, minPayment, maxDiscount, expiresAt } = req.body;

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new AppError('Kode kupon sudah ada', 409);

  const coupon = await prisma.coupon.create({
    data: {
      code: code.toUpperCase(),
      description,
      discountType: discountType || 'PERCENTAGE',
      discountValue: Number(discountValue),
      programId: programId || null,
      maxUses: maxUses ? Number(maxUses) : 0,
      minPayment: minPayment ? Number(minPayment) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return sendSuccess(res, coupon, 'Kupon berhasil dibuat', 201);
});

export const listCoupons = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, isActive } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (search) where.code = { contains: String(search) };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { program: { select: { id: true, name: true } } },
    }),
    prisma.coupon.count({ where }),
  ]);

  return sendPaginated(res, coupons, total, Number(page), Number(limit));
});

export const getCouponById = catchAsync(async (req: Request, res: Response) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: req.params.id },
    include: { program: { select: { id: true, name: true } } },
  });
  if (!coupon) throw new AppError('Kupon tidak ditemukan', 404);
  return sendSuccess(res, coupon);
});

export const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const { code, description, discountType, discountValue, programId, maxUses, minPayment, maxDiscount, expiresAt, isActive } = req.body;

  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Kupon tidak ditemukan', 404);

  if (code && code !== existing.code) {
    const dup = await prisma.coupon.findUnique({ where: { code } });
    if (dup) throw new AppError('Kode kupon sudah digunakan', 409);
  }

  const data: any = {};
  if (code) data.code = code.toUpperCase();
  if (description !== undefined) data.description = description;
  if (discountType) data.discountType = discountType;
  if (discountValue !== undefined) data.discountValue = Number(discountValue);
  if (programId !== undefined) data.programId = programId || null;
  if (maxUses !== undefined) data.maxUses = Number(maxUses);
  if (minPayment !== undefined) data.minPayment = Number(minPayment);
  if (maxDiscount !== undefined) data.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (isActive !== undefined) data.isActive = isActive;

  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data,
  });

  return sendSuccess(res, coupon, 'Kupon berhasil diperbarui');
});

export const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  await prisma.coupon.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  return sendSuccess(res, null, 'Kupon berhasil dinonaktifkan');
});

export const validateCoupon = catchAsync(async (req: Request, res: Response) => {
  const { code, programId } = req.query;

  if (!code) throw new AppError('Kode kupon diperlukan', 400);

  const coupon = await prisma.coupon.findUnique({
    where: { code: String(code) },
  });

  if (!coupon) throw new AppError('Kode kupon tidak valid', 404);
  if (!coupon.isActive) throw new AppError('Kupon sudah tidak aktif', 400);

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw new AppError('Kupon sudah kadaluarsa', 400);
  }

  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Kuota kupon sudah habis', 400);
  }

  if (coupon.programId && programId && coupon.programId !== String(programId)) {
    throw new AppError('Kupon tidak berlaku untuk program ini', 400);
  }

  return sendSuccess(res, {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minPayment: coupon.minPayment,
    maxDiscount: coupon.maxDiscount,
  });
});

export const calculateDiscount = catchAsync(async (req: Request, res: Response) => {
  const { code, programId, amount } = req.body;

  if (!code) throw new AppError('Kode kupon diperlukan', 400);
  if (!amount) throw new AppError('Jumlah pembayaran diperlukan', 400);

  const coupon = await prisma.coupon.findUnique({
    where: { code: String(code) },
  });

  if (!coupon) throw new AppError('Kode kupon tidak valid', 404);
  if (!coupon.isActive) throw new AppError('Kupon sudah tidak aktif', 400);

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw new AppError('Kupon sudah kadaluarsa', 400);
  }

  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Kuota kupon sudah habis', 400);
  }

  if (coupon.programId && coupon.programId !== String(programId)) {
    throw new AppError('Kupon tidak berlaku untuk program ini', 400);
  }

  if (Number(amount) < Number(coupon.minPayment)) {
    throw new AppError(`Minimal pembayaran Rp ${Number(coupon.minPayment).toLocaleString('id-ID')} untuk kupon ini`, 400);
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = (Number(amount) * Number(coupon.discountValue)) / 100;
    if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
      discountAmount = Number(coupon.maxDiscount);
    }
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  const finalAmount = Math.max(0, Number(amount) - discountAmount);

  return sendSuccess(res, {
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    originalAmount: Number(amount),
    finalAmount,
  });
});
