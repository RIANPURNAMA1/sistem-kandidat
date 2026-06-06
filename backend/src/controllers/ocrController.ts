import { Request, Response } from 'express';
import { processPaymentProof } from '../services/ocrService';
import { catchAsync, sendSuccess } from '../utils/AppError';

export const analyzeProof = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File bukti pembayaran diperlukan' });
  }

  const ocrResult = await processPaymentProof(req.file.buffer, req.file.mimetype);

  return sendSuccess(res, ocrResult, 'OCR berhasil diproses');
});
