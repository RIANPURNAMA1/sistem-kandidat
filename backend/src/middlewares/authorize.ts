import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Tidak terautentikasi', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Tidak memiliki akses', 403));
    }
    next();
  };
};

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FINANCE: 'FINANCE',
  AFFILIATE: 'AFFILIATE',
  KANDIDAT: 'KANDIDAT',
} as const;

// Shortcut role guards
export const isSuperAdmin = authorize(ROLES.SUPER_ADMIN);
export const isAdmin = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN);
export const isFinance = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE);
export const isAffiliate = authorize(ROLES.AFFILIATE);
export const isKandidat = authorize(ROLES.KANDIDAT);
export const isStaff = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE);
