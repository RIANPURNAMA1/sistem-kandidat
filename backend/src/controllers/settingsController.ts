import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess } from '../utils/AppError';
import { sendEmail } from '../services/emailService';
import { getSenderStatus, startSender, stopSender, sendWaMessage } from '../services/waService';

// Settings
export const getSettings = catchAsync(async (req: Request, res: Response) => {
  const { group } = req.query;
  const where: any = group ? { group: String(group) } : {};
  const settings = await prisma.setting.findMany({ where });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return sendSuccess(res, map);
});

export const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value, group: 'GENERAL' },
        update: { value },
      })
    )
  );
  return sendSuccess(res, null, 'Pengaturan berhasil disimpan');
});

// Email Settings
export const getEmailSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { group: { in: ['EMAIL', 'NOTIFICATION'] } },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return sendSuccess(res, map);
});

export const updateEmailSettings = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  const emailKeys = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from'];
  const notifKeys = ['email_payment_uploaded', 'email_payment_verified', 'email_payment_rejected'];

  await Promise.all(
    Object.entries(updates).map(([key, value]) => {
      const group = emailKeys.includes(key) ? 'EMAIL' : 'NOTIFICATION';
      return prisma.setting.upsert({
        where: { key },
        create: { key, value, group },
        update: { value },
      });
    })
  );
  return sendSuccess(res, null, 'Pengaturan email berhasil disimpan');
});

export const sendTestEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new Error('Email tujuan diperlukan');

  const sent = await sendEmail(
    email,
    'Test Email - Mendunia.id',
    '<h2>Test Email</h2><p>Email ini adalah percobaan dari pengaturan email Mendunia.id.</p><p>Jika Anda menerima ini, konfigurasi SMTP berhasil! ✅</p>'
  );

  if (!sent) throw new Error('Gagal mengirim email test. Periksa konfigurasi SMTP.');
  return sendSuccess(res, null, 'Email test berhasil dikirim');
});

// Banners
export const getBanners = catchAsync(async (_req: Request, res: Response) => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return sendSuccess(res, banners);
});

export const createBanner = catchAsync(async (req: Request, res: Response) => {
  const banner = await prisma.banner.create({ data: req.body });
  return sendSuccess(res, banner, 'Banner berhasil dibuat', 201);
});

export const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const banner = await prisma.banner.update({ where: { id: String(req.params.id) }, data: req.body });
  return sendSuccess(res, banner, 'Banner berhasil diperbarui');
});

export const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  await prisma.banner.delete({ where: { id: String(req.params.id) } });
  return sendSuccess(res, null, 'Banner berhasil dihapus');
});

// Testimonials
export const getTestimonials = catchAsync(async (_req: Request, res: Response) => {
  const items = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return sendSuccess(res, items);
});

export const createTestimonial = catchAsync(async (req: Request, res: Response) => {
  const item = await prisma.testimonial.create({ data: req.body });
  return sendSuccess(res, item, 'Testimoni berhasil dibuat', 201);
});

export const updateTestimonial = catchAsync(async (req: Request, res: Response) => {
  const item = await prisma.testimonial.update({ where: { id: String(req.params.id) }, data: req.body });
  return sendSuccess(res, item, 'Testimoni berhasil diperbarui');
});

// FAQs
export const getFAQs = catchAsync(async (_req: Request, res: Response) => {
  const faqs = await prisma.fAQ.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return sendSuccess(res, faqs);
});

export const createFAQ = catchAsync(async (req: Request, res: Response) => {
  const faq = await prisma.fAQ.create({ data: req.body });
  return sendSuccess(res, faq, 'FAQ berhasil dibuat', 201);
});

export const updateFAQ = catchAsync(async (req: Request, res: Response) => {
  const faq = await prisma.fAQ.update({ where: { id: String(req.params.id) }, data: req.body });
  return sendSuccess(res, faq, 'FAQ berhasil diperbarui');
});

// Notifications
export const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.userId, isRead: false },
  });
  return sendSuccess(res, { notifications, unreadCount });
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  return sendSuccess(res, null, 'Notifikasi ditandai telah dibaca');
});

// Audit logs
export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { email: true, role: true } } },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);
  return res.json({ success: true, data: logs, pagination: { total, page, limit, totalPages: Math.ceil(total / Number(limit)) } });
});

