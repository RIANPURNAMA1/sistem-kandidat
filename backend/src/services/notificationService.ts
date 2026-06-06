import { prisma } from '../config/database';
import { sendEmail, paymentUploadedTemplate, paymentVerifiedTemplate, paymentRejectedTemplate } from './emailService';
import { logger } from '../utils/logger';

async function getNotificationSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany({
    where: { group: 'NOTIFICATION' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return map;
}

function isEmailEnabled(map: Record<string, string>, key: string): boolean {
  return map[key] !== 'false';
}

export async function notifyPaymentUploaded(paymentId: string) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        candidate: { include: { user: { select: { email: true } } } },
        application: { include: { program: true } },
      },
    });
    if (!payment) return;

    const notifSettings = await getNotificationSettings();

    // Create in-app notifications for all admin/finance users
    const adminUsers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'FINANCE'] }, isActive: true },
      select: { id: true },
    });

    const candidateName = payment.candidate?.fullName || 'Kandidat';
    const programName = payment.application?.program?.name || 'Program';
    const paymentAmount = Number(payment.amount).toLocaleString('id-ID');

    await prisma.notification.createMany({
      data: adminUsers.map(u => ({
        userId: u.id,
        title: 'Bukti Pembayaran Baru',
        message: `${candidateName} mengupload bukti pembayaran untuk ${programName} sebesar Rp ${paymentAmount}`,
        type: 'PAYMENT_UPLOADED',
        data: { paymentId, candidateName, programName, amount: paymentAmount },
      })),
    });

    // Send email notification to admins if enabled
    if (isEmailEnabled(notifSettings, 'email_payment_uploaded')) {
      const adminEmails = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'FINANCE'] }, isActive: true },
        select: { email: true },
      });
      const emailPromises = adminEmails.map(admin =>
        sendEmail(admin.email, `Bukti Pembayaran Baru - ${candidateName}`, paymentUploadedTemplate(candidateName, programName, paymentAmount))
      );
      await Promise.allSettled(emailPromises);
    }

    logger.info(`Notification sent for payment upload: ${paymentId}`);
  } catch (error) {
    logger.error('Error in notifyPaymentUploaded:', error);
  }
}

export async function notifyPaymentVerified(paymentId: string) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        candidate: { include: { user: { select: { email: true, id: true } } } },
        application: { include: { program: true } },
      },
    });
    if (!payment || !payment.candidate?.userId) return;

    const notifSettings = await getNotificationSettings();
    const candidateName = payment.candidate.fullName;
    const programName = payment.application?.program?.name || 'Program';

    // In-app notification for candidate
    await prisma.notification.create({
      data: {
        userId: payment.candidate.userId,
        title: 'Pembayaran Diverifikasi',
        message: `Pembayaran Anda untuk ${programName} telah diverifikasi. Status: LUNAS`,
        type: 'PAYMENT_VERIFIED',
        data: { paymentId, status: 'VALID' },
      },
    });

    // Email to candidate if enabled
    if (isEmailEnabled(notifSettings, 'email_payment_verified')) {
      await sendEmail(
        payment.candidate.user.email,
        `Pembayaran Diverifikasi - ${programName}`,
        paymentVerifiedTemplate(candidateName, programName)
      );
    }

    logger.info(`Notification sent for payment verified: ${paymentId}`);
  } catch (error) {
    logger.error('Error in notifyPaymentVerified:', error);
  }
}

export async function notifyPaymentRejected(paymentId: string, reason: string) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        candidate: { include: { user: { select: { email: true, id: true } } } },
        application: { include: { program: true } },
      },
    });
    if (!payment || !payment.candidate?.userId) return;

    const notifSettings = await getNotificationSettings();
    const candidateName = payment.candidate.fullName;
    const programName = payment.application?.program?.name || 'Program';

    // In-app notification for candidate
    await prisma.notification.create({
      data: {
        userId: payment.candidate.userId,
        title: 'Pembayaran Ditolak',
        message: `Pembayaran Anda untuk ${programName} ditolak. ${reason ? `Alasan: ${reason}` : ''}`,
        type: 'PAYMENT_REJECTED',
        data: { paymentId, status: 'DITOLAK', reason },
      },
    });

    // Email to candidate if enabled
    if (isEmailEnabled(notifSettings, 'email_payment_rejected')) {
      await sendEmail(
        payment.candidate.user.email,
        `Pembayaran Ditolak - ${programName}`,
        paymentRejectedTemplate(candidateName, programName, reason)
      );
    }

    logger.info(`Notification sent for payment rejected: ${paymentId}`);
  } catch (error) {
    logger.error('Error in notifyPaymentRejected:', error);
  }
}
