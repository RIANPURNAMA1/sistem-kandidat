import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

const UPLOADS_BASE_PATH = process.env.FILE_STORAGE_PATH
  ? path.resolve(process.env.FILE_STORAGE_PATH)
  : path.join(__dirname, '../../uploads');

function getLocalFilePath(objectName: string) {
  const segments = objectName.split('/').map((segment) => segment.trim()).filter(Boolean);
  return path.join(UPLOADS_BASE_PATH, ...segments);
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    const filePath = getLocalFilePath(objectName);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    return `/api/files/${objectName}`;
  } catch (err) {
    logger.error('Local storage upload error:', err);
    throw new AppError('Gagal menyimpan file upload. Pastikan server memiliki izin tulis.', 500);
  }
}

export async function deleteFile(objectName: string): Promise<void> {
  try {
    const filePath = getLocalFilePath(objectName);
    await fs.promises.unlink(filePath);
  } catch (err) {
    logger.warn(`File tidak dapat dihapus atau tidak ditemukan: ${objectName}`, err);
  }
}

export async function getPresignedUrl(objectName: string): Promise<string> {
  return `/api/files/${objectName}`;
}
