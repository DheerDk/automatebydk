import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { SocketServer } from '../sockets/index.js';
import { MessageDirection, MessageStatus, MessageType } from '@chatflow/shared';

export class MessageController {
  public static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const {
        conversationId,
        content,
        type = MessageType.TEXT,
        mediaUrl,
        productId,
        header,
        footer,
        buttons,
        list,
      } = req.body;

      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        include: { customer: true },
      });

      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }

      let outgoingContent = content;
      let finalMediaUrl = mediaUrl;
      let metadata: any = {};

      if (productId) {
        const product = await prisma.product.findFirst({
          where: { id: productId, organizationId },
        });

        if (product) {
          const images = JSON.parse(product.images || '[]');
          finalMediaUrl = images[0] || finalMediaUrl;
          metadata = { productId: product.id, sku: product.sku, price: product.price };
        }
      }

      if (buttons && buttons.length > 0) {
        metadata.interactiveType = 'BUTTONS';
        metadata.buttons = buttons;
        if (header) metadata.header = header;
        if (footer) metadata.footer = footer;
      } else if (list && list.sections && list.sections.length > 0) {
        metadata.interactiveType = 'LIST';
        metadata.list = list;
        if (header) metadata.header = header;
        if (footer) metadata.footer = footer;
      }

      // Send through WhatsApp Service
      const waResult = await WhatsAppService.sendMessage({
        organizationId,
        to: conversation.customer.phone,
        content: outgoingContent,
        type: (buttons?.length || list?.sections?.length) ? MessageType.INTERACTIVE : (type as MessageType),
        mediaUrl: finalMediaUrl,
        header,
        footer,
        buttons,
        list,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

      // Save message in DB
      const message = await prisma.message.create({
        data: {
          organizationId,
          conversationId,
          customerId: conversation.customerId,
          direction: MessageDirection.OUTBOUND,
          type: (buttons?.length || list?.sections?.length) ? MessageType.INTERACTIVE : (type as string),
          status: waResult.status,
          content: outgoingContent,
          mediaUrl: finalMediaUrl,
          metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
          whatsappMessageId: waResult.whatsappMessageId,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageText: outgoingContent.substring(0, 200),
          lastMessageAt: new Date(),
        },
      });

      const formattedMessage = {
        ...message,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      // Real-time socket emit
      SocketServer.emitToConversation(conversationId, 'message:new', formattedMessage);
      SocketServer.emitToOrg(organizationId, 'conversation:message', {
        conversationId,
        message: formattedMessage,
      });

      return res.status(201).json({
        success: true,
        data: formattedMessage,
      });
    } catch (error) {
      next(error);
    }
  }
}
