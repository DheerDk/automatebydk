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
      const { conversationId, content, type = MessageType.TEXT, mediaUrl, productId } = req.body;

      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        include: { customer: true },
      });

      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }

      let outgoingContent = content;
      let finalMediaUrl = mediaUrl;
      let metadata: any = null;

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

      // Send through WhatsApp Service
      const waResult = await WhatsAppService.sendMessage({
        organizationId,
        to: conversation.customer.phone,
        content: outgoingContent,
        type: type as MessageType,
        mediaUrl: finalMediaUrl,
        metadata,
      });

      // Save message in DB
      const message = await prisma.message.create({
        data: {
          organizationId,
          conversationId,
          customerId: conversation.customerId,
          direction: MessageDirection.OUTBOUND,
          type: type as string,
          status: waResult.status,
          content: outgoingContent,
          mediaUrl: finalMediaUrl,
          metadata: metadata ? JSON.stringify(metadata) : null,
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
        metadata: metadata || null,
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
