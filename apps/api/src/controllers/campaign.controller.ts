import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { NotificationService } from '../services/notification.service.js';
import { CampaignStatus, MessageStatus, MessageType } from '@chatflow/shared';

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
      const {
        name,
        templateId,
        customMessage,
        mediaUrl,
        websiteUrl,
        discountCode,
        targetAudience = { all: true, contactType: 'all', recency: 'all', leadStage: 'all', tags: [] },
        scheduledAt,
      } = req.body;

      // Pack media and buttons into customMessage/metadata if provided
      let finalMessage = customMessage || '';
      if (discountCode) {
        finalMessage += `\n\n🏷️ Use Coupon Code: *${discountCode.toUpperCase()}*`;
      }
      if (websiteUrl) {
        finalMessage += `\n🌐 Shop Online: ${websiteUrl}`;
      }

      const audiencePayload = {
        ...targetAudience,
        mediaUrl: mediaUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        discountCode: discountCode || undefined,
      };

      const campaign = await prisma.campaign.create({
        data: {
          organizationId,
          templateId: templateId || null,
          name,
          customMessage: finalMessage || null,
          targetAudience: JSON.stringify(audiencePayload),
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

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const {
        name,
        templateId,
        customMessage,
        mediaUrl,
        websiteUrl,
        discountCode,
        targetAudience = { all: true, contactType: 'all', recency: 'all', leadStage: 'all', tags: [] },
        scheduledAt,
      } = req.body;

      const existing = await prisma.campaign.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Campaign not found', 404);
      }

      let finalMessage = customMessage || '';
      if (discountCode && !finalMessage.includes(discountCode)) {
        finalMessage += `\n\n🏷️ Use Coupon Code: *${discountCode.toUpperCase()}*`;
      }
      if (websiteUrl && !finalMessage.includes(websiteUrl)) {
        finalMessage += `\n🌐 Shop Online: ${websiteUrl}`;
      }

      const audiencePayload = {
        ...targetAudience,
        mediaUrl: mediaUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        discountCode: discountCode || undefined,
      };

      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          templateId: templateId || null,
          name: name ?? existing.name,
          customMessage: finalMessage || null,
          targetAudience: JSON.stringify(audiencePayload),
          scheduledAt: scheduledAt ? new Date(scheduledAt) : existing.scheduledAt,
        },
        include: { template: true },
      });

      return res.json({
        success: true,
        message: 'Campaign updated successfully',
        data: {
          ...updated,
          targetAudience: JSON.parse(updated.targetAudience),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const existing = await prisma.campaign.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Campaign not found', 404);
      }

      await prisma.campaign.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async launch(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const [campaign, settings] = await Promise.all([
        prisma.campaign.findFirst({
          where: { id, organizationId },
          include: { template: true },
        }),
        prisma.businessSettings.findUnique({
          where: { organizationId },
        }),
      ]);

      if (!campaign) {
        throw new AppError('Campaign not found', 404);
      }

      await prisma.campaign.update({
        where: { id },
        data: { status: CampaignStatus.RUNNING },
      });

      const audience = JSON.parse(campaign.targetAudience || '{}');
      const excludedNumbers = ((settings as any)?.excludedNumbers || '')
        .split(',')
        .map((n: string) => n.replace(/\D/g, ''))
        .filter(Boolean);

      let customers: any[] = [];
      const specificNumbersRaw = audience.specificNumbers;

      if (audience.targetMode === 'specific' || (specificNumbersRaw && String(specificNumbersRaw).trim().length > 0)) {
        // Targeted Specific Phone Numbers / Contacts Mode
        const rawList: string[] = Array.isArray(specificNumbersRaw)
          ? specificNumbersRaw
          : String(specificNumbersRaw || '')
              .split(/[\n,;]+/)
              .map((s) => s.trim())
              .filter(Boolean);

        for (const rawNum of rawList) {
          let cleanDigits = rawNum.replace(/\D/g, '');
          if (!cleanDigits || cleanDigits.length < 5) continue;
          if (cleanDigits.length === 10) {
            cleanDigits = `91${cleanDigits}`;
          }
          const cleanPhone = `+${cleanDigits}`;

          // Check blacklist exclusion permanently
          if (excludedNumbers.some((ex: string) => cleanDigits.endsWith(ex) || ex.endsWith(cleanDigits))) {
            continue;
          }

          // Try finding existing customer in CRM
          let cust = await prisma.customer.findFirst({
            where: {
              organizationId,
              phone: { contains: cleanDigits.slice(-10) },
            },
          });

          // If not in database, create a customer profile automatically
          if (!cust) {
            cust = await prisma.customer.create({
              data: {
                organizationId,
                name: `Customer ${cleanPhone}`,
                phone: cleanPhone,
              },
            });
          }

          if (cust && !customers.some((c) => c.id === cust!.id)) {
            customers.push(cust);
          }
        }
      } else {
        // Automated Audience Segmentation Filters
        const customerWhere: any = { organizationId };

        // 1. Recency Filter
        if (audience.recency === '7days') {
          customerWhere.lastInteractionAt = {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          };
        } else if (audience.recency === '30days') {
          customerWhere.lastInteractionAt = {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          };
        } else if (audience.recency === 'inactive_30days') {
          customerWhere.lastInteractionAt = {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          };
        }

        // 2. Lead Stage / Product Inquirer Filter
        if (audience.leadStage && audience.leadStage !== 'all') {
          if (audience.leadStage === 'INQUIRERS_ONLY') {
            customerWhere.leads = { some: {} };
          } else {
            customerWhere.leads = { some: { status: audience.leadStage } };
          }
        }

        // 3. Tags Filter
        if (audience.tags && Array.isArray(audience.tags) && audience.tags.length > 0 && audience.tags[0]) {
          customerWhere.tags = { contains: audience.tags[0] };
        }

        let fetchedCustomers = await prisma.customer.findMany({
          where: customerWhere,
          take: 250, // Safe batch limit
        });

        // 4. Contact Type Filter & Blacklist Filter
        customers = fetchedCustomers.filter((cust) => {
          const cleanPhone = cust.phone.replace(/\D/g, '');

          // Exclude personal / family numbers permanently
          if (excludedNumbers.some((ex: string) => cleanPhone.endsWith(ex) || ex.endsWith(cleanPhone))) {
            return false;
          }

          const isUnsavedFormat =
            cust.name.startsWith('Customer +') || cust.name.startsWith('+') || cust.name.startsWith('Customer ');

          if (audience.contactType === 'unsaved_only') {
            return isUnsavedFormat;
          } else if (audience.contactType === 'saved_only') {
            return !isUnsavedFormat;
          }

          return true;
        });
      }

      if (customers.length === 0) {
        await prisma.campaign.update({
          where: { id },
          data: {
            status: CampaignStatus.COMPLETED,
            sentCount: 0,
            deliveredCount: 0,
            failedCount: 0,
          },
        });

        return res.json({
          success: false,
          message: 'No eligible recipients found. Please verify the numbers entered or ensure they are not on the excluded list.',
        });
      }

      let sent = 0;
      let failed = 0;

      const messageText = campaign.customMessage || campaign.template?.body || `Special announcement from our store!`;
      const mediaUrl = audience.mediaUrl;

      // Anti-Spam Human Pacing: Broadcast sequentially with natural delay
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

          const sendResult = await WhatsAppService.sendMessage({
            organizationId,
            to: customer.phone,
            content: personalizedText,
            mediaUrl: mediaUrl || undefined,
            buttons: [
              { id: '1', title: '🛍️ Browse Catalog' },
              { id: '3', title: '🏷️ Claim Offer' },
              { id: '4', title: '🧑‍💼 Talk to Support' },
            ],
            conversationId: conversation.id,
            customerId: customer.id,
            type: mediaUrl ? MessageType.IMAGE : MessageType.TEXT,
          });

          if (sendResult.status === MessageStatus.FAILED) {
            failed++;
          } else {
            sent++;
          }

          // Natural human pacing (1.5 - 2.5s jitter) to protect phone number from anti-spam
          if (customers.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
          }
        } catch (err: any) {
          failed++;
          logger.error(`[CampaignController] Error sending to ${customer.phone}:`, err?.message || err);
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
        message: `Campaign "${campaign.name}" dispatched to ${sent} targeted customers (${failed} failed).`,
        type: 'CAMPAIGN',
      });

      return res.json({
        success: true,
        message: `Campaign sent to ${sent} targeted customers without spamming excluded contacts.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
