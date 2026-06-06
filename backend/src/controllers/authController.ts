import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { generateToken } from '../middlewares/auth';
import { AppError, catchAsync, sendSuccess } from '../utils/AppError';
import { processPaymentProof } from '../services/ocrService';
import { uploadFile } from '../config/minio';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export const register = catchAsync(async (req: Request, res: Response) => {
  const { email, password, role = 'KANDIDAT', refCode } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email sudah terdaftar', 409);

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashed, role: role as any },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  // Track affiliate click-to-register if ref code exists
  if (refCode && role === 'KANDIDAT') {
    await prisma.affiliate.update({
      where: { code: refCode },
      data: { totalRegistrations: { increment: 1 } },
    }).catch(() => null);
  }

  // Create candidate profile if role is KANDIDAT
  if (role === 'KANDIDAT') {
    await prisma.candidate.create({
      data: {
        userId: user.id,
        nik: `REG-${user.id.slice(0, 8).toUpperCase()}`,
        fullName: email.split('@')[0],
        birthPlace: '-',
        birthDate: new Date(),
        gender: 'LAKI_LAKI',
        maritalStatus: 'BELUM_MENIKAH',
        address: '-',
        kecamatan: '-',
        kabupaten: '-',
        provinsi: '-',
        lastEducation: '-',
        phone: '-',
        referredBy: refCode || null,
      },
    });
  }

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  return sendSuccess(res, { user, token }, 'Registrasi berhasil', 201);
});

