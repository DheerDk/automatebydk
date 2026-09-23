import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

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
