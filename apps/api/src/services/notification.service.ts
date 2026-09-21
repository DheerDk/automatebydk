import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { SocketServer } from '../sockets/index.js';

export interface CreateNotificationParams {
  organizationId: string;
  userId?: string | null;
  title: string;
  message: string;
  type?: 'INFO' | 'LEAD' | 'SUPPORT' | 'CAMPAIGN' | 'WARNING';
  link?: string;
}

export class NotificationService {
  public static async create(params: CreateNotificationParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId || null,
          title: params.title,
          message: params.message,
          type: params.type || 'INFO',
          link: params.link || null,
        },
      });

      // Broadcast real-time notification to organization room
      SocketServer.emitToOrg(params.organizationId, 'notification:new', notification);

      return notification;
    } catch (err) {
      logger.error('Failed to create notification:', err);
    }
  }
}
