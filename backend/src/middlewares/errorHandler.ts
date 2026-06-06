import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Multer errors (file upload)
  if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'Ukuran file terlalu besar. Maksimal 5MB.',
      LIMIT_FILE_COUNT: 'Terlalu banyak file.',
      LIMIT_UNEXPECTED_FILE: 'Field file tidak sesuai.',
      LIMIT_FIELD_KEY: 'Nama field terlalu panjang.',
      LIMIT_FIELD_VALUE: 'Nilai field terlalu panjang.',
      LIMIT_FIELD_COUNT: 'Terlalu banyak field.',
      LIMIT_PART_COUNT: 'Terlalu banyak bagian form.',
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || 'Kesalahan upload file.',
    });
  }

  // Prisma known errors (constraint violations, etc.)
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      message: 'Database error',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
    });
  }

  // Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Data yang dikirim tidak valid',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
    });
  }

  // Prisma initialization errors (connection issues)
  if (err.name === 'PrismaClientInitializationError') {
    return res.status(503).json({
      success: false,
      message: 'Database tidak tersedia. Silakan coba lagi.',
    });
  }

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
