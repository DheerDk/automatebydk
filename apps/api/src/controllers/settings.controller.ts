import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class SettingsController {
  public static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const [organization, settings, whatsappAccount, subscription] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: organizationId },
        }),
        prisma.businessSettings.findUnique({
          where: { organizationId },
        }),
        prisma.whatsAppAccount.findUnique({
          where: { organizationId },
          select: {
            id: true,
            status: true,
            displayPhoneNumber: true,
            phoneNumberId: true,
            businessAccountId: true,
            verifyToken: true,
            lastWebhookReceivedAt: true,
            accessToken: true,
          },
        }),
        prisma.subscription.findUnique({
          where: { organizationId },
        }),
      ]);

      const maskedWa = whatsappAccount
        ? {
            ...whatsappAccount,
            accessToken: whatsappAccount.accessToken && whatsappAccount.accessToken.length > 8
              ? `${whatsappAccount.accessToken.substring(0, 4)}...${whatsappAccount.accessToken.substring(whatsappAccount.accessToken.length - 4)}`
              : '••••••••••••••••',
            isConfigured: whatsappAccount.status === 'CONNECTED' || (whatsappAccount.phoneNumberId && whatsappAccount.phoneNumberId !== 'pending_setup'),
          }
        : null;

      return res.json({
        success: true,
        data: {
          organization,
          settings: settings
            ? {
                ...settings,
                humanHandoffKeywords: settings.humanHandoffKeywords.split(','),
              }
            : null,
          whatsappAccount: maskedWa,
          subscription,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateBusinessProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, phone, email, address, website, instagram, currency, businessHours, deliveryPolicy, returnPolicy, exchangePolicy, paymentMethods, welcomeMessage, aiAutoReplyEnabled, humanHandoffKeywords } = req.body;

      if (name) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { name },
        });
      }

      const keywordsStr = Array.isArray(humanHandoffKeywords)
        ? humanHandoffKeywords.join(',')
        : humanHandoffKeywords;

      const updatedSettings = await prisma.businessSettings.upsert({
        where: { organizationId },
        update: {
          phone,
          email,
          address,
          website,
          instagram,
          currency,
          businessHours,
          deliveryPolicy,
          returnPolicy,
          exchangePolicy,
          paymentMethods,
          welcomeMessage,
          aiAutoReplyEnabled: aiAutoReplyEnabled !== undefined ? aiAutoReplyEnabled : true,
          humanHandoffKeywords: keywordsStr || undefined,
        },
        create: {
          organizationId,
          phone,
          email,
          address,
          website,
          instagram,
          currency: currency || 'INR',
          businessHours,
          deliveryPolicy,
          returnPolicy,
          exchangePolicy,
          paymentMethods,
          welcomeMessage,
          aiAutoReplyEnabled: aiAutoReplyEnabled !== undefined ? aiAutoReplyEnabled : true,
          humanHandoffKeywords: keywordsStr || 'human,agent,support,help',
        },
      });

      await AuditService.log({
        organizationId,
        userId: req.user?.id,
        action: 'SETTINGS_UPDATED',
        entityType: 'BUSINESS_SETTINGS',
        entityId: updatedSettings.id,
      });

      return res.json({
        success: true,
        message: 'Business settings updated successfully',
        data: {
          ...updatedSettings,
          humanHandoffKeywords: updatedSettings.humanHandoffKeywords.split(','),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateWhatsAppCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { phoneNumberId, businessAccountId, accessToken, verifyToken, displayPhoneNumber, metaAppSecret } = req.body;

      const updatedWa = await prisma.whatsAppAccount.upsert({
        where: { organizationId },
        update: {
          phoneNumberId,
          businessAccountId,
          accessToken: accessToken && !accessToken.includes('••••') ? accessToken : undefined,
          verifyToken: verifyToken || 'chatflow_webhook_verify_token_secure_xyz_987',
          displayPhoneNumber,
          metaAppSecret: metaAppSecret || undefined,
          status: 'CONNECTED',
        },
        create: {
          organizationId,
          phoneNumberId,
          businessAccountId,
          accessToken: accessToken || 'dev_token',
          verifyToken: verifyToken || 'chatflow_webhook_verify_token_secure_xyz_987',
          displayPhoneNumber,
          metaAppSecret,
          status: 'CONNECTED',
        },
      });

      await AuditService.log({
        organizationId,
        userId: req.user?.id,
        action: 'WHATSAPP_CONFIG_UPDATED',
        entityType: 'WHATSAPP_ACCOUNT',
        entityId: updatedWa.id,
        details: { phoneNumberId, displayPhoneNumber },
      });

      return res.json({
        success: true,
        message: 'WhatsApp Business account configured successfully',
        data: {
          id: updatedWa.id,
          status: updatedWa.status,
          displayPhoneNumber: updatedWa.displayPhoneNumber,
          phoneNumberId: updatedWa.phoneNumberId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
