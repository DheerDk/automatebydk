import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PaymentService } from '../services/payment.service.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { SocketServer } from '../sockets/index.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { MessageDirection, MessageType } from '@chatflow/shared';

export class PaymentController {
  /**
   * Create Razorpay Order for Plan Upgrade / Subscription
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { planTier, billingCycle = 'MONTHLY' } = req.body;

      if (!planTier) {
        throw new AppError('Plan tier is required', 400);
      }

      const orderData = await PaymentService.createSubscriptionOrder({
        organizationId,
        planTier,
        billingCycle,
        userId: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment order created successfully',
        data: orderData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Payment Signature and Complete Upgrade
   */
  public static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planTier, billingCycle = 'MONTHLY' } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError('Missing payment verification details.', 400);
      }

      const result = await PaymentService.verifyPaymentAndUpgrade({
        organizationId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planTier: planTier || 'STARTER',
        billingCycle,
        userId: req.user?.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Organization Payment Receipts & Invoices
   */
  public static async listPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const payments = await prisma.payment.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List In-Chat Customer Orders
   */
  public static async listStoreOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const orders = await prisma.storeOrder.findMany({
        where: { organizationId },
        include: {
          customer: true,
          lead: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create In-Chat Instant WhatsApp Payment Link for Customer Order
   */
  public static async createStorePaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { customerName, customerPhone, amount, description, leadId } = req.body;

      if (!amount || amount <= 0) {
        throw new AppError('Valid amount is required', 400);
      }
      if (!customerPhone) {
        throw new AppError('Customer phone number is required', 400);
      }

      const linkData = await PaymentService.createStorePaymentLink({
        organizationId,
        customerName: customerName || 'Customer',
        customerPhone,
        amountInr: parseFloat(amount),
        description: description || 'WhatsApp Store Order Payment',
        leadId,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment link generated successfully',
        data: linkData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send WhatsApp In-Chat Checkout & Payment Link Directly to Conversation
   */
  public static async sendInChatPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { conversationId, amount, description, items, leadId } = req.body;

      if (!conversationId) {
        throw new AppError('Conversation ID is required', 400);
      }
      if (!amount || Number(amount) <= 0) {
        throw new AppError('Valid payment amount is required', 400);
      }

      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        include: { customer: true },
      });

      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }

      const numAmount = parseFloat(amount);
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${crypto.randomInt(100, 999)}`;
      const paymentDesc = description || `Order #${orderNumber} Payment`;

      // 1. Create Razorpay Payment Link
      const linkData = await PaymentService.createStorePaymentLink({
        organizationId,
        customerName: conversation.customer.name,
        customerPhone: conversation.customer.phone,
        amountInr: numAmount,
        description: paymentDesc,
        leadId,
      });

      // 2. Create StoreOrder record in DB
      const order = await prisma.storeOrder.create({
        data: {
          organizationId,
          customerId: conversation.customerId,
          leadId: leadId || null,
          conversationId,
          orderNumber,
          amount: numAmount,
          currency: 'INR',
          status: 'PENDING',
          description: paymentDesc,
          paymentLinkId: linkData.paymentLinkId,
          paymentShortUrl: linkData.shortUrl,
          upiString: (linkData as any).upiString || null,
          items: items ? JSON.stringify(items) : '[]',
        },
      });

      // 3. Format Professional WhatsApp In-Chat Checkout Card
      let checkoutText = `💳 *Payment Request - Order #${orderNumber}*\n\n`;
      checkoutText += `👤 *Customer:* ${conversation.customer.name}\n`;
      checkoutText += `💰 *Amount Due:* ₹${numAmount.toLocaleString('en-IN')}\n`;
      checkoutText += `📝 *Note:* ${paymentDesc}\n\n`;
      checkoutText += `🔗 *Secure Online Payment Link:*\n${linkData.shortUrl}\n\n`;
      checkoutText += `⚡ *Instant UPI Payment:*\nScan QR or click link above to pay instantly via GPay, PhonePe, Paytm, or Cards.\n\n`;
      checkoutText += `✅ Once paid, your order confirmation receipt will be sent automatically.`;

      const paymentMetadata = {
        type: 'PAYMENT_LINK',
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: numAmount,
        currency: 'INR',
        paymentUrl: linkData.shortUrl,
        upiString: (linkData as any).upiString,
        status: 'PENDING',
        interactiveType: 'BUTTONS',
        buttons: [
          { id: `pay_${order.id}`, title: `💳 Pay ₹${numAmount}` },
          { id: `support_${order.id}`, title: '💬 Contact Staff' },
        ],
      };

      // 4. Send through WhatsApp
      const waResult = await WhatsAppService.sendMessage({
        organizationId,
        to: conversation.customer.phone,
        content: checkoutText,
        type: MessageType.INTERACTIVE,
        buttons: [
          { id: `pay_${order.id}`, title: `💳 Pay ₹${numAmount}` },
          { id: `support_${order.id}`, title: '💬 Contact Staff' },
        ],
        metadata: paymentMetadata,
        header: 'Order Payment Due',
        footer: 'AutoMate by DK Secure Payments',
      });

      // 5. Create Message in Database
      const message = await prisma.message.create({
        data: {
          organizationId,
          conversationId,
          customerId: conversation.customerId,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.INTERACTIVE,
          status: waResult.status,
          content: checkoutText,
          metadata: JSON.stringify(paymentMetadata),
          whatsappMessageId: waResult.whatsappMessageId,
        },
      });

      // 6. Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageText: `Payment Request: ₹${numAmount}`,
          lastMessageAt: new Date(),
        },
      });

      // 7. Update Lead if attached
      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { estimatedValue: numAmount, status: 'NEGOTIATION' },
        });
      }

      const formattedMessage = {
        ...message,
        metadata: paymentMetadata,
      };

      // 8. Emit Socket Events
      SocketServer.emitToConversation(conversationId, 'message:new', formattedMessage);
      SocketServer.emitToOrg(organizationId, 'conversation:message', {
        conversationId,
        message: formattedMessage,
      });

      return res.status(201).json({
        success: true,
        message: 'Payment link and checkout card sent to customer successfully.',
        data: {
          order,
          message: formattedMessage,
          paymentUrl: linkData.shortUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Razorpay Webhooks (Public Webhook)
   */
  public static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      const result = await PaymentService.handleRazorpayWebhook(rawBody, signature || '');
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
