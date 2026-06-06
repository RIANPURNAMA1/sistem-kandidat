import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface AuditOptions {
  action: string;
  resource: string;
  getResourceId?: (req: Request) => string | undefined;
}

export const auditLog = (options: AuditOptions) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          action: options.action as any,
          resource: options.resource,
          resourceId: options.getResourceId?.(req),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (err) {
      logger.error('Audit log error:', err);
    }
    next();
  };
};
