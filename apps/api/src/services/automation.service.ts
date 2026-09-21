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

        // Check if rule has visual flowData graph
        const ruleFlowData = (rule as any).flowData;
        if (ruleFlowData) {
          try {
            const flowGraph = JSON.parse(ruleFlowData);
            if (flowGraph.nodes && Array.isArray(flowGraph.nodes)) {
              // Execute visual flow graph branches
              for (const node of flowGraph.nodes) {
                if (node.type === 'condition' || node.type === 'branch') {
                  const branchKeyword = (node.data?.keyword || '').toLowerCase().trim();
                  if (branchKeyword && (normalizedMsg === branchKeyword || normalizedMsg.includes(branchKeyword))) {
                    // Match found in branch -> execute connected action nodes
                    const connectedNodeIds = (flowGraph.edges || [])
                      .filter((e: any) => e.source === node.id)
                      .map((e: any) => e.target);

                    const targetActionNodes = flowGraph.nodes.filter((n: any) => connectedNodeIds.includes(n.id) && n.type === 'action');
                    for (const aNode of targetActionNodes) {
                      await this.executeAction(organizationId, customer, conversationId, {
                        type: aNode.data?.actionType || AutomationActionType.SEND_MESSAGE,
                        payload: aNode.data || {},
                      }, context);
                    }
                  }
                }
              }
            }
          } catch (flowErr) {
            logger.warn('Error parsing rule flowData:', flowErr);
          }
        }

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
    action: { type: AutomationActionType | string; payload: any; delayMinutes?: number },
    context: AutomationExecutionContext
  ) {
    try {
      const { type, payload } = action;

      switch (type) {
        case AutomationActionType.SEND_MESSAGE:
        case 'SEND_MESSAGE':
          if (payload.text) {
            let messageContent = payload.text
              .replace(/\{\{name\}\}/gi, customer.name || 'Valued Customer')
              .replace(/\{\{phone\}\}/gi, customer.phone);

            return await WhatsAppService.sendMessage({
              organizationId,
              to: customer.phone,
              content: messageContent,
              mediaUrl: payload.mediaUrl,
              conversationId,
              customerId: customer.id,
            });
          }
          break;

        case 'SEND_CATALOG':
        case 'SEND_PRODUCTS':
          // Fetch active store products
          const products = await prisma.product.findMany({
            where: { organizationId, isActive: true },
            take: 4,
          });

          let catalogMsg = '🛍️ *Trending Products Catalog:*\n\n';
          products.forEach((p, idx) => {
            const price = p.discountPrice ? `₹${p.discountPrice} (was ₹${p.price})` : `₹${p.price}`;
            catalogMsg += `${idx + 1}. *${p.name}* - ${price}\n${p.description || ''}\n\n`;
          });
          catalogMsg += '👉 Reply with product name to order now!';

          return await WhatsAppService.sendMessage({
            organizationId,
            to: customer.phone,
            content: catalogMsg,
            mediaUrl: products[0]?.images ? JSON.parse(products[0].images)[0] : undefined,
            conversationId,
            customerId: customer.id,
          });

        case 'HUMAN_HANDOFF':
          if (conversationId) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { status: 'HUMAN_TAKEN_OVER' },
            });
            return await WhatsAppService.sendMessage({
              organizationId,
              to: customer.phone,
              content: payload.text || '🧑‍💼 A human store manager has been notified and will assist you shortly!',
              conversationId,
              customerId: customer.id,
            });
          }
          break;

        case AutomationActionType.CREATE_LEAD:
        case 'CREATE_LEAD':
          await prisma.lead.create({
            data: {
              organizationId,
              customerId: customer.id,
              status: payload.leadStatus || LeadStatus.NEW,
              source: payload.source || 'AUTOMATION',
              notes: payload.notes || 'Auto-created by visual automation flow',
              estimatedValue: payload.estimatedValue ? parseFloat(payload.estimatedValue) : null,
            },
          });
          break;

        case AutomationActionType.UPDATE_LEAD_STATUS:
        case 'UPDATE_LEAD_STATUS':
          if (context.leadId && payload.status) {
            await prisma.lead.update({
              where: { id: context.leadId },
              data: { status: payload.status },
            });
          }
          break;

        case AutomationActionType.ADD_TAGS:
        case 'ADD_TAGS':
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
        case 'ASSIGN_STAFF':
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