export const registerAffiliate = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fullName, phone, programIds } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email sudah terdaftar', 409);

  const hashed = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, password: hashed, role: 'AFFILIATE' },
    });

    const code = `AFF${user.id.slice(0, 6).toUpperCase().replace(/-/g, '')}`;

    const affiliate = await tx.affiliate.create({
      data: {
        userId: user.id,
        code,
        name: fullName,
      },
    });

    // Create affiliate-program relations if programIds provided
    if (programIds && Array.isArray(programIds) && programIds.length > 0) {
      const validPrograms = await tx.program.findMany({
        where: { id: { in: programIds }, status: 'AKTIF' },
        select: { id: true },
      });
      if (validPrograms.length > 0) {
        await tx.affiliateProgram.createMany({
          data: validPrograms.map(p => ({
            affiliateId: affiliate.id,
            programId: p.id,
          })),
        });
      }
    }

    return { user, affiliate };
  });

  const token = generateToken({ userId: result.user.id, email: result.user.email, role: result.user.role });

  const affiliatePrograms = programIds && Array.isArray(programIds) && programIds.length > 0
    ? await prisma.affiliateProgram.findMany({
        where: { affiliateId: result.affiliate.id },
        include: { program: true },
      })
    : [];

  return sendSuccess(res, {
    user: { id: result.user.id, email: result.user.email, role: result.user.role },
    affiliate: result.affiliate,
    token,
    programs: affiliatePrograms.map(ap => ({
      ...ap.program,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${result.affiliate.code}&programId=${ap.programId}`,
    })),
  }, 'Registrasi affiliate berhasil', 201);
});

export const registerWithPayment = catchAsync(async (req: Request, res: Response) => {
  const { email, password, refCode, programId, couponCode } = req.body;

  if (!req.file) throw new AppError('Bukti pembayaran diperlukan', 400);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email sudah terdaftar', 409);

  const hashed = await bcrypt.hash(password, 12);

  // Process OCR
  const ocrResult = await processPaymentProof(req.file.buffer, req.file.mimetype);

  // Upload file to local storage
  const objectName = `payments/${uuidv4()}-${req.file.originalname}`;
  let fileUrl = '';
  try {
    fileUrl = await uploadFile(objectName, req.file.buffer, req.file.mimetype);
  } catch (error) {
    logger.error('Storage upload error:', error);
    throw new AppError('Gagal mengunggah bukti pembayaran. Pastikan server memiliki izin tulis pada folder upload.', 500);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Verify refCode if provided
    let validRefCode = null;
    if (refCode) {
      const affiliate = await tx.affiliate.findUnique({ where: { code: refCode } });
      if (affiliate) {
        validRefCode = refCode;
        await tx.affiliate.update({
          where: { code: refCode },
          data: { totalRegistrations: { increment: 1 } },
        });
      }
    }

    const user = await tx.user.create({
      data: { email, password: hashed, role: 'KANDIDAT' },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    // Create minimal candidate
    const candidate = await tx.candidate.create({
      data: {
        userId: user.id,
        nik: `REG-${user.id.slice(0, 8).toUpperCase()}`,
        fullName: email.split('@')[0],
        birthPlace: '-',
        birthDate: new Date(),
        gender: 'LAKI_LAKI',
        maritalStatus: 'BELUM_MENIKAH',
        address: '-',
        kecamatan: '-',
        kabupaten: '-',
        provinsi: '-',
        lastEducation: '-',
        phone: '-',
        referredBy: validRefCode,
      },
    });

    // Get registration program
    let regProgram;
    if (programId) {
      regProgram = await tx.program.findFirst({ where: { id: programId, status: 'AKTIF' } });
      if (!regProgram) throw new AppError('Program yang dipilih tidak tersedia', 400);
    } else {
      regProgram = await tx.program.findFirst({ where: { slug: 'biaya-pendaftaran' } });
      if (!regProgram) {
        regProgram = await tx.program.findFirst({
          where: { status: 'AKTIF' },
          orderBy: { createdAt: 'asc' },
        });
      }
      if (!regProgram) throw new AppError('Tidak ada program tersedia', 400);
    }

    // Validate coupon if provided
    let discountAmount = 0;
    let finalAmount = Number(regProgram.fee);
    let validCouponCode = null;
    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });

      if (!coupon) throw new AppError('Kode kupon tidak valid', 400);
      if (!coupon.isActive) throw new AppError('Kupon sudah tidak aktif', 400);
      if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new AppError('Kupon sudah kadaluarsa', 400);
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new AppError('Kuota kupon sudah habis', 400);
      if (coupon.programId && coupon.programId !== regProgram.id) throw new AppError('Kupon tidak berlaku untuk program ini', 400);
      if (Number(regProgram.fee) < Number(coupon.minPayment)) {
        throw new AppError(`Minimal pembayaran Rp ${Number(coupon.minPayment).toLocaleString('id-ID')} untuk kupon ini`, 400);
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (Number(regProgram.fee) * Number(coupon.discountValue)) / 100;
        if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
          discountAmount = Number(coupon.maxDiscount);
        }
      } else {
        discountAmount = Number(coupon.discountValue);
      }

      finalAmount = Math.max(0, Number(regProgram.fee) - discountAmount);
      validCouponCode = coupon.code;

      // Increment coupon usage
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Create application
    const application = await tx.application.create({
      data: {
        candidateId: candidate.id,
        programId: regProgram.id,
        status: 'SUBMITTED',
        statusHistory: {
          create: { status: 'SUBMITTED', notes: 'Pendaftaran dengan pembayaran' },
        },
      },
    });

    // Create payment record
    const payment = await tx.payment.create({
      data: {
        applicationId: application.id,
        candidateId: candidate.id,
        amount: finalAmount,
        originalAmount: validCouponCode ? Number(regProgram.fee) : null,
        discountAmount: validCouponCode ? discountAmount : 0,
        couponCode: validCouponCode,
        status: 'MENUNGGU_VERIFIKASI',
        proofUrl: fileUrl,
        uploadedAt: new Date(),
        ocrData: ocrResult.rawJson as any,
        ocrConfidence: ocrResult.confidence,
        bankFrom: ocrResult.bankFrom,
        bankTo: ocrResult.bankTo,
        senderName: ocrResult.senderName,
        receiverName: ocrResult.receiverName,
        referenceNumber: ocrResult.referenceNumber,
        transferDate: ocrResult.transferDate ? new Date(ocrResult.transferDate) : null,
      },
    });

    return { user, candidate, application, payment, regProgram, discountAmount };
  });

  const { user, payment, regProgram, discountAmount } = result;
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  return sendSuccess(res, {
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    token,
    payment: {
      id: payment.id,
      amount: payment.amount,
      originalAmount: payment.originalAmount,
      discountAmount: payment.discountAmount,
      couponCode: payment.couponCode,
      status: payment.status,
      program: regProgram.name,
    },
    ocr: {
      senderName: ocrResult.senderName,
      receiverName: ocrResult.receiverName,
      amount: ocrResult.amount,
      bankFrom: ocrResult.bankFrom,
      bankTo: ocrResult.bankTo,
      referenceNumber: ocrResult.referenceNumber,
      transferDate: ocrResult.transferDate,
      confidence: ocrResult.confidence,
    },
  }, 'Registrasi dan pembayaran berhasil', 201);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AppError('Email atau password salah', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Email atau password salah', 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  return sendSuccess(res, {
    user: { id: user.id, email: user.email, role: user.role },
    token,
  }, 'Login berhasil');
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true },
  });

  if (!user) throw new AppError('User tidak ditemukan', 404);
  return sendSuccess(res, user);
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError('User tidak ditemukan', 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Password saat ini salah', 400);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return sendSuccess(res, null, 'Password berhasil diubah');
});
