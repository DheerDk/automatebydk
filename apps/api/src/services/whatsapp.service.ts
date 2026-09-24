import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { BaileysService } from './baileys.service.js';
import { MessageDirection, MessageStatus, MessageType } from '@chatflow/shared';

export interface SendMessageOptions {
  organizationId: string;
  to: string; // E.164 phone number without plus (e.g. 919876543210)
  content: string;
  type?: MessageType;
  mediaUrl?: string;
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  header?: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  list?: {
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  };
  metadata?: any;
  conversationId?: string;
  customerId?: string;
}

export class WhatsAppService {
  /**
   * Validate Meta Webhook Signature (X-Hub-Signature-256)
   */
  public static verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return true;

    try {
      const elements = signatureHeader.split('=');
      const signatureHash = elements[1];
      const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      return signatureHash === expectedHash;
    } catch (err) {
      logger.error('Error validating Meta webhook signature:', err);
      return false;
    }
  }

  /**
   * Send WhatsApp Message (Text, Image, Location, Buttons, List, Template, Interactive)
   */
  public static async sendMessage(options: SendMessageOptions): Promise<{ whatsappMessageId: string; status: MessageStatus; content?: string; mediaUrl?: string }> {
    const {
      organizationId,
      to,
      content,
      type = MessageType.TEXT,
      mediaUrl,
      location,
      header,
      footer,
      buttons,
      list,
      metadata = {},
      conversationId,
      customerId,
    } = options;

    let whatsappMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let status: MessageStatus = MessageStatus.SENT;

    // Build rich metadata for interactive messages
    const enrichedMetadata = { ...metadata };
    if (buttons && buttons.length > 0) {
      enrichedMetadata.interactiveType = 'BUTTONS';
      enrichedMetadata.buttons = buttons;
      if (header) enrichedMetadata.header = header;
      if (footer) enrichedMetadata.footer = footer;
    } else if (list && list.sections && list.sections.length > 0) {
      enrichedMetadata.interactiveType = 'LIST';
      enrichedMetadata.list = list;
      if (header) enrichedMetadata.header = header;
      if (footer) enrichedMetadata.footer = footer;
    }

    // Check if connected via Baileys QR Code session
    if (BaileysService.isConnected(organizationId)) {
      try {
        const baileysRes = await BaileysService.sendMessage({
          organizationId,
          to,
          content,
          mediaUrl,
          location,
          header,
          footer,
          buttons,
          list,
        });
        whatsappMessageId = baileysRes.whatsappMessageId;
        status = MessageStatus.SENT;
      } catch (err: any) {
        logger.error('[WhatsAppService] Error sending via Baileys:', err.message);
        status = MessageStatus.FAILED;
      }
    } else {
      const waAccount = await prisma.whatsAppAccount.findUnique({
        where: { organizationId },
      });

      const isMock = config.whatsapp.mock || !waAccount || !waAccount.accessToken || waAccount.accessToken === 'dev_token' || waAccount.accessToken === 'baileys_linked_session';

      if (!isMock && waAccount) {
      try {
        const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${waAccount.phoneNumberId}/messages`;
        
        let payload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''),
        };

        if (buttons && buttons.length > 0) {
          // Native Meta Interactive Quick Reply Buttons
          payload.type = 'interactive';
          payload.interactive = {
            type: 'button',
            ...(header ? { header: { type: 'text', text: header } } : {}),
            body: { text: content },
            ...(footer ? { footer: { text: footer } } : {}),
            action: {
              buttons: buttons.slice(0, 3).map((b, i) => ({
                type: 'reply',
                reply: {
                  id: (b.id || `btn_${i + 1}`).substring(0, 256),
                  title: (b.title || `Option ${i + 1}`).substring(0, 20),
                },
              })),
            },
          };
        } else if (list && list.sections && list.sections.length > 0) {
          // Native Meta Interactive List Menu
          payload.type = 'interactive';
          payload.interactive = {
            type: 'list',
            ...(header ? { header: { type: 'text', text: header } } : {}),
            body: { text: content },
            ...(footer ? { footer: { text: footer } } : {}),
            action: {
              button: (list.buttonText || 'Choose Option').substring(0, 20),
              sections: list.sections.slice(0, 10).map((sec) => ({
                title: (sec.title || 'Options').substring(0, 24),
                rows: (sec.rows || []).slice(0, 10).map((row, rIdx) => ({
                  id: (row.id || `row_${rIdx + 1}`).substring(0, 200),
                  title: (row.title || `Item ${rIdx + 1}`).substring(0, 24),
                  ...(row.description ? { description: row.description.substring(0, 72) } : {}),
                })),
              })),
            },
          };
        } else if (type === MessageType.TEXT) {
          payload.type = 'text';
          payload.text = { preview_url: true, body: content };
        } else if (type === MessageType.IMAGE && mediaUrl) {
          payload.type = 'image';
          payload.image = { link: mediaUrl, caption: content };
        } else if (type === MessageType.TEMPLATE && metadata?.templateName) {
          payload.type = 'template';
          payload.template = {
            name: metadata.templateName,
            language: { code: metadata.language || 'en' },
            components: metadata.components || [],
          };
        } else if (type === MessageType.INTERACTIVE && metadata?.interactive) {
          payload.type = 'interactive';
          payload.interactive = metadata.interactive;
        } else {
          payload.type = 'text';
          payload.text = { body: content };
        }

        const response = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${waAccount.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        if (response.data?.messages?.[0]?.id) {
          whatsappMessageId = response.data.messages[0].id;
          status = MessageStatus.SENT;
        }
      } catch (error: any) {
        logger.error('WhatsApp API Error:', {
          error: error.response?.data || error.message,
          to,
          organizationId,
        });
        status = MessageStatus.FAILED;
      }
    } else {
      logger.info(`[MOCK WHATSAPP] Outbound message to ${to}: "${content}" (Type: ${type})`);
    }
  }

    if (conversationId && customerId) {
      await prisma.message.create({
        data: {
          organizationId,
          conversationId,
          customerId,
          direction: MessageDirection.OUTBOUND,
          type: (buttons?.length || list?.sections?.length) ? MessageType.INTERACTIVE : (type as string),
          status: status as string,
          content,
          mediaUrl,
          metadata: Object.keys(enrichedMetadata).length > 0 ? JSON.stringify(enrichedMetadata) : null,
          whatsappMessageId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageText: content.substring(0, 200),
          lastMessageAt: new Date(),
        },
      });
    }

    return { whatsappMessageId, status, content, mediaUrl };
  }

  /**
   * Helper: Send formatted Product Cards to WhatsApp
   */
  public static async sendProductMessage(
    organizationId: string,
    to: string,
    conversationId: string,
    customerId: string,
    product: {
      id: string;
      name: string;
      price: number;
      discountPrice?: number | null;
      description?: string | null;
      images: string[];
      stockStatus: string;
    },
    currency = 'INR'
  ) {
    const formattedPrice = `${currency} ${product.price.toLocaleString()}`;
    const formattedDiscount = product.discountPrice ? ` (Offer: ${currency} ${product.discountPrice.toLocaleString()})` : '';
    
    let text = `🛍️ *${product.name}*\n`;
    text += `💰 *Price:* ${formattedPrice}${formattedDiscount}\n`;
    text += `📦 *Availability:* ${product.stockStatus.replace('_', ' ')}\n`;
    if (product.description) {
      text += `\n${product.description.substring(0, 150)}...\n`;
    }
    text += `\n👉 Reply with *"BUY"* or ask any question about this item!`;

    const imageUrl = product.images?.[0];

    return this.sendMessage({
      organizationId,
      to,
      content: text,
      type: imageUrl ? MessageType.IMAGE : MessageType.TEXT,
      mediaUrl: imageUrl,
      metadata: { productId: product.id },
      conversationId,
      customerId,
    });
  }
}
