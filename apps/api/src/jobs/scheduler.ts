import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { CampaignStatus, MessageType } from '@chatflow/shared';

export class JobScheduler {
  public static start() {
    logger.info('⏰ Starting background job scheduler...');

    // 1. Process Scheduled Campaigns (Every minute)
    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const scheduledCampaigns = await prisma.campaign.findMany({
          where: {
            status: CampaignStatus.SCHEDULED,
            scheduledAt: { lte: now },
          },
          include: { template: true },
        });

        for (const campaign of scheduledCampaigns) {
          logger.info(`Dispatching scheduled campaign: ${campaign.name} (${campaign.id})`);

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: CampaignStatus.RUNNING },
          });

          const customers = await prisma.customer.findMany({
            where: { organizationId: campaign.organizationId },
            take: 50,
          });

          let sent = 0;
          const messageText = campaign.customMessage || campaign.template?.body || 'Hello!';

          for (const customer of customers) {
            try {
              const personalized = messageText.replace(/\{\{1\}\}|\{\{name\}\}/gi, customer.name);
              await WhatsAppService.sendMessage({
                organizationId: campaign.organizationId,
                to: customer.phone,
                content: personalized,
                customerId: customer.id,
                type: MessageType.TEXT,
              });
              sent++;
            } catch (err) {
              logger.error(`Error sending campaign message to ${customer.phone}:`, err);
            }
          }

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: CampaignStatus.COMPLETED,
              sentCount: sent,
              deliveredCount: sent,
            },
          });
        }
      } catch (err) {
        logger.error('Error in scheduled campaign job:', err);
      }
    });

    logger.info('✅ Background job scheduler running.');
  }
}
