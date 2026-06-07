import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadFile } from '../config/minio';
import { processPaymentProof, validateOcrAmount } from '../services/ocrService';
import { AppError, catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { notifyPaymentUploaded, notifyPaymentVerified, notifyPaymentRejected } from '../services/notificationService';

export const uploadProof = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('File bukti pembayaran diperlukan', 400);

  const { paymentId } = req.params;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { application: { include: { program: true } } },
  });

  if (!payment) throw new AppError('Pembayaran tidak ditemukan', 404);
  if (payment.status === 'VALID') throw new AppError('Pembayaran sudah terverifikasi', 400);

  // Upload to local storage
  const objectName = `payments/${uuidv4()}-${req.file.originalname}`;
  const fileUrl = await uploadFile(objectName, req.file.buffer, req.file.mimetype);

  // Update payment with proof URL immediately, set status to MENUNGGU_VERIFIKASI
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      proofUrl: fileUrl,
      status: 'MENUNGGU_VERIFIKASI',
      uploadedAt: new Date(),
    },
  });

  // Notify admins about new payment upload
  notifyPaymentUploaded(paymentId);

  // Respond to user immediately — OCR runs in background
  res.json({
    success: true,
    data: { payment: updatedPayment },
    message: 'Bukti pembayaran berhasil diupload, OCR sedang diproses',
  });

  // Async OCR processing (fire & forget)
  processPaymentProof(req.file.buffer, req.file.mimetype).then(async (ocrResult) => {
    const amountValidation = validateOcrAmount(ocrResult.amount, Number(payment.amount));
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        ocrData: ocrResult.rawJson as any,
        ocrConfidence: ocrResult.confidence,
        bankFrom: ocrResult.bankFrom,
        bankTo: ocrResult.bankTo,
        senderName: ocrResult.senderName,
        referenceNumber: ocrResult.referenceNumber,
        transferDate: ocrResult.transferDate ? new Date(ocrResult.transferDate) : null,
      },
    });
    logger.info(`OCR completed for payment ${paymentId}: confidence=${ocrResult.confidence}, amount=${ocrResult.amount}`);
  }).catch((err) => {
    logger.error(`OCR background processing failed for payment ${paymentId}: ${err.message}`);
  });
});

export const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const { status, rejectedReason } = req.body;

  if (!['VALID', 'DITOLAK'].includes(status)) {
    throw new AppError('Status tidak valid', 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { application: { include: { program: true } } },
  });

  if (!payment) throw new AppError('Pembayaran tidak ditemukan', 404);

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: status as any,
      verifiedAt: new Date(),
      verifiedBy: req.user!.userId,
      rejectedReason: status === 'DITOLAK' ? rejectedReason : null,
    },
  });

  // Update application status
  if (status === 'VALID') {
    await prisma.application.update({
      where: { id: payment.applicationId },
      data: {
        status: 'PAID',
        statusHistory: {
          create: { status: 'PAID', notes: 'Pembayaran terverifikasi', changedBy: req.user!.userId },
        },
      },
    });

    // Check if candidate was referred by affiliate
    const candidate = await prisma.candidate.findUnique({
      where: { id: payment.candidateId },
    });

    if (candidate?.referredBy) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { code: candidate.referredBy },
      });

      if (affiliate) {
        const program = payment.application.program;
        const commissionAmount = program.commissionType === 'PERCENTAGE'
          ? Number(payment.amount) * Number(program.affiliateCommission) / 100
          : Number(program.affiliateCommission);

        await prisma.commission.create({
          data: {
            affiliateId: affiliate.id,
            paymentId: payment.id,
            amount: commissionAmount,
            status: 'PENDING',
          },
        });

        await prisma.affiliate.update({
          where: { id: affiliate.id },
          data: {
            totalPaid: { increment: 1 },
            totalCommission: { increment: commissionAmount },
            points: { increment: 1 },
          },
        });
      }
    }
  }

  // Notify candidate
  if (status === 'VALID') {
    notifyPaymentVerified(paymentId);
  } else {
    notifyPaymentRejected(paymentId, rejectedReason || '');
  }

  return sendSuccess(res, updated, `Pembayaran ${status === 'VALID' ? 'disetujui' : 'ditolak'}`);
});

export const bulkVerifyPayments = catchAsync(async (req: Request, res: Response) => {
  const { paymentIds, status, rejectedReason } = req.body;

  if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
    throw new AppError('Daftar ID pembayaran diperlukan', 400);
  }

  if (!['VALID', 'DITOLAK'].includes(status)) {
    throw new AppError('Status tidak valid', 400);
  }

  const results = [];
  let skipped = 0;
  for (const id of paymentIds) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: { application: { include: { program: true } } },
      });

      if (!payment || payment.status !== 'MENUNGGU_VERIFIKASI') {
        skipped++;
        continue;
      }

      const updated = await prisma.payment.update({
        where: { id },
        data: {
          status: status as any,
          verifiedAt: new Date(),
          verifiedBy: req.user!.userId,
          rejectedReason: status === 'DITOLAK' ? rejectedReason : null,
        },
      });

      if (status === 'VALID') {
        await prisma.application.update({
          where: { id: payment.applicationId },
          data: {
            status: 'PAID',
            statusHistory: {
              create: { status: 'PAID', notes: 'Pembayaran terverifikasi (Bulk)', changedBy: req.user!.userId },
            },
          },
        });

        const candidate = await prisma.candidate.findUnique({ where: { id: payment.candidateId } });
        if (candidate?.referredBy) {
          const affiliate = await prisma.affiliate.findUnique({ where: { code: candidate.referredBy } });
          if (affiliate) {
            const program = payment.application.program;
            const commissionAmount = program.commissionType === 'PERCENTAGE'
              ? Number(payment.amount) * Number(program.affiliateCommission) / 100
              : Number(program.affiliateCommission);

            await prisma.commission.create({
              data: {
                affiliateId: affiliate.id,
                paymentId: payment.id,
                amount: commissionAmount,
                status: 'PENDING',
              },
            });

            await prisma.affiliate.update({
              where: { id: affiliate.id },
              data: {
                totalPaid: { increment: 1 },
                totalCommission: { increment: commissionAmount },
              },
            });
          }
        }
      }
      // Notify candidate
      if (status === 'VALID') {
        notifyPaymentVerified(id);
      } else {
        notifyPaymentRejected(id, rejectedReason || '');
      }

      results.push(id);
    } catch (err) {
      logger.error(`Error verifying payment ${id}:`, err);
    }
  }

  return sendSuccess(res, { processedCount: results.length, skipped }, `Berhasil memproses ${results.length} dari ${paymentIds.length} pembayaran`);
});

