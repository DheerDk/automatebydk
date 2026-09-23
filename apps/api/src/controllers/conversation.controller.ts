import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { SocketServer } from '../sockets/index.js';
import { ConversationStatus } from '@chatflow/shared';

export class ConversationController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { status, search, assignedUserId } = req.query;

      const where: any = { organizationId };

      if (status) {
        where.status = status as string;
      }

      if (assignedUserId) {
        where.assignedUserId = assignedUserId as string;
      }

      if (search) {
        const query = String(search).trim();
        where.customer = {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
          ],
        };
      }

      const conversations = await prisma.conversation.findMany({
        where,
        include: {
          customer: {
            include: {
              leads: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: { product: true },
              },
            },
          },
          assignedUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      const formatted = conversations.map((conv) => ({
        ...conv,
        customer: conv.customer
          ? {
              ...conv.customer,
              tags: JSON.parse(conv.customer.tags || '[]'),
              activeLead: conv.customer.leads[0] || null,
            }
          : null,
      }));

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const conversation = await prisma.conversation.findFirst({
        where: { id, organizationId },
        include: {
          customer: {
            include: {
              leads: {
                include: {
                  product: true,
                  events: { orderBy: { createdAt: 'desc' } },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          assignedUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }

      // Reset unread count
      if (conversation.unreadCount > 0) {
        await prisma.conversation.update({
          where: { id },
          data: { unreadCount: 0 },
        });
      }

      return res.json({
        success: true,
        data: {
          ...conversation,
          customer: {
            ...conversation.customer,
            tags: JSON.parse(conversation.customer.tags || '[]'),
          },
          messages: conversation.messages.map((m) => ({
            ...m,
            metadata: m.metadata ? JSON.parse(m.metadata) : null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { status, assignedUserId } = req.body;

      const existing = await prisma.conversation.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Conversation not found', 404);
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (assignedUserId !== undefined) updateData.assignedUserId = assignedUserId || null;

      const updated = await prisma.conversation.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      });

      SocketServer.emitToOrg(organizationId, 'conversation:updated', updated);

      return res.json({
        success: true,
        message: 'Conversation updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
