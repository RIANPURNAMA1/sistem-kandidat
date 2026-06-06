import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadFile, deleteFile } from '../config/minio';
import { AppError, catchAsync, sendSuccess } from '../utils/AppError';
import { v4 as uuidv4 } from 'uuid';

export const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('File diperlukan', 400);
  const { type } = req.body;
  const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.userId } });
  if (!candidate) throw new AppError('Profil kandidat tidak ditemukan', 404);

  const objectName = `documents/${candidate.id}/${uuidv4()}-${req.file.originalname}`;
  const fileUrl = await uploadFile(objectName, req.file.buffer, req.file.mimetype);

  const document = await prisma.document.create({
    data: {
      candidateId: candidate.id,
      type,
      fileName: req.file.originalname,
      fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
  return sendSuccess(res, document, 'Dokumen berhasil diupload', 201);
});

export const getMyDocuments = catchAsync(async (req: Request, res: Response) => {
  const candidate = await prisma.candidate.findUnique({ where: { userId: req.user!.userId } });
  if (!candidate) throw new AppError('Profil tidak ditemukan', 404);
  const documents = await prisma.document.findMany({
    where: { candidateId: candidate.id },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, documents);
});

export const verifyDocument = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  const document = await prisma.document.update({
    where: { id },
    data: { status, adminNotes, verifiedAt: new Date(), verifiedBy: req.user!.userId },
  });
  return sendSuccess(res, document, 'Dokumen berhasil diverifikasi');
});

export const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) throw new AppError('Dokumen tidak ditemukan', 404);
  await prisma.document.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'Dokumen berhasil dihapus');
});
