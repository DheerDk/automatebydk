import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

export interface CreateAuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams) {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId || null,
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          details: params.details ? JSON.stringify(params.details) : null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log:', err);
    }
  }
}