// Program Categories
export const getCategories = catchAsync(async (_req: Request, res: Response) => {
  const cats = await prisma.programCategory.findMany({
    include: { _count: { select: { programs: true } } },
    orderBy: { name: 'asc' },
  });
  return sendSuccess(res, cats);
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cat = await prisma.programCategory.create({ data: { ...req.body, slug } });
  return sendSuccess(res, cat, 'Kategori berhasil dibuat', 201);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const cat = await prisma.programCategory.update({ where: { id: String(req.params.id) }, data: req.body });
  return sendSuccess(res, cat, 'Kategori berhasil diperbarui');
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const cat = await prisma.programCategory.findUnique({
    where: { id: String(req.params.id) },
    include: { _count: { select: { programs: true } } },
  });
  if (!cat) throw new AppError('Kategori tidak ditemukan', 404);
  if (cat._count.programs > 0) {
    throw new AppError('Kategori tidak bisa dihapus karena masih memiliki program', 400);
  }
  await prisma.programCategory.delete({ where: { id: String(req.params.id) } });
  return sendSuccess(res, null, 'Kategori berhasil dihapus');
});

// Payment Settings
const PAYMENT_KEYS = ['bank_name', 'bank_account', 'bank_holder'];

export const getPaymentSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { group: 'PAYMENT' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return sendSuccess(res, map);
});

export const updatePaymentSettings = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) => {
      if (!PAYMENT_KEYS.includes(key)) return Promise.resolve();
      return prisma.setting.upsert({
        where: { key },
        create: { key, value, group: 'PAYMENT' },
        update: { value },
      });
    })
  );
  return sendSuccess(res, null, 'Pengaturan rekening berhasil disimpan');
});

// Affiliate Settings
const AFFILIATE_KEYS = ['affiliate_min_withdrawal', 'affiliate_default_commission'];

export const getAffiliateSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { group: 'AFFILIATE' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return sendSuccess(res, map);
});

export const updateAffiliateSettings = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) => {
      if (!AFFILIATE_KEYS.includes(key)) return Promise.resolve();
      return prisma.setting.upsert({
        where: { key },
        create: { key, value, group: 'AFFILIATE' },
        update: { value },
      });
    })
  );
  return sendSuccess(res, null, 'Pengaturan afiliasi berhasil disimpan');
});

// OCR / Auto-Verify Settings
const OCR_KEYS = ['ocr_analysis_enabled', 'ocr_auto_verify_enabled', 'ocr_confidence_threshold', 'ocr_auto_verify_schedule', 'ocr_auto_verify_last_run', 'ocr_auto_verify_last_result'];

export const getOcrSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { group: 'OCR' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return sendSuccess(res, map);
});

export const updateOcrSettings = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) => {
      if (!OCR_KEYS.includes(key)) return Promise.resolve();
      return prisma.setting.upsert({
        where: { key },
        create: { key, value, group: 'OCR' },
        update: { value },
      });
    })
  );

  // Restart scheduler with new settings
  try {
    const { restartScheduler } = await import('../services/schedulerService');
    await restartScheduler();
  } catch (err) {
    // Scheduler restart is non-critical
  }

  return sendSuccess(res, null, 'Pengaturan OCR berhasil disimpan');
});

// WhatsApp Settings
export const getWhatsAppSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { group: 'WHATSAPP' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return sendSuccess(res, map);
});

export const updateWhatsAppSettings = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  const waKeys = ['wa_api_url', 'wa_api_key', 'wa_sender_number'];

  await Promise.all(
    Object.entries(updates).map(([key, value]) => {
      if (!waKeys.includes(key)) return Promise.resolve();
      return prisma.setting.upsert({
        where: { key },
        create: { key, value, group: 'WHATSAPP' },
        update: { value },
      });
    })
  );
  return sendSuccess(res, null, 'Pengaturan WhatsApp berhasil disimpan');
});

export const getWaStatus = catchAsync(async (_req: Request, res: Response) => {
  const status = await getSenderStatus();
  return sendSuccess(res, status);
});

export const waStartSender = catchAsync(async (_req: Request, res: Response) => {
  const result = await startSender();
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }
  return sendSuccess(res, result, result.message);
});

export const waStopSender = catchAsync(async (_req: Request, res: Response) => {
  const result = await stopSender();
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }
  return sendSuccess(res, result, result.message);
});

export const waSendTest = catchAsync(async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to) throw new Error('Nomor tujuan diperlukan');
  const sent = await sendWaMessage(to, message || 'Test dari Mendunia.id - Konfigurasi WhatsApp berhasil!');
  if (!sent) throw new Error('Gagal mengirim pesan test. Periksa konfigurasi WhatsApp.');
  return sendSuccess(res, null, 'Pesan test berhasil dikirim');
});
