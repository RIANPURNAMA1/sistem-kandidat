import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';

export const listPrograms = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 12, search, categoryId, status, featured } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (search) where.OR = [
    { name: { contains: String(search) } },
    { description: { contains: String(search) } },
  ];
  if (categoryId) where.categoryId = String(categoryId);
  if (status) where.status = String(status);
  else where.status = { in: ['AKTIF', 'PENUH'] };
  if (featured === 'true') where.isFeatured = true;

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where,
      include: {
        category: true,
        _count: { select: { applications: true } },
      },
      skip,
      take: Number(limit),
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.program.count({ where }),
  ]);

  return sendPaginated(res, programs, total, Number(page), Number(limit));
});

export const getProgramBySlug = catchAsync(async (req: Request, res: Response) => {
  const program = await prisma.program.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      _count: { select: { applications: true } },
    },
  });
  if (!program) throw new AppError('Program tidak ditemukan', 404);
  return sendSuccess(res, program);
});

export const createProgram = catchAsync(async (req: Request, res: Response) => {
  const slug = req.body.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const data = {
    name: req.body.name,
    description: req.body.description,
    requirements: req.body.requirements || '',
    benefits: req.body.benefits || null,
    categoryId: req.body.categoryId,
    fee: Number(req.body.fee),
    quota: Number(req.body.quota),
    affiliateCommission: req.body.affiliateCommission ? Number(req.body.affiliateCommission) : 0,
    commissionType: req.body.commissionType || 'FIXED',
    status: req.body.status || 'AKTIF',
    slug,
  };

  const program = await prisma.program.create({
    data,
    include: { category: true },
  });
  return sendSuccess(res, program, 'Program berhasil dibuat', 201);
});

export const updateProgram = catchAsync(async (req: Request, res: Response) => {
  const data: any = { ...req.body };
  if (data.fee) data.fee = Number(data.fee);
  if (data.quota) data.quota = Number(data.quota);
  if (data.affiliateCommission !== undefined) {
    data.affiliateCommission = data.affiliateCommission ? Number(data.affiliateCommission) : 0;
  }

  const program = await prisma.program.update({
    where: { id: req.params.id },
    data,
    include: { category: true },
  });
  return sendSuccess(res, program, 'Program berhasil diperbarui');
});

export const deleteProgram = catchAsync(async (req: Request, res: Response) => {
  await prisma.program.update({
    where: { id: req.params.id },
    data: { status: 'NONAKTIF' },
  });
  return sendSuccess(res, null, 'Program berhasil dinonaktifkan');
});

// Apply to program
export const applyProgram = catchAsync(async (req: Request, res: Response) => {
  const candidateId = req.body.candidateId;
  const { programId } = req.params;

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new AppError('Program tidak ditemukan', 404);
  if (program.status === 'NONAKTIF' || program.status === 'SELESAI') {
    throw new AppError('Program sudah tidak tersedia', 400);
  }

  const existingApp = await prisma.application.findUnique({
    where: { candidateId_programId: { candidateId, programId } },
  });
  if (existingApp) throw new AppError('Anda sudah mendaftar program ini', 409);

  // Check quota
  const applicationCount = await prisma.application.count({
    where: { programId, status: { notIn: ['REJECTED'] } },
  });
  if (applicationCount >= program.quota) throw new AppError('Kuota program sudah penuh', 400);

  const application = await prisma.application.create({
    data: {
      candidateId,
      programId,
      status: 'SUBMITTED',
      statusHistory: {
        create: { status: 'SUBMITTED', notes: 'Pendaftaran diterima' },
      },
    },
    include: { program: true },
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      applicationId: application.id,
      candidateId,
      amount: program.fee,
      status: 'MENUNGGU_UPLOAD',
    },
  });

  return sendSuccess(res, application, 'Pendaftaran berhasil', 201);
});
