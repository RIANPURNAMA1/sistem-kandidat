import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { catchAsync, sendSuccess } from '../utils/AppError';
import { sendWaMessage } from '../services/waService';

// ─── Follow Up Categories ───────────────────────────────────────────

export const listCategories = catchAsync(async (req: Request, res: Response) => {
  const { search, isActive } = req.query;
  const where: any = {};
  if (search) where.name = { contains: String(search) };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const items = await prisma.followUpCategory.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { templates: true } } },
  });
  return sendSuccess(res, items);
});

export const getCategory = catchAsync(async (req: Request, res: Response) => {
  const item = await prisma.followUpCategory.findUnique({
    where: { id: req.params.id },
    include: { templates: { where: { isActive: true }, orderBy: { createdAt: 'desc' } } },
  });
  if (!item) return sendSuccess(res, null, 'Kategori tidak ditemukan');
  return sendSuccess(res, item);
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const { name, description, icon, color, sortOrder } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const item = await prisma.followUpCategory.create({
    data: { name, slug, description, icon, color, sortOrder: sortOrder || 0 },
  });
  return sendSuccess(res, item, 'Kategori berhasil dibuat', 201);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { name, description, icon, color, isActive, sortOrder } = req.body;
  const data: any = { description, icon, color, isActive, sortOrder };
  if (name) {
    data.name = name;
    data.slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  const item = await prisma.followUpCategory.update({
    where: { id: req.params.id },
    data,
  });
  return sendSuccess(res, item, 'Kategori berhasil diperbarui');
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const count = await prisma.followUpTemplate.count({ where: { categoryId: req.params.id } });
  if (count > 0) {
    return sendSuccess(res, null, 'Hapus semua template dalam kategori ini terlebih dahulu', 400);
  }
  await prisma.followUpCategory.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'Kategori berhasil dihapus');
});

// ─── Follow Up Templates ────────────────────────────────────────────

export const listTemplates = catchAsync(async (req: Request, res: Response) => {
  const { search, categoryId, channel, isActive } = req.query;
  const where: any = {};
  if (search) where.name = { contains: String(search) };
  if (categoryId) where.categoryId = String(categoryId);
  if (channel) where.channel = String(channel);
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const items = await prisma.followUpTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { category: true, _count: { select: { logs: true } } },
  });
  return sendSuccess(res, items);
});

export const getTemplate = catchAsync(async (req: Request, res: Response) => {
  const item = await prisma.followUpTemplate.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!item) return sendSuccess(res, null, 'Template tidak ditemukan');
  return sendSuccess(res, item);
});

export const createTemplate = catchAsync(async (req: Request, res: Response) => {
  const { categoryId, name, subject, message, channel, placeholders, isActive } = req.body;
  const item = await prisma.followUpTemplate.create({
    data: { categoryId, name, subject, message, channel: channel || 'WHATSAPP', placeholders, isActive },
  });
  return sendSuccess(res, item, 'Template berhasil dibuat', 201);
});

export const updateTemplate = catchAsync(async (req: Request, res: Response) => {
  const { categoryId, name, subject, message, channel, placeholders, isActive } = req.body;
  const item = await prisma.followUpTemplate.update({
    where: { id: req.params.id },
    data: { categoryId, name, subject, message, channel, placeholders, isActive },
  });
  return sendSuccess(res, item, 'Template berhasil diperbarui');
});

export const deleteTemplate = catchAsync(async (req: Request, res: Response) => {
  await prisma.followUpLog.deleteMany({ where: { templateId: req.params.id } });
  await prisma.followUpTemplate.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'Template berhasil dihapus');
});

// ─── Send Follow Up ─────────────────────────────────────────────────

export const sendFollowUp = catchAsync(async (req: Request, res: Response) => {
  const { templateId, candidateIds } = req.body;

  const template = await prisma.followUpTemplate.findUnique({
    where: { id: templateId },
    include: { category: true },
  });
  if (!template) return sendSuccess(res, null, 'Template tidak ditemukan', 404);
  if (!template.isActive) return sendSuccess(res, null, 'Template tidak aktif', 400);

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds }, user: { isActive: true } },
    include: {
      applications: { include: { program: true, payment: true }, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!candidates.length) return sendSuccess(res, null, 'Tidak ada kandidat yang valid', 400);

  const results: { candidateId: string; status: string; error?: string }[] = [];

  for (const candidate of candidates) {
    const latestApp = candidate.applications[0];
    let message = template.message
      .replace(/{nama}/g, candidate.fullName)
      .replace(/{nik}/g, candidate.nik)
      .replace(/{phone}/g, candidate.phone);

    if (latestApp) {
      message = message
        .replace(/{program}/g, latestApp.program.name)
        .replace(/{status_pendaftaran}/g, latestApp.status)
        .replace(/{biaya_program}/g, String(latestApp.program.fee));
    }

    try {
      const sent = await sendWaMessage(candidate.phone, message);
      await prisma.followUpLog.create({
        data: {
          templateId,
          candidateId: candidate.id,
          channel: template.channel,
          to: candidate.phone,
          message,
          status: sent ? 'SENT' : 'FAILED',
          errorMessage: sent ? null : 'Gagal mengirim pesan',
        },
      });
      results.push({ candidateId: candidate.id, status: sent ? 'SENT' : 'FAILED' });
    } catch (err: any) {
      await prisma.followUpLog.create({
        data: {
          templateId,
          candidateId: candidate.id,
          channel: template.channel,
          to: candidate.phone,
          message,
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
      results.push({ candidateId: candidate.id, status: 'FAILED', error: err.message });
    }
  }

  return sendSuccess(res, { total: candidates.length, results }, 'Follow-up berhasil dikirim');
});

export const listLogs = catchAsync(async (req: Request, res: Response) => {
  const { templateId, candidateId, status, page = '1', limit = '20' } = req.query;
  const where: any = {};
  if (templateId) where.templateId = String(templateId);
  if (candidateId) where.candidateId = String(candidateId);
  if (status) where.status = String(status);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    prisma.followUpLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: Number(limit),
      include: { template: { select: { name: true, category: true } }, candidate: { select: { fullName: true, phone: true } } },
    }),
    prisma.followUpLog.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});
