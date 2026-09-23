import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { MessageType, MessageDirection, MessageStatus } from '@chatflow/shared';
import { logger } from '../utils/logger.js';

const STARTER_TEMPLATES = [
  {
    name: 'order_status_update',
    category: 'UTILITY',
    language: 'en',
    body: 'Hi {{1}}, your order #{{2}} has been confirmed and is now being prepared! Track your shipment live below.',
    variables: ['Customer Name', 'Order ID'],
    footerText: 'Thank you for choosing us!',
    buttons: [
      { type: 'URL', text: 'Track Order Live 📦', url: 'https://automatebydk.pages.dev/track' },
      { type: 'QUICK_REPLY', text: 'Need Help 🧑‍💼' },
    ],
  },
  {
    name: 'festive_vip_discount',
    category: 'MARKETING',
    language: 'en',
    body: 'Hello {{1}}! 🎉 Exclusive VIP Sale is now live! Get Flat {{2}}% OFF on all catalog items today using code {{3}}.',
    variables: ['Customer Name', 'Discount %', 'Coupon Code'],
    headerType: 'TEXT',
    headerText: '🌟 Exclusive VIP Offer',
    footerText: 'Valid for next 24 hours only',
    buttons: [
      { type: 'URL', text: 'Claim Offer Online 🛍️', url: 'https://automatebydk.pages.dev' },
      { type: 'QUICK_REPLY', text: 'Browse Catalog' },
    ],
  },
  {
    name: 'appointment_confirmation',
    category: 'UTILITY',
    language: 'en',
    body: 'Dear {{1}}, your appointment for {{2}} is confirmed for {{3}} at {{4}}. Please arrive 10 minutes prior.',
    variables: ['Patient Name', 'Doctor / Service', 'Date', 'Time'],
    footerText: 'Need to reschedule? Reply RESCHEDULE',
    buttons: [
      { type: 'URL', text: 'Get Directions 📍', url: 'https://maps.google.com' },
      { type: 'PHONE_NUMBER', text: 'Call Reception 📞', phoneNumber: '+919988011223' },
    ],
  },
  {
    name: 'instant_otp_verification',
    category: 'AUTHENTICATION',
    language: 'en',
    body: '{{1}} is your official verification security code. Do not share this OTP with anyone, including support staff.',
    variables: ['OTP Code'],
    footerText: 'Expires in 10 minutes',
    buttons: [{ type: 'QUICK_REPLY', text: 'Copy OTP' }],
  },
  {
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'en',
    body: 'Hi {{1}}, a friendly reminder regarding your pending invoice #{{2}} for amount ₹{{3}}. Kindly complete payment via the link below.',
    variables: ['Customer Name', 'Invoice #', 'Amount'],
    footerText: 'AutoMate Secure Payments',
    buttons: [
      { type: 'URL', text: 'Pay Securely Now 💳', url: 'https://automatebydk.pages.dev/billing' },
    ],
  },
  {
    name: 'lead_follow_up',
    category: 'MARKETING',
    language: 'en',
    body: 'Hello {{1}}! Thank you for showing interest in {{2}}. Our sales team is ready to provide you with the best quote. Would you like a quick callback?',
    variables: ['Customer Name', 'Product / Service Name'],
    footerText: 'Reply YES for callback',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Request Callback 📞' },
      { type: 'QUICK_REPLY', text: 'View Catalog 🛍️' },
    ],
  },
];

