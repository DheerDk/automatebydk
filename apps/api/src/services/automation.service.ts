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
   * Default starter workflow template for automated self-seeding
   */
  public static getDefaultStarterFlowData() {
    return {
      triggerKeyword: 'hi, hello, menu, start, store, 1, 2, 3, 4, 5, 6',
      triggerType: 'KEYWORD_MATCH',
      welcomeText: `👋 *Welcome to our Store!*\n\nHow can we help you today? Reply with a number or tap an option:\n\n1️⃣ 🛍️ *Browse Trending Products*\n2️⃣ 🔍 *Search Specific Item*\n3️⃣ 🏷️ *Exclusive VIP Discount Code*\n4️⃣ 📍 *Store Location & Timings*\n5️⃣ 🌐 *Visit Official Online Website*\n6️⃣ 🧑‍💼 *Talk to Store Manager*`,
      welcomeMediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
      welcomeButtons: [
        { id: '1', title: '🛍️ Browse Products', description: 'Explore trending collection' },
        { id: '2', title: '🔍 Search Item', description: 'Search any specific item' },
        { id: '3', title: '🏷️ VIP Coupon', description: 'Get exclusive 20% discount' },
        { id: '4', title: '📍 Store Location', description: 'View address and timings' },
        { id: '5', title: '🌐 Online Website', description: 'Visit our official website' },
        { id: '6', title: '🧑‍💼 Store Manager', description: 'Talk directly to human support' },
      ],
      branches: [
        {
          id: 'branch_1',
          value: '1',
          conditionType: 'NUMBER_CHOICE',
          title: 'Option 1: Browse Products',
          actions: [
            {
              type: 'SEND_CATALOG',
              text: '🛍️ Here are our top featured products today! Reply with any product name to place your order.',
              leadStatus: 'INTERESTED',
              tags: ['Browsed-Catalog'],
            },
          ],
        },
        {
          id: 'branch_2',
          value: '2',
          conditionType: 'NUMBER_CHOICE',
          title: 'Option 2: Search Product',
          actions: [
            {
              type: 'SEND_MESSAGE',
              text: '🔍 *Product Search:* Please type the item name or category (e.g. "T-Shirt", "Wireless Headphones", "Sneakers") and our AI catalog will find it instantly!',
              leadStatus: 'INTERESTED',
            },
          ],
        },
        {
          id: 'branch_3',
          value: '3',
          conditionType: 'NUMBER_CHOICE',
          title: 'Option 3: VIP Discount Promo',
          actions: [
            {
              type: 'SEND_MESSAGE',
              mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
              text: '🎉 *Special VIP Discount Activated!*\n\nUse Promo Code: *VIP2026* to get Flat 20% OFF on all purchases today.\n\nShop online now: https://automatebydk.pages.dev',
              leadStatus: 'CONTACTED',
              tags: ['VIP-Discount-Claimed'],
            },
          ],
        },
        {
          id: 'branch_4',
          value: '4',
          conditionType: 'NUMBER_CHOICE',
          title: 'Option 4: Store Location & Timings',
          actions: [
            {
              type: 'SEND_LOCATION',
              address: 'Main Commercial Plaza, MG Road, Metro Pillar 45',
              text: '📍 *Visit Our Store:*\n🏢 Main Commercial Plaza, MG Road\n⏰ Hours: Mon-Sat (10:00 AM - 09:30 PM)\n🗺️ Maps: https://maps.google.com',
            },
          ],
        },
        {
          id: 'branch_5',
          value: '5',
          conditionType: 'NUMBER_CHOICE',
          title: 'Option 5: Online Website',
          actions: [
            {
              type: 'SEND_WEBSITE',
              url: 'https://automatebydk.pages.dev',
              text: '🌐 *Official Store Website:*\n🔗 https://automatebydk.pages.dev\n\n✨ Browse our full range with live inventory & secure Razorpay payments!',
            },
          ],
        },
        {
          id: 'branch_6',
          value: '6',
          conditionType: 'NUMBER_CHOICE',
          title: 'Option 6: Human Support',
          actions: [
            {
              type: 'HUMAN_HANDOFF',
              text: '🧑‍💼 A store manager has been notified on WhatsApp and will assist you directly within 2 minutes!',
              leadStatus: 'FOLLOW_UP',
              tags: ['Human-Assistance-Requested'],
            },
          ],
        },
      ],
      defaultAction: {
        type: 'SEND_MESSAGE',
        text: '✨ Feel free to ask anything about our store, delivery policies, or products!',
      },
    };
  }

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

      let rules = await prisma.automationRule.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });

      // Auto-seed default Visual Workflow Studio Rule if no rules exist for this tenant
      if (!rules || rules.length === 0) {
        const defaultFlow = this.getDefaultStarterFlowData();
        const createdRule = await prisma.automationRule.create({
          data: {
            organizationId,
            name: 'Retail & E-Commerce Store Workflow',
            description: 'Interactive branching automation with catalog, VIP coupon, location pin, and manager handoff.',
            trigger: 'GREETING',
            conditions: JSON.stringify({ keyword: defaultFlow.triggerKeyword }),
            actions: JSON.stringify([
              {
                type: 'SEND_MESSAGE',
                payload: {
                  text: defaultFlow.welcomeText,
                  mediaUrl: defaultFlow.welcomeMediaUrl,
                  buttons: defaultFlow.welcomeButtons,
                },
              },
            ]),
            flowData: JSON.stringify(defaultFlow),
            isActive: true,
          },
        });
        rules = [createdRule];
      }

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) return { executed: false };

      const rawMsg = (messageText || '').trim();
      const normalizedMsg = rawMsg.toLowerCase().replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
      const cleanDigits = rawMsg.replace(/\D/g, '');
      const words = normalizedMsg.split(/[\s,.;:!?#*]+/).filter(Boolean);

      const GREETING_WORDS = [
        'hi', 'hello', 'hey', 'start', 'menu', 'namaste', 'help', 'info',
        'hlo', 'hii', 'hiii', 'helo', 'restart', 'home', 'store', 'options',
        'good morning', 'good afternoon', 'good evening',
      ];

      for (const rule of rules) {
        let conditions: any = {};
        try {
          conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || {});
        } catch {
          conditions = {};
        }

        let isBranchMatched = false;
        let isGreetingTriggerMatched = false;
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

        if (parsedFlowData && parsedFlowData.defaultAction) {
          defaultFlowAction = parsedFlowData.defaultAction;
        }

        // 1. Check if matching any specific branch inside flowData (Number 1-6 or branch keywords)
        if (parsedFlowData && parsedFlowData.branches && Array.isArray(parsedFlowData.branches)) {
          for (const branch of parsedFlowData.branches) {
            const bVal = String(branch.value || '').trim().toLowerCase();
            const bTitle = String(branch.title || '').trim().toLowerCase();
            const bId = String(branch.id || '').trim().toLowerCase();

            // Match choice numbers (e.g. "1", "option 1", "choice 1", "#1", "1.")
            if (cleanDigits && (cleanDigits === bVal || bVal.includes(cleanDigits))) {
              isBranchMatched = true;
              matchedBranchActions = branch.actions || [];
              break;
            }

            // Match branch value or title
            if (
              normalizedMsg === bVal ||
              words.includes(bVal) ||
              normalizedMsg.includes(bTitle) ||
              (bTitle && words.some((w) => bTitle.includes(w) && w.length >= 4)) ||
              normalizedMsg === bId
            ) {
              isBranchMatched = true;
              matchedBranchActions = branch.actions || [];
              break;
            }
          }
        }

        // 2. If not a specific branch, check if it matches the Main Greeting / Trigger Keywords
        if (!isBranchMatched) {
          const userKeywords: string[] = [];
          if (conditions.keyword) {
            const extra = String(conditions.keyword).split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
            userKeywords.push(...extra);
          }
          if (parsedFlowData?.triggerKeyword) {
            const extra = String(parsedFlowData.triggerKeyword).split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
            userKeywords.push(...extra);
          }

          const allTriggers = Array.from(new Set([...GREETING_WORDS, ...userKeywords]));

          // Exact match or contains greeting word
          if (
            allTriggers.includes(normalizedMsg) ||
            words.some((w) => allTriggers.includes(w)) ||
            allTriggers.some((kw) => normalizedMsg === kw || normalizedMsg.startsWith(`${kw} `) || normalizedMsg.endsWith(` ${kw}`))
          ) {
            isGreetingTriggerMatched = true;
          } else if (rule.trigger === AutomationTrigger.MESSAGE_RECEIVED && userKeywords.length === 0) {
            // General catch-all message received
            isGreetingTriggerMatched = true;
          }
        }

        if (!isBranchMatched && !isGreetingTriggerMatched) {
          continue;
        }

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { executionCount: { increment: 1 } },
        });

        let actionsToExecute: any[] = [];

        if (isBranchMatched && matchedBranchActions && matchedBranchActions.length > 0) {
          // User picked a specific branch option (e.g. 1. Catalog, 3. Coupon, 6. Manager)
          actionsToExecute = matchedBranchActions;
        } else if (isGreetingTriggerMatched) {
          // User sent greeting (e.g. "hi", "hello", "menu", "start") -> SEND WELCOME FLOW
          if (parsedFlowData?.welcomeText) {
            actionsToExecute = [
              {
                type: AutomationActionType.SEND_MESSAGE,
                payload: {
                  text: parsedFlowData.welcomeText,
                  mediaUrl: parsedFlowData.welcomeMediaUrl,
                  buttons: parsedFlowData.welcomeButtons,
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
        } else if (defaultFlowAction && defaultFlowAction.text) {
          actionsToExecute = [
            {
              type: defaultFlowAction.type || AutomationActionType.SEND_MESSAGE,
              payload: defaultFlowAction,
            },
          ];
        }

        if (actionsToExecute.length === 0) continue;

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
