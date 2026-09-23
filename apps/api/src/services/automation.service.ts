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
        let matchedBranchActions: any[] | null = null;
        let defaultFlowAction: any = null;

        // Parse visual flowData if present
        let parsedFlowData: any = null;
        if ((rule as any).flowData) {
          try {
            parsedFlowData = typeof (rule as any).flowData === 'string'
              ? JSON.parse((rule as any).flowData)
              : (rule as any).flowData;
          } catch (e) {
            parsedFlowData = null;
          }
        }

        // 1. Check if matching any specific branch inside flowData
        if (parsedFlowData && parsedFlowData.branches && Array.isArray(parsedFlowData.branches)) {
          for (const branch of parsedFlowData.branches) {
            const bVal = String(branch.value || '').trim().toLowerCase();
            const bTitle = String(branch.title || '').trim().toLowerCase();
            const bId = String(branch.id || '').trim().toLowerCase();

            // Check condition types
            if (branch.conditionType === 'NUMBER_CHOICE' || branch.conditionType === 'EQUALS') {
              if (
                normalizedMsg === bVal ||
                normalizedMsg === `option ${bVal}` ||
                normalizedMsg === `${bVal}.` ||
                normalizedMsg === `#${bVal}` ||
                normalizedMsg === bTitle ||
                normalizedMsg === bId ||
                normalizedMsg.includes(`choice_${bVal}`)
              ) {
                matches = true;
                matchedBranchActions = branch.actions || [];
                break;
              }
            } else if (branch.conditionType === 'CONTAINS') {
              if (bVal && (normalizedMsg.includes(bVal) || normalizedMsg.includes(bTitle))) {
                matches = true;
                matchedBranchActions = branch.actions || [];
                break;
              }
            }
          }

          if (parsedFlowData.defaultAction) {
            defaultFlowAction = parsedFlowData.defaultAction;
          }
        }

        // 2. If not matched to a specific branch, check main trigger keywords
        if (!matches) {
          if (rule.trigger === AutomationTrigger.GREETING) {
            const greetingKeywords = ['hi', 'hello', 'hey', 'start', 'menu', 'namaste', 'help', 'info'];
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
                if (normalizedMsg === kw || normalizedMsg.includes(kw)) {
                  matches = true;
                  break;
                }
              }
            }
          } else if (rule.trigger === AutomationTrigger.MESSAGE_RECEIVED) {
            if (conditions.keyword) {
              const keywords = String(conditions.keyword)
                .split(',')
                .map((k) => k.trim().toLowerCase())
                .filter(Boolean);
              if (keywords.length > 0) {
                matches = keywords.some((kw) => normalizedMsg === kw || normalizedMsg.includes(kw));
              } else {
                matches = true;
              }
            } else {
              matches = true;
            }
          }
        }

        if (!matches) continue;

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { executionCount: { increment: 1 } },
        });

        let actionsToExecute: any[] = [];

        if (matchedBranchActions && matchedBranchActions.length > 0) {
          actionsToExecute = matchedBranchActions;
        } else if (defaultFlowAction && defaultFlowAction.text) {
          actionsToExecute = [
            {
              type: defaultFlowAction.type || AutomationActionType.SEND_MESSAGE,
              payload: {
                text: defaultFlowAction.text,
                mediaUrl: defaultFlowAction.mediaUrl,
                buttons: defaultFlowAction.buttons,
              },
            },
          ];
        } else {
          try {
            actionsToExecute = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : (rule.actions || []);
          } catch {
            actionsToExecute = [];
          }
        }

        let lastOutgoingResponse: any = null;
        let lastReplyText: string | undefined = undefined;

        for (const action of actionsToExecute) {
          const formattedAction = {
            type: action.type || AutomationActionType.SEND_MESSAGE,
            payload: action.payload || action,
          };

          const res = await this.executeAction(organizationId, customer, conversationId, formattedAction, context);
          if (res) {
            lastOutgoingResponse = res;
            if (formattedAction.type === AutomationActionType.SEND_MESSAGE && formattedAction.payload?.text) {
              lastReplyText = formattedAction.payload.text;
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
              buttons: payload.buttons || (payload.buttonTitles ? payload.buttonTitles.map((b: string, i: number) => ({ id: String(i + 1), title: b })) : undefined),
              conversationId,
              customerId: customer.id,
            });
          }
          break;

        case 'SEND_CATALOG':
        case 'SEND_PRODUCTS': {
          const products = await prisma.product.findMany({
            where: { organizationId, isActive: true },
            take: 4,
          });

          let catalogMsg = '🛍️ *Trending Products Catalog:*\n\n';
          if (products.length > 0) {
            products.forEach((p, idx) => {
              const price = p.discountPrice ? `₹${p.discountPrice} (was ₹${p.price})` : `₹${p.price}`;
              catalogMsg += `${idx + 1}. *${p.name}* - ${price}\n${p.description || ''}\n\n`;
            });
            catalogMsg += '👉 Reply with product name to place your order!';
          } else {
            catalogMsg += '✨ Our online store catalog is currently being updated. Visit our official website for full listings!';
          }

          return await WhatsAppService.sendMessage({
            organizationId,
            to: customer.phone,
            content: catalogMsg,
            mediaUrl: products[0]?.images ? JSON.parse(products[0].images)[0] : undefined,
            buttons: [
              { id: '1', title: '🛍️ View Products' },
              { id: '3', title: '🏷️ VIP Deals' },
              { id: '4', title: '🧑‍💼 Talk to Support' },
            ],
            conversationId,
            customerId: customer.id,
          });
        }

        case 'SEND_LOCATION': {
          const settings = await prisma.businessSettings.findUnique({
            where: { organizationId },
          });
          const storeAddress = payload.address || settings?.address || 'Main Commercial Center, MG Road';
          const storeHours = settings?.businessHours || 'Mon-Sat (10:00 AM - 09:00 PM)';
          const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(storeAddress)}`;

          const locText = payload.text || `📍 *Store Location & Timings:*\n🏢 ${storeAddress}\n🗺️ Google Maps: ${mapsUrl}\n⏰ Hours: ${storeHours}`;

          return await WhatsAppService.sendMessage({
            organizationId,
            to: customer.phone,
            content: locText,
            location: {
              latitude: payload.latitude || 12.9716,
              longitude: payload.longitude || 77.5946,
              name: 'Store Location',
              address: storeAddress,
            },
            buttons: [
              { id: '1', title: '🛍️ Browse Products' },
              { id: '5', title: '🌐 Store Website' },
            ],
            conversationId,
            customerId: customer.id,
          });
        }

        case 'SEND_WEBSITE': {
          const settings = await prisma.businessSettings.findUnique({
            where: { organizationId },
          });
          const websiteUrl = payload.url || settings?.website || 'https://automatebydk.pages.dev';
          const webText = payload.text || `🌐 *Visit Our Official Online Store:*\n🔗 ${websiteUrl}\n\n✨ Browse our complete catalog, view latest discounts, and shop securely online!`;

          return await WhatsAppService.sendMessage({
            organizationId,
            to: customer.phone,
            content: webText,
            buttons: [
              { id: '1', title: '🛍️ Browse Products' },
              { id: '3', title: '🏷️ Claim VIP Offer' },
            ],
            conversationId,
            customerId: customer.id,
          });
        }

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
          logger.warn(`Unknown action type: ${type}`);
      }
    } catch (err) {
      logger.error('Error executing automation action:', err);
    }
    return null;
  }
}
