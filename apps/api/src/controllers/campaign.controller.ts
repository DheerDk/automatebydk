import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { NotificationService } from '../services/notification.service.js';
import { CampaignStatus, MessageType } from '@chatflow/shared';

export class CampaignController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const campaigns = await prisma.campaign.findMany({
        where: { organizationId },
        include: { template: true },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = campaigns.map((c) => ({
        ...c,
        targetAudience: JSON.parse(c.targetAudience || '{}'),
      }));

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, templateId, customMessage, targetAudience = { all: true }, scheduledAt } = req.body;

      const campaign = await prisma.campaign.create({
        data: {
          organizationId,
          templateId: templateId || null,
          name,
          customMessage: customMessage || null,
          targetAudience: JSON.stringify(targetAudience),
          status: scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
        include: { template: true },
      });

      return res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: {
          ...campaign,
          targetAudience: JSON.parse(campaign.targetAudience),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async launch(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const campaign = await prisma.campaign.findFirst({
        where: { id, organizationId },
        include: { template: true },
      });

      if (!campaign) {
        throw new AppError('Campaign not found', 404);
      }

      await prisma.campaign.update({
        where: { id },
        data: { status: CampaignStatus.RUNNING },
      });

      const audience = JSON.parse(campaign.targetAudience || '{}');
      const customerWhere: any = { organizationId };

      if (audience.tags && audience.tags.length > 0) {
        customerWhere.tags = { contains: audience.tags[0] };
      }

      const customers = await prisma.customer.findMany({
        where: customerWhere,
        take: 100, // Batch limit
      });

      let sent = 0;
      let failed = 0;

      const messageText = campaign.customMessage || campaign.template?.body || `Hello from our store!`;

      for (const customer of customers) {
        try {
          const personalizedText = messageText.replace(/\{\{1\}\}|\{\{name\}\}/gi, customer.name);

          // Get or create conversation for customer
          let conversation = await prisma.conversation.findUnique({
            where: {
              organizationId_customerId: {
                organizationId,
                customerId: customer.id,
              },
            },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                organizationId,
                customerId: customer.id,
                status: 'AI_ACTIVE',
                lastMessageText: personalizedText.substring(0, 200),
              },
            });
          }

          await WhatsAppService.sendMessage({
            organizationId,
            to: customer.phone,
            content: personalizedText,
            conversationId: conversation.id,
            customerId: customer.id,
            type: MessageType.TEXT,
          });

          sent++;
        } catch (err) {
          failed++;
        }
      }

      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: CampaignStatus.COMPLETED,
          sentCount: sent,
          deliveredCount: sent,
          failedCount: failed,
        },
      });

      await NotificationService.create({
        organizationId,
        title: 'Broadcast Campaign Completed',
        message: `Campaign "${campaign.name}" dispatched to ${sent} customers (${failed} failed).`,
        type: 'CAMPAIGN',
      });

      return res.json({
        success: true,
        message: `Campaign sent to ${sent} customers`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