export class TemplateController {
  /**
   * List all templates (auto-seeds starter templates if fresh organization)
   */
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      let templates = await prisma.messageTemplate.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      // Auto-seed starter templates on first load
      if (templates.length === 0) {
        for (const st of STARTER_TEMPLATES) {
          try {
            await prisma.messageTemplate.create({
              data: {
                organizationId,
                name: st.name,
                category: st.category,
                language: st.language,
                body: st.body,
                variables: JSON.stringify({
                  variables: st.variables,
                  headerType: st.headerType || 'NONE',
                  headerText: st.headerText,
                  footerText: st.footerText,
                  buttons: st.buttons,
                }),
                status: 'APPROVED',
              },
            });
          } catch (e) {
            // Ignore unique conflict if created concurrently
          }
        }

        templates = await prisma.messageTemplate.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        });
      }

      const formatted = templates.map((t) => {
        let meta: any = {};
        try {
          meta = JSON.parse(t.variables || '{}');
        } catch {
          meta = {};
        }

        const variables = Array.isArray(meta) ? meta : (meta.variables || []);
        return {
          ...t,
          variables,
          headerType: meta.headerType || 'NONE',
          headerText: meta.headerText || '',
          headerMediaUrl: meta.headerMediaUrl || '',
          footerText: meta.footerText || '',
          buttons: meta.buttons || [],
        };
      });

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create custom template
   */
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const {
        name,
        category = 'MARKETING',
        language = 'en',
        body,
        variables = [],
        headerType = 'NONE',
        headerText,
        headerMediaUrl,
        footerText,
        buttons = [],
      } = req.body;

      if (!name || !body) {
        throw new AppError('Template name and body are required', 400);
      }

      const metaPayload = {
        variables: Array.isArray(variables) ? variables : [],
        headerType,
        headerText,
        headerMediaUrl,
        footerText,
        buttons,
      };

      const template = await prisma.messageTemplate.create({
        data: {
          organizationId,
          name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          category,
          language,
          body,
          variables: JSON.stringify(metaPayload),
          status: 'APPROVED',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Message template created successfully',
        data: {
          ...template,
          variables: metaPayload.variables,
          headerType,
          headerText,
          headerMediaUrl,
          footerText,
          buttons,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update custom template
   */
  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const {
        name,
        category,
        language,
        body,
        variables,
        headerType,
        headerText,
        headerMediaUrl,
        footerText,
        buttons,
      } = req.body;

      const existing = await prisma.messageTemplate.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Template not found', 404);
      }

      let existingMeta: any = {};
      try {
        existingMeta = JSON.parse(existing.variables || '{}');
      } catch {
        existingMeta = {};
      }

      const metaPayload = {
        variables: variables !== undefined ? variables : (Array.isArray(existingMeta) ? existingMeta : (existingMeta.variables || [])),
        headerType: headerType ?? existingMeta.headerType ?? 'NONE',
        headerText: headerText !== undefined ? headerText : existingMeta.headerText,
        headerMediaUrl: headerMediaUrl !== undefined ? headerMediaUrl : existingMeta.headerMediaUrl,
        footerText: footerText !== undefined ? footerText : existingMeta.footerText,
        buttons: buttons !== undefined ? buttons : (existingMeta.buttons || []),
      };

      const updated = await prisma.messageTemplate.update({
        where: { id },
        data: {
          name: name ? name.toLowerCase().replace(/[^a-z0-9_]/g, '_') : existing.name,
          category: category ?? existing.category,
          language: language ?? existing.language,
          body: body ?? existing.body,
          variables: JSON.stringify(metaPayload),
        },
      });

      return res.json({
        success: true,
        message: 'Template updated successfully',
        data: {
          ...updated,
          variables: metaPayload.variables,
          headerType: metaPayload.headerType,
          headerText: metaPayload.headerText,
          headerMediaUrl: metaPayload.headerMediaUrl,
          footerText: metaPayload.footerText,
          buttons: metaPayload.buttons,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete template
   */
  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const existing = await prisma.messageTemplate.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Template not found', 404);
      }

      await prisma.messageTemplate.delete({ where: { id } });
      return res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Template to Custom Recipients with Dynamic Variable Substitution
   */
  public static async sendTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const {
        recipients, // string or string[] e.g. ["+919876543210", "+919811223344"] or "+919876543210"
        variableValues = {}, // Record<string, string> e.g. { "1": "Rahul", "2": "ORD100", "Customer Name": "Rahul" }
        headerMediaUrl,
        sendToAllLeads = false,
      } = req.body;

      // Find template
      let template: any = null;
      if (id && id !== 'custom') {
        template = await prisma.messageTemplate.findFirst({
          where: { id, organizationId },
        });
      }

      let templateBody = template?.body || req.body.body;
      if (!templateBody) {
        throw new AppError('Template body is required to send messages', 400);
      }

      // Collect recipient phone numbers
      let targetPhones: string[] = [];

      if (sendToAllLeads) {
        const leads = await prisma.lead.findMany({
          where: { organizationId },
          include: { customer: true },
        });
        targetPhones = leads.map((l) => l.customer?.phone).filter(Boolean) as string[];
      } else if (Array.isArray(recipients)) {
        targetPhones = recipients;
      } else if (typeof recipients === 'string') {
        targetPhones = recipients.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
      }

      if (targetPhones.length === 0) {
        throw new AppError('Please specify at least one recipient phone number', 400);
      }

      // Remove duplicates & format numbers
      const uniquePhones = Array.from(new Set(targetPhones.map((p) => p.trim())));

      let meta: any = {};
      if (template?.variables) {
        try {
          meta = JSON.parse(template.variables);
        } catch {}
      }

      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const phone of uniquePhones) {
        try {
          const cleanPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
          const rawDigits = cleanPhone.replace(/\D/g, '');

          if (rawDigits.length < 10) {
            failedCount++;
            errors.push(`Invalid phone format: ${phone}`);
            continue;
          }

          // 1. Find or create Customer
          let customer = await prisma.customer.findFirst({
            where: { organizationId, phone: cleanPhone },
          });

          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                organizationId,
                phone: cleanPhone,
                name: variableValues['1'] || variableValues['Customer Name'] || `Contact ${cleanPhone.slice(-4)}`,
              },
            });
          }

          // 2. Find or create Conversation
          let conversation = await prisma.conversation.findFirst({
            where: { organizationId, customerId: customer.id },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                organizationId,
                customerId: customer.id,
                status: 'AI_ACTIVE',
              },
            });
          }

          // 3. Substitute variables in template text
          let finalizedText = templateBody;
          
          // Substitute numbered variables {{1}}, {{2}}...
          for (let i = 1; i <= 10; i++) {
            const val = variableValues[String(i)] || variableValues[`{{${i}}}`] || variableValues[String(i - 1)];
            if (val !== undefined) {
              finalizedText = finalizedText.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), val);
            }
          }

          // Substitute named variables e.g. {{name}}, {{Customer Name}}
          for (const [k, v] of Object.entries(variableValues)) {
            if (typeof v === 'string') {
              finalizedText = finalizedText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), v);
            }
          }

          // Substitute fallback customer name if still contains {{1}}
          if (finalizedText.includes('{{1}}') && customer.name) {
            finalizedText = finalizedText.replace(/\{\{1\}\}/g, customer.name);
          }

          // Append header and footer text if configured
          const header = meta.headerType === 'TEXT' && meta.headerText ? `*${meta.headerText}*\n\n` : '';
          const footer = meta.footerText ? `\n\n_${meta.footerText}_` : '';
          const fullMessage = `${header}${finalizedText}${footer}`;

          // Dispatch message
          const media = headerMediaUrl || meta.headerMediaUrl;
          const result = await WhatsAppService.sendMessage({
            organizationId,
            to: cleanPhone,
            content: fullMessage,
            type: media ? MessageType.IMAGE : MessageType.TEXT,
            mediaUrl: media,
            conversationId: conversation.id,
            customerId: customer.id,
          });

          // Create database message record
          await prisma.message.create({
            data: {
              organizationId,
              conversationId: conversation.id,
              customerId: customer.id,
              direction: MessageDirection.OUTBOUND,
              type: media ? MessageType.IMAGE : MessageType.TEXT,
              content: fullMessage,
              mediaUrl: media || null,
              status: result.status || MessageStatus.SENT,
              whatsappMessageId: result.whatsappMessageId,
            },
          });

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(),
            },
          });

          sentCount++;
        } catch (err: any) {
          failedCount++;
          logger.error(`[Template Send] Error sending to ${phone}:`, err);
          errors.push(`${phone}: ${err.message || 'Failed'}`);
        }
      }

      return res.json({
        success: true,
        sentCount,
        failedCount,
        message: `Template sent to ${sentCount} recipient(s) successfully!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
}
