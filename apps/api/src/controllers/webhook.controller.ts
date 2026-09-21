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

    // 5. Detect Intent
    const intent = await AiService.detectIntent(text);
    logger.info(`Detected Intent for "${text}": ${intent}`);

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

      const replyText = `🧑‍💼 We have connected you with our store team! A customer representative will reply to you here shortly.`;
      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: replyText,
        conversationId: conversation.id,
        customerId: customer.id,
      });

      SocketServer.emitToOrg(organizationId, 'conversation:updated', {
        id: conversation.id,
        status: ConversationStatus.HUMAN_REQUIRED,
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, outgoingResponse };
    }

    // Intent Handler: GREETING
    if (intent === CustomerIntent.GREETING) {
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

    // Intent Handler: OFFERS
    if (intent === CustomerIntent.OFFERS) {
      const discountedProducts = await prisma.product.findMany({
        where: {
          organizationId,
          isActive: true,
          discountPrice: { not: null },
        },
        take: 3,
        orderBy: { discountPrice: 'asc' },
      });

      let offerText = `🎉 *Special Offers & Deals Today!*\n\n`;
      if (discountedProducts.length > 0) {
        for (const p of discountedProducts) {
          offerText += `✨ *${p.name}*\n💰 ₹${p.discountPrice} (Orig: ₹${p.price})\n\n`;
        }
        offerText += `Reply with the product name to order!`;
      } else {
        offerText += `Enjoy free express shipping on all orders over ₹999! Browse our catalog anytime.`;
      }

      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: offerText,
        conversationId: conversation.id,
        customerId: customer.id,
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, outgoingResponse };
    }

    // Intent Handler: FAQ & STORE_INFO
    if (intent === CustomerIntent.FAQ || intent === CustomerIntent.STORE_INFO) {
      const faqAnswer = await AiService.answerFaq(organizationId, text);
      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: faqAnswer,
        conversationId: conversation.id,
        customerId: customer.id,
      });

      return { conversation, customer, inboundMessage: savedInbound, intent, outgoingResponse };
    }

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

    // Intent Handler: PRODUCT_SEARCH & Default
    const filters = await AiService.extractSearchFilters(text);
    const products = await AiService.searchProductsFromDatabase(organizationId, filters, 3);

    // Save AI Search Query record
    await prisma.aiSearch.create({
      data: {
        organizationId,
        customerId: customer.id,
        query: text,
        extractedFilters: JSON.stringify(filters),
        resultsCount: products.length,
      },
    });

    if (products.length > 0) {
      // Send the top matching product card
      const topProduct = products[0];
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
    } else {
      const fallbackText = `I couldn't find an exact match for "${text}".\n\nWould you like to browse our full collection or speak with our sales team? Reply *"MENU"* or *"SUPPORT"*.`;
      outgoingResponse = await WhatsAppService.sendMessage({
        organizationId,
        to: customer.phone,
        content: fallbackText,
        conversationId: conversation.id,
        customerId: customer.id,
      });
    }

    return { conversation, customer, inboundMessage: savedInbound, intent, productsFound: products.length, outgoingResponse };
  }
}
