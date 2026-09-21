import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { SocketServer } from '../sockets/index.js';
import { AiService } from '../services/ai.service.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { AutomationService } from '../services/automation.service.js';
import { NotificationService } from '../services/notification.service.js';
import { CustomerIntent, ConversationStatus, LeadStatus, MessageDirection, MessageStatus, MessageType, AutomationTrigger } from '@chatflow/shared';

export class WebhookController {
  /**
   * 1. GET /api/webhooks/whatsapp - Meta Verification Handshake
   */
  public static async verifyWebhook(req: Request, res: Response) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode && token) {
        if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
          logger.info('Meta WhatsApp Webhook verified successfully');
          return res.status(200).send(challenge);
        } else {
          logger.warn(`Webhook verification token mismatch: received ${token}, expected ${config.whatsapp.verifyToken}`);
          return res.status(403).json({ error: 'Verification token mismatch' });
        }
      }

      return res.status(400).json({ error: 'Missing hub verification parameters' });
    } catch (err) {
      logger.error('Error verifying Meta webhook:', err);
      return res.status(500).json({ error: 'Webhook verification error' });
    }
  }

  /**
   * 2. POST /api/webhooks/whatsapp - Inbound Meta Webhook Receiver
   */
  public static async handleWebhook(req: Request, res: Response) {
    // Acknowledge Meta immediately with 200 OK so Meta doesn't retry
    res.status(200).send('EVENT_RECEIVED');

    try {
      const body = req.body;
      if (body.object !== 'whatsapp_business_account') {
        return;
      }

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value) continue;

          // Process Message Status Updates (sent, delivered, read, failed)
          if (value.statuses && value.statuses.length > 0) {
            for (const statusObj of value.statuses) {
              const waMsgId = statusObj.id;
              const newStatus = statusObj.status?.toUpperCase();

              if (waMsgId && newStatus) {
                await prisma.message.updateMany({
                  where: { whatsappMessageId: waMsgId },
                  data: { status: newStatus },
                });
              }
            }
          }

          // Process Incoming Messages
          if (value.messages && value.messages.length > 0) {
            const phoneNumberId = value.metadata?.phone_number_id;

            // Match organization by phone number ID or default to first organization
            let organization = await prisma.organization.findFirst({
              where: {
                whatsappAccount: {
                  phoneNumberId,
                },
              },
              include: { settings: true },
            });

            if (!organization) {
              organization = await prisma.organization.findFirst({
                include: { settings: true },
              });
            }

            if (!organization) {
              logger.warn('No organization found for inbound webhook message');
              continue;
            }

            for (const msg of value.messages) {
              const senderPhone = msg.from;
              const contactName = value.contacts?.[0]?.profile?.name || `Customer +${senderPhone}`;
              const messageText = msg.text?.body || (msg.type === 'interactive' ? msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title : '') || '';
              const whatsappMessageId = msg.id;

              await WebhookController.processInboundMessage({
                organizationId: organization.id,
                phone: senderPhone,
                name: contactName,
                text: messageText,
                whatsappMessageId,
                settings: organization.settings,
              });
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error handling incoming WhatsApp webhook:', err);
    }
  }

  /**
   * 3. POST /api/webhooks/simulate - Direct Interactive Simulator for Testing
   */
  public static async simulateIncoming(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, phone = '+919876543210', name = 'Simulated Customer', text = 'Hi, show me black shirts under 1500' } = req.body;

      const targetOrgId = organizationId || req.organizationId;
      if (!targetOrgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: targetOrgId },
        include: { settings: true },
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const mockMsgId = `sim_wa_${Date.now()}`;

      // Run processor
      const result = await WebhookController.processInboundMessage({
        organizationId: targetOrgId,
        phone,
        name,
        text,
        whatsappMessageId: mockMsgId,
        settings: organization.settings,
      });

      return res.json({
        success: true,
        message: 'Simulated WhatsApp message processed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Core Processor for Inbound Message
   */
  public static async processInboundMessage(params: {
    organizationId: string;
    phone: string;
    name: string;
    text: string;
    whatsappMessageId: string;
    settings?: any;
  }) {
    const { organizationId, phone, name, text, whatsappMessageId, settings } = params;

    // 1. Find or create Customer
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    let customer = await prisma.customer.findUnique({
      where: {
        organizationId_phone: {
          organizationId,
          phone: normalizedPhone,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId,
          phone: normalizedPhone,
          name,
          tags: JSON.stringify(['WhatsApp Inbound']),
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastInteractionAt: new Date() },
      });
    }

    // 2. Find or create Conversation
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
          lastMessageText: text.substring(0, 200),
          unreadCount: 1,
        },
      });
    } else {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageText: text.substring(0, 200),
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
        },
      });
    }

    // 3. Store Inbound Message
    const savedInbound = await prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        customerId: customer.id,
        direction: MessageDirection.INBOUND,
        type: MessageType.TEXT,
        status: MessageStatus.READ,
        content: text,
        whatsappMessageId,
      },
    });

    // Real-time notification of inbound message
    SocketServer.emitToConversation(conversation.id, 'message:new', savedInbound);
    SocketServer.emitToOrg(organizationId, 'conversation:inbound', {
      conversationId: conversation.id,
      customer,
      message: savedInbound,
    });

    // Privacy & Personal Contact Filter
    const cleanSender = normalizedPhone.replace(/\D/g, '');
    let isExcluded = false;

    if (settings) {
      // 1. Check blacklist of excluded numbers (family / personal friends)
      if (settings.excludedNumbers && typeof settings.excludedNumbers === 'string') {
        const blacklist = settings.excludedNumbers
          .split(',')
          .map((n: string) => n.replace(/\D/g, ''))
          .filter(Boolean);

        for (const ex of blacklist) {
          if (cleanSender.endsWith(ex) || ex.endsWith(cleanSender)) {
            isExcluded = true;
            logger.info(`[Privacy Filter] Ignored automated replies for excluded personal number: ${normalizedPhone}`);
            break;
          }
        }
      }

      // 2. Check "Only Unsaved Contacts" filter
      if (!isExcluded && settings.onlyUnsavedContacts) {
        // If the contact on device has a real named title (not a generic fallback like Customer +...)
        const isNamedContact = name && !name.startsWith('Customer +') && !name.startsWith('+') && !name.startsWith('Customer ');
        if (isNamedContact) {
          isExcluded = true;
          logger.info(`[Privacy Filter] Ignored automated replies for saved device contact: ${name} (${normalizedPhone})`);
        }
      }
    }

    // If contact is excluded from automation, exit early without sending bot replies
    if (isExcluded) {
      return {
        handledBy: 'PERSONAL_FILTER_EXCLUDED',
        reply: null,
      };
    }

    // 4. Trigger automations for KEYWORD_MATCH / MESSAGE_RECEIVED
    const autoResult = await AutomationService.processRules({
      organizationId,
      trigger: AutomationTrigger.MESSAGE_RECEIVED,
      customerId: customer.id,
      conversationId: conversation.id,
      messageText: text,
    });

    if (autoResult.executed && autoResult.outgoingResponse) {
      return {
        conversation,
        customer,
        inboundMessage: savedInbound,
        handledBy: 'AUTOMATION_RULE',
        outgoingResponse: autoResult.outgoingResponse,
      };
    }

    // If conversation is in HUMAN_REQUIRED status, do NOT auto-reply with AI
    if (conversation.status === ConversationStatus.HUMAN_REQUIRED) {
      logger.info(`Conversation ${conversation.id} is in HUMAN_REQUIRED status. Skipping AI auto-reply.`);
      return { conversation, customer, inboundMessage: savedInbound, handledBy: 'HUMAN_SUPPORT' };
    }

    // Check if AI Auto Reply is disabled in settings
    if (settings && settings.aiAutoReplyEnabled === false) {
      return { conversation, customer, inboundMessage: savedInbound, handledBy: 'AI_DISABLED' };
    }

    // Fetch recent conversation history for multi-turn AI context
    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        id: { not: savedInbound.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    const conversationHistory = recentMessages.reverse().map((m) => ({
      role: (m.direction === MessageDirection.INBOUND ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    // 5. Generate Custom Business Trained AI Response
    const aiResult = await AiService.generateBusinessAiReply({
      organizationId,
      customerMessage: text,
      customerName: customer.name,
      conversationHistory,
    });

    const intent = aiResult.detectedIntent;
    logger.info(`Trained AI generated reply for "${text}" (Intent: ${intent}, Sources: ${aiResult.sourcesUsed.join(', ')})`);

    let outgoingResponse: any = null;

    // Intent Handler: HUMAN_SUPPORT
    if (intent === CustomerIntent.HUMAN_SUPPORT) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: ConversationStatus.HUMAN_REQUIRED },
      });

      await NotificationService.create({
        organizationId,
        title: 'Human Support Requested',
        message: `${customer.name} (${customer.phone}) requested human support: "${text}"`,
        type: 'SUPPORT',
        link: `/dashboard/inbox?conv=${conversation.id}`,
      });

      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: aiResult.replyText,
        conversationId: conversation.id,
        customerId: customer.id,
      });

      SocketServer.emitToOrg(organizationId, 'conversation:updated', {
        id: conversation.id,
        status: ConversationStatus.HUMAN_REQUIRED,
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, outgoingResponse };
    }

    // Intent Handler: GREETING Shortcut
    if (intent === CustomerIntent.GREETING && (text.trim() === '0' || text.trim().toLowerCase() === 'menu')) {
      const welcomeMsg = settings?.welcomeMessage || `👋 Welcome to our store! Tap an option or reply with a number:\n1️⃣ 🛍️ Browse Trending Products\n2️⃣ 🔍 Search a Product\n3️⃣ 🏷️ Offers & Deals\n4️⃣ 🧑‍💼 Talk to Support\n5️⃣ 📍 Store Location & Hours\n6️⃣ 🛒 Order Online Now`;
      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: welcomeMsg,
        conversationId: conversation.id,
        customerId: customer.id,
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, outgoingResponse };
    }

    // Intent Handler: Search Guide Shortcut
    if (text.trim() === '2') {
      const searchGuideText = `🔍 *Search Our Catalog:*\n\nSimply type what you are looking for!\nFor example:\n• *Black shirts under 1500*\n• *Red kurti in size M*\n• *Sneakers under 2000*\n• *Cotton jeans*`;
      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: searchGuideText,
        conversationId: conversation.id,
        customerId: customer.id,
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, outgoingResponse };
    }

    // Check if products were found and user is specifically searching products
    if (aiResult.products && aiResult.products.length > 0 && (intent === CustomerIntent.PRODUCT_SEARCH || intent === CustomerIntent.PRODUCT_DETAILS)) {
      const topProduct = aiResult.products[0];
      const images = JSON.parse(topProduct.images || '[]');

      outgoingResponse = await WhatsAppService.sendProductMessage(
        organizationId,
        customer.phone,
        conversation.id,
        customer.id,
        {
          id: topProduct.id,
          name: topProduct.name,
          price: topProduct.price,
          discountPrice: topProduct.discountPrice,
          description: topProduct.description,
          images,
          stockStatus: topProduct.stockStatus,
        },
        settings?.currency || 'INR'
      );

      // Create or update Lead for the customer
      const existingLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          customerId: customer.id,
          status: { notIn: [LeadStatus.CONVERTED, LeadStatus.LOST] },
        },
      });

      if (!existingLead) {
        const lead = await prisma.lead.create({
          data: {
            organizationId,
            customerId: customer.id,
            productId: topProduct.id,
            status: LeadStatus.INTERESTED,
            source: 'WHATSAPP_AI_SEARCH',
            estimatedValue: topProduct.discountPrice || topProduct.price,
            notes: `Customer queried: "${text}". Auto-matched ${topProduct.name}`,
            events: {
              create: {
                organizationId,
                toStatus: LeadStatus.INTERESTED,
                note: `AI identified interest in ${topProduct.name}`,
              },
            },
          },
          include: { customer: true, product: true },
        });

        SocketServer.emitToOrg(organizationId, 'lead:created', lead);
      }

      // Increment product enquiry count
      await prisma.product.update({
        where: { id: topProduct.id },
        data: { enquiryCount: { increment: 1 } },
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, productsFound: aiResult.products.length, outgoingResponse };
    }

    // Default & Custom Business Reply (FAQs, knowledge base, policies, custom prompt)
    outgoingResponse = await WhatsAppService.sendMessage({
      organizationId,
      to: customer.phone,
      content: aiResult.replyText,
      conversationId: conversation.id,
      customerId: customer.id,
    });

    return {
      conversation,
      customer,
      inboundMessage: savedInbound,
      intent,
      sourcesUsed: aiResult.sourcesUsed,
      outgoingResponse,
    };
  }
}