export const listPayments = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};
  if (status) where.status = String(status);
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate) + 'T23:59:59.999Z');
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        candidate: { select: { fullName: true, phone: true } },
        application: { include: { program: { select: { name: true } } } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  return sendPaginated(res, payments, total, Number(page), Number(limit));
});

export const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const candidate = await prisma.candidate.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!candidate) throw new AppError('Profil tidak ditemukan', 404);

  const payments = await prisma.payment.findMany({
    where: { candidateId: candidate.id },
    include: {
      application: { include: { program: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, payments);
});

export const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.paymentId },
    include: {
      application: {
        include: {
          program: true,
        },
      },
      candidate: {
        include: {
          user: { select: { email: true } },
          affiliate: {
            include: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (!payment) throw new AppError('Pembayaran tidak ditemukan', 404);

  const invDate = payment.createdAt;
  const invNum = `INV/${invDate.getFullYear()}${String(invDate.getMonth() + 1).padStart(2, '0')}${String(invDate.getDate()).padStart(2, '0')}/${payment.id.slice(0, 6).toUpperCase()}`;

  return sendSuccess(res, {
    invoiceNumber: invNum,
    invoiceDate: payment.createdAt,
    payment,
    candidate: payment.candidate,
    program: payment.application?.program,
    application: payment.application,
  });
});

export async function autoVerifyCore(verifiedBy: string): Promise<{ verified: number; skipped: number; results: { id: string; status: string; reason?: string }[] }> {
  const pendingPayments = await prisma.payment.findMany({
    where: { status: 'MENUNGGU_VERIFIKASI' },
    include: {
      application: { include: { program: true } },
      candidate: { select: { referredBy: true } },
    },
  });

  let verified = 0;
  let skipped = 0;
  const results: { id: string; status: string; reason?: string }[] = [];

  for (const payment of pendingPayments) {
    try {
      const program = payment.application?.program;
      if (!program) {
        skipped++;
        results.push({ id: payment.id, status: 'SKIPPED', reason: 'Program tidak ditemukan' });
        continue;
      }

      const ocrAmount = payment.ocrData && typeof payment.ocrData === 'object'
        ? Number((payment.ocrData as any).amount || 0)
        : null;

      if (!ocrAmount || ocrAmount <= 0) {
        skipped++;
        results.push({ id: payment.id, status: 'SKIPPED', reason: 'Data OCR tidak tersedia' });
        continue;
      }

      const requiredAmount = Number(payment.amount);

      if (ocrAmount < requiredAmount) {
        skipped++;
        results.push({ id: payment.id, status: 'SKIPPED', reason: `Nilai transfer ${ocrAmount} kurang dari ${requiredAmount}` });
        continue;
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'VALID', verifiedAt: new Date(), verifiedBy },
      });

      await prisma.application.update({
        where: { id: payment.applicationId },
        data: {
          status: 'PAID',
          statusHistory: {
            create: { status: 'PAID', notes: 'Pembayaran auto-verified via OCR', changedBy: verifiedBy },
          },
        },
      });

      if (payment.candidate?.referredBy) {
        const affiliate = await prisma.affiliate.findUnique({
          where: { code: payment.candidate.referredBy },
        });
        if (affiliate) {
          const commissionAmount = program.commissionType === 'PERCENTAGE'
            ? Number(payment.amount) * Number(program.affiliateCommission) / 100
            : Number(program.affiliateCommission);

          await prisma.commission.create({
            data: { affiliateId: affiliate.id, paymentId: payment.id, amount: commissionAmount, status: 'PENDING' },
          });
          await prisma.affiliate.update({
            where: { id: affiliate.id },
            data: { totalPaid: { increment: 1 }, totalCommission: { increment: commissionAmount } },
          });
        }
      }

      notifyPaymentVerified(payment.id);

      verified++;
      results.push({ id: payment.id, status: 'VALID' });
    } catch (err) {
      skipped++;
      results.push({ id: payment.id, status: 'ERROR', reason: String(err) });
    }
  }

  return { verified, skipped, results };
}

export const autoVerifyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await autoVerifyCore(req.user!.userId);
  return sendSuccess(res, result, `${result.verified} pembayaran berhasil auto-verified`);
});

export const getPendingPaymentCount = catchAsync(async (req: Request, res: Response) => {
  const count = await prisma.payment.count({ where: { status: 'MENUNGGU_VERIFIKASI' } });
  return sendSuccess(res, { count });
});
