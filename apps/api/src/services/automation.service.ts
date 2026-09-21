import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { AutomationTrigger, AutomationActionType, LeadStatus } from '@chatflow/shared';
import { WhatsAppService } from './whatsapp.service.js';

export interface AutomationExecutionContext {
  organizationId: string;
  trigger: AutomationTrigger;
  customerId: string;
  conversationId?: string;
  leadId?: string;
  messageText?: string;
  metadata?: any;
}

export class AutomationService {
  /**
   * Process all active automation rules matching the trigger for the tenant
   */
  public static async processRules(context: AutomationExecutionContext): Promise<{
    executed: boolean;
    matchedRule?: any;
    outgoingResponse?: any;
    replyText?: string;
  }> {
    const { organizationId, trigger, customerId, conversationId, messageText } = context;

    try {
      // Find rules matching the explicit trigger OR keyword match rules
      const triggerList = [trigger as string];
      if (trigger === AutomationTrigger.MESSAGE_RECEIVED) {
        triggerList.push(AutomationTrigger.KEYWORD_MATCH, AutomationTrigger.GREETING);
      }

      const rules = await prisma.automationRule.findMany({
        where: {
          organizationId,
          trigger: { in: triggerList },
          isActive: true,
        },
      });

      if (!rules || rules.length === 0) return { executed: false };

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) return { executed: false };

      const normalizedMsg = (messageText || '').toLowerCase().trim();

      for (const rule of rules) {
        let conditions: any = {};
        try {
          conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || {});
        } catch {
          conditions = {};
        }

        let matches = false;

        if (rule.trigger === AutomationTrigger.GREETING) {
          const greetingKeywords = ['hi', 'hello', 'hey', 'start', 'menu', 'namaste'];
          if (conditions.keyword) {
            const extra = String(conditions.keyword).split(',').map((k) => k.trim().toLowerCase());
            greetingKeywords.push(...extra);
          }
          if (greetingKeywords.some((kw) => normalizedMsg === kw || normalizedMsg.startsWith(kw))) {
            matches = true;
          }
        } else if (rule.trigger === AutomationTrigger.KEYWORD_MATCH || trigger === AutomationTrigger.KEYWORD_MATCH) {
          if (conditions.keyword) {
            const keywords = String(conditions.keyword)
              .split(',')
              .map((k) => k.trim().toLowerCase())
              .filter(Boolean);

            for (const kw of keywords) {
              // Exact match or substring / word boundary match
              if (normalizedMsg === kw || normalizedMsg.includes(kw)) {
                matches = true;
                break;
              }
            }
          }
        } else if (rule.trigger === AutomationTrigger.MESSAGE_RECEIVED) {
          matches = true;
        }

        if (!matches) continue;

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { executionCount: { increment: 1 } },
        });

        let actions: any[] = [];
        try {
          actions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : (rule.actions || []);
        } catch {
          actions = [];
        }

        let lastOutgoingResponse: any = null;
        let lastReplyText: string | undefined = undefined;

        for (const action of actions) {
          const res = await this.executeAction(organizationId, customer, conversationId, action, context);
          if (res) {
            lastOutgoingResponse = res;
            if (action.type === AutomationActionType.SEND_MESSAGE && action.payload?.text) {
              lastReplyText = action.payload.text;
            }
          }
        }

        return {
          executed: true,
          matchedRule: rule,
          outgoingResponse: lastOutgoingResponse,
          replyText: lastReplyText,
        };
      }
    } catch (err) {
      logger.error('Error processing automation rules:', err);
    }

    return { executed: false };
  }

  private static async executeAction(
    organizationId: string,
    customer: any,
    conversationId: string | undefined,
    action: { type: AutomationActionType; payload: any; delayMinutes?: number },
    context: AutomationExecutionContext
  ) {
    try {
      const { type, payload } = action;

      switch (type) {
        case AutomationActionType.SEND_MESSAGE:
          if (payload.text) {
            let messageContent = payload.text
              .replace(/\{\{name\}\}/gi, customer.name || 'Valued Customer')
              .replace(/\{\{phone\}\}/gi, customer.phone);

            return await WhatsAppService.sendMessage({
              organizationId,
              to: customer.phone,
              content: messageContent,
              conversationId,
              customerId: customer.id,
            });
          }
          break;

        case AutomationActionType.CREATE_LEAD:
          await prisma.lead.create({
            data: {
              organizationId,
              customerId: customer.id,
              status: LeadStatus.NEW,
              source: payload.source || 'AUTOMATION',
              notes: payload.notes || 'Auto-created by automation rule',
              estimatedValue: payload.estimatedValue ? parseFloat(payload.estimatedValue) : null,
            },
          });
          break;

        case AutomationActionType.UPDATE_LEAD_STATUS:
          if (context.leadId && payload.status) {
            await prisma.lead.update({
              where: { id: context.leadId },
              data: { status: payload.status },
            });
          }
          break;

        case AutomationActionType.ADD_TAGS:
          if (payload.tags && Array.isArray(payload.tags)) {
            let currentTags: string[] = [];
            try {
              currentTags = JSON.parse(customer.tags || '[]');
            } catch {
              currentTags = [];
            }
            const newTags = Array.from(new Set([...currentTags, ...payload.tags]));
            await prisma.customer.update({
              where: { id: customer.id },
              data: { tags: JSON.stringify(newTags) },
            });
          }
          break;

        case AutomationActionType.ASSIGN_STAFF:
          if (conversationId && payload.userId) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { assignedUserId: payload.userId },
            });
          }
          break;

        default:
          break;
      }
    } catch (err) {
      logger.error('Error executing automation action:', { action, err });
    }
  }
}
