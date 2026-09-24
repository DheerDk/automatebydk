import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { WhatsAppService } from './whatsapp.service.js';
import { SocketServer } from '../sockets/index.js';
import { MessageType, MessageDirection } from '@chatflow/shared';

export interface CreateDripStepInput {
  stepOrder: number;
  delayMinutes: number;
  messageType?: string;
  messageContent: string;
  mediaUrl?: string;
  buttonOptions?: Array<{ id: string; title: string }>;
}

export interface CreateDripSequenceInput {
  organizationId: string;
  name: string;
  description?: string;
  triggerType?: string;
  triggerStatus?: string;
  steps: CreateDripStepInput[];
}

export class DripService {
  private static workerInterval: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  /**
   * 1. Create a complete Drip Sequence with nested steps
   */
  public static async createSequence(data: CreateDripSequenceInput) {
    const { organizationId, name, description, triggerType = 'LEAD_STATUS', triggerStatus = 'INTERESTED', steps } = data;

    const sequence = await prisma.dripSequence.create({
      data: {
        organizationId,
        name,
        description,
        triggerType,
        triggerStatus,
        isActive: true,
        steps: {
          create: steps.map((s, index) => ({
            stepOrder: s.stepOrder || index + 1,
            delayMinutes: s.delayMinutes || (index === 0 ? 120 : index === 1 ? 1440 : 4320),
            messageType: s.messageType || 'TEXT',
            messageContent: s.messageContent,
            mediaUrl: s.mediaUrl || null,
            buttonOptions: s.buttonOptions ? JSON.stringify(s.buttonOptions) : '[]',
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return sequence;
  }

  /**
   * 2. List all sequences for an organization with analytics
   */
  public static async listSequences(organizationId: string) {
    const sequences = await prisma.dripSequence.findMany({
      where: { organizationId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute status metrics for each sequence
    const sequencesWithStats = await Promise.all(
      sequences.map(async (seq) => {
        const activeCount = await prisma.dripEnrollment.count({
          where: { sequenceId: seq.id, status: 'ACTIVE' },
        });
        const completedCount = await prisma.dripEnrollment.count({
          where: { sequenceId: seq.id, status: 'COMPLETED' },
        });
        const repliedCount = await prisma.dripEnrollment.count({
          where: { sequenceId: seq.id, status: 'CANCELLED_REPLIED' },
        });
        const convertedCount = await prisma.dripEnrollment.count({
          where: { sequenceId: seq.id, status: 'CANCELLED_PURCHASED' },
        });

        return {
          ...seq,
          stats: {
            totalEnrollments: seq._count.enrollments,
            activeCount,
            completedCount,
            repliedCount,
            convertedCount,
            conversionRate: seq._count.enrollments > 0
              ? Math.round(((convertedCount + repliedCount) / seq._count.enrollments) * 100)
              : 0,
          },
        };
      })
    );

    return sequencesWithStats;
  }

  /**
   * 3. Enroll a Lead/Customer into a Drip Sequence
   */
  public static async enrollCustomer({
    organizationId,
    sequenceId,
    customerId,
    leadId,
  }: {
    organizationId: string;
    sequenceId: string;
    customerId: string;
    leadId?: string;
  }) {
    // 1. Fetch sequence and first step
    const sequence = await prisma.dripSequence.findFirst({
      where: { id: sequenceId, organizationId, isActive: true },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!sequence || sequence.steps.length === 0) {
      return null;
    }

    // 2. Check if customer is already actively enrolled in this sequence
    const existingActive = await prisma.dripEnrollment.findFirst({
      where: {
        sequenceId,
        customerId,
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      logger.info(`[DripService] Customer ${customerId} already actively enrolled in sequence ${sequence.name}`);
      return existingActive;
    }

    const firstStep = sequence.steps[0];
    const nextRunAt = new Date(Date.now() + firstStep.delayMinutes * 60 * 1000);

    const enrollment = await prisma.dripEnrollment.create({
      data: {
        organizationId,
        sequenceId,
        customerId,
        leadId: leadId || null,
        currentStepOrder: 1,
        status: 'ACTIVE',
        nextRunAt,
      },
      include: {
        sequence: true,
        customer: true,
      },
    });

    logger.info(`[DripService] Enrolled customer ${customerId} into drip "${sequence.name}". First message at ${nextRunAt.toISOString()}`);
    return enrollment;
  }

  /**
   * 4. Auto-enroll by Lead Status or Inactivity Trigger
   */
  public static async triggerAutoEnrollment({
    organizationId,
    triggerType = 'LEAD_STATUS',
    triggerStatus,
    customerId,
    leadId,
  }: {
    organizationId: string;
    triggerType?: string;
    triggerStatus?: string;
    customerId: string;
    leadId?: string;
  }) {
    try {
      const matchingSequences = await prisma.dripSequence.findMany({
        where: {
          organizationId,
          isActive: true,
          triggerType,
          ...(triggerStatus ? { triggerStatus } : {}),
        },
      });

      for (const seq of matchingSequences) {
        await this.enrollCustomer({
          organizationId,
          sequenceId: seq.id,
          customerId,
          leadId,
        });
      }
    } catch (err) {
      logger.error('[DripService] Error triggering auto enrollment:', err);
    }
  }

  /**
   * 5. Auto-cancel active sequences when Customer Replies or Purchases
   */
  public static async cancelEnrollmentsOnAction({
    organizationId,
    customerId,
    reason,
  }: {
    organizationId: string;
    customerId: string;
    reason: 'REPLIED' | 'PURCHASED' | 'MANUAL';
  }) {
    try {
      const targetStatus = reason === 'PURCHASED' ? 'CANCELLED_PURCHASED' : 'CANCELLED_REPLIED';

      const updated = await prisma.dripEnrollment.updateMany({
        where: {
          organizationId,
          customerId,
          status: 'ACTIVE',
        },
        data: {
          status: targetStatus,
          cancelledAt: new Date(),
          cancelReason: `Customer ${reason.toLowerCase()}`,
        },
      });

      if (updated.count > 0) {
        logger.info(`[DripService] Auto-cancelled ${updated.count} active drip sequence(s) for customer ${customerId} (Reason: ${reason})`);
      }
    } catch (err) {
      logger.error('[DripService] Error cancelling drip enrollments:', err);
    }
  }

  /**
   * 6. Core Processing Engine: Executes pending scheduled follow-ups
   */
  public static async processDueDrips() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      // Fetch all active enrollments where nextRunAt <= now
      const dueEnrollments = await prisma.dripEnrollment.findMany({
        where: {
          status: 'ACTIVE',
          nextRunAt: {
            lte: now,
          },
        },
        include: {
          sequence: {
            include: {
              steps: {
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
          customer: {
            include: {
              conversations: true,
            },
          },
          organization: {
            include: {
              settings: true,
            },
          },
          lead: {
            include: {
              product: true,
            },
          },
        },
        take: 25, // Process in controlled batches
      });

      for (const enrollment of dueEnrollments) {
        try {
          const { sequence, customer, organization, lead } = enrollment;

          // Guard: If sequence is paused/inactive, skip
          if (!sequence.isActive) continue;

          // Anti-Spam Safety Check: Has customer replied since enrollment started?
          const recentInbound = await prisma.message.findFirst({
            where: {
              organizationId: enrollment.organizationId,
              customerId: enrollment.customerId,
              direction: MessageDirection.INBOUND,
              createdAt: {
                gte: enrollment.createdAt,
              },
            },
          });

          if (recentInbound) {
            // Customer already engaged! Auto-cancel sequence safely.
            await prisma.dripEnrollment.update({
              where: { id: enrollment.id },
              data: {
                status: 'CANCELLED_REPLIED',
                cancelledAt: new Date(),
                cancelReason: 'Customer sent inbound message',
              },
            });
            logger.info(`[DripEngine] Customer ${customer.phone} replied recently. Auto-cancelled enrollment ${enrollment.id}`);
            continue;
          }

          // Find current step
          const currentStep = sequence.steps.find((s) => s.stepOrder === enrollment.currentStepOrder);

          if (!currentStep) {
            // No more steps -> Mark Completed
            await prisma.dripEnrollment.update({
              where: { id: enrollment.id },
              data: {
                status: 'COMPLETED',
                lastRunAt: now,
                nextRunAt: null,
              },
            });
            continue;
          }

          // Template variable substitution
          let messageText = currentStep.messageContent;
          const businessName = organization.name || 'Our Store';
          const customerName = customer.name || 'Valued Customer';
          const productName = lead?.product?.name || 'our trending collection';
          const currency = organization.settings?.currency || 'INR';
          const productPrice = lead?.product?.price ? `${currency} ${lead.product.price}` : '';

          messageText = messageText
            .replace(/\{\{customer_name\}\}/gi, customerName)
            .replace(/\{\{customer_phone\}\}/gi, customer.phone)
            .replace(/\{\{business_name\}\}/gi, businessName)
            .replace(/\{\{product_name\}\}/gi, productName)
            .replace(/\{\{product_price\}\}/gi, productPrice);

          // Parse buttons if configured
          let buttons: Array<{ id: string; title: string }> | undefined;
          try {
            const rawButtons = JSON.parse(currentStep.buttonOptions || '[]');
            if (Array.isArray(rawButtons) && rawButtons.length > 0) {
              buttons = rawButtons;
            }
          } catch {
            buttons = undefined;
          }

          // Conversation reference
          const conversation = customer.conversations?.[0];

          // Dispatch Message via WhatsApp Service
          const sendResult = await WhatsAppService.sendMessage({
            organizationId: enrollment.organizationId,
            to: customer.phone,
            content: messageText,
            type: currentStep.mediaUrl ? MessageType.IMAGE : buttons ? MessageType.INTERACTIVE : MessageType.TEXT,
            mediaUrl: currentStep.mediaUrl || undefined,
            buttons,
            conversationId: conversation?.id,
            customerId: customer.id,
            header: `Follow-up: ${sequence.name}`,
            footer: `${businessName} Assistant`,
            metadata: {
              source: 'DRIP_SEQUENCE',
              sequenceId: sequence.id,
              sequenceName: sequence.name,
              stepOrder: currentStep.stepOrder,
            },
          });

          // Log step execution
          await prisma.dripLog.create({
            data: {
              enrollmentId: enrollment.id,
              stepId: currentStep.id,
              status: sendResult.status === 'FAILED' ? 'FAILED' : 'SENT',
              whatsappMessageId: sendResult.whatsappMessageId,
            },
          });

          // Compute next step or complete
          const nextStep = sequence.steps.find((s) => s.stepOrder === currentStep.stepOrder + 1);

          if (nextStep) {
            const nextRunTime = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
            await prisma.dripEnrollment.update({
              where: { id: enrollment.id },
              data: {
                currentStepOrder: nextStep.stepOrder,
                lastRunAt: now,
                nextRunAt: nextRunTime,
              },
            });
            logger.info(`[DripEngine] Advanced enrollment ${enrollment.id} to step ${nextStep.stepOrder}. Next scheduled at: ${nextRunTime.toISOString()}`);
          } else {
            await prisma.dripEnrollment.update({
              where: { id: enrollment.id },
              data: {
                status: 'COMPLETED',
                lastRunAt: now,
                nextRunAt: null,
              },
            });
            logger.info(`[DripEngine] Completed all steps for enrollment ${enrollment.id}`);
          }

          // Real-time socket notification to staff
          if (conversation) {
            SocketServer.emitToOrg(enrollment.organizationId, 'drip:step_sent', {
              sequenceId: sequence.id,
              customerId: customer.id,
              customerName: customer.name,
              stepOrder: currentStep.stepOrder,
            });
          }
        } catch (stepErr: any) {
          logger.error(`[DripEngine] Error processing enrollment ${enrollment.id}:`, stepErr);
        }
      }
    } catch (loopErr) {
      logger.error('[DripEngine] Error in main loop:', loopErr);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 7. Start Persistent 24/7 Drip Follow-up Worker
   */
  public static startDripWorker(intervalMs = 30000) {
    if (this.workerInterval) return;

    logger.info('🤖 [DripService] Started 24/7 automated inactivity & abandoned inquiry follow-up worker.');
    this.workerInterval = setInterval(() => {
      this.processDueDrips().catch((err) => {
        logger.error('[DripService Worker] Exception in scheduled run:', err);
      });
    }, intervalMs);
  }
}
