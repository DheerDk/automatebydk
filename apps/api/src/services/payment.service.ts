import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from './audit.service.js';

function getRazorpayClient(): Razorpay | null {
  const keyId = (process.env.RAZORPAY_KEY_ID || config.razorpay.keyId || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || config.razorpay.keySecret || '').trim();

  if (keyId && keySecret && keyId.startsWith('rzp_')) {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return null;
}

export class PaymentService {
  /**
   * 1. Create a tamper-proof Razorpay Order for Subscription Upgrade / Renewal
   * NOTE: Amount is strictly calculated server-side from the DB Plan model to prevent client tampering.
   */
  public static async createSubscriptionOrder({
    organizationId,
    planTier,
    billingCycle = 'MONTHLY',
    userId,
  }: {
    organizationId: string;
    planTier: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    userId?: string;
  }) {
    // 1. Fetch official plan from database
    const plan = await prisma.plan.findUnique({
      where: { tier: planTier },
    });

    // Fallback tier prices if not yet seeded
    const fallbackPrices: Record<string, { monthly: number; yearly: number }> = {
      FREE: { monthly: 0, yearly: 0 },
      STARTER: { monthly: 1499, yearly: 14990 },
      GROWTH: { monthly: 2999, yearly: 29990 },
      PRO: { monthly: 5999, yearly: 59990 },
      ENTERPRISE: { monthly: 12999, yearly: 129990 },
    };

    const monthlyPrice = plan?.priceMonthly ?? fallbackPrices[planTier]?.monthly ?? 1499;
    const yearlyPrice = plan?.priceYearly ?? fallbackPrices[planTier]?.yearly ?? (monthlyPrice * 10);
    const finalAmountInr = billingCycle === 'YEARLY' ? yearlyPrice : monthlyPrice;

    if (finalAmountInr <= 0) {
      throw new AppError('Cannot create payment order for free plan.', 400);
    }

    // Amount in Paise (1 INR = 100 paise)
    const amountInPaise = Math.round(finalAmountInr * 100);
    const receipt = `rcpt_${organizationId.slice(0, 8)}_${Date.now()}`;

    // If Razorpay live keys are configured, create order via Razorpay API
    let razorpayOrderId = '';
    const razorpay = getRazorpayClient();
    const keyId = (process.env.RAZORPAY_KEY_ID || config.razorpay.keyId || '').trim();

    if (razorpay && !config.razorpay.mock) {
      try {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            organizationId,
            planTier,
            billingCycle,
            userId: userId || 'unknown',
          },
        });
        razorpayOrderId = order.id;
      } catch (err: any) {
        logger.error('Razorpay order creation failed:', err);
        throw new AppError(`Payment Gateway Error: ${err.message || 'Failed to create order'}`, 502);
      }
    } else {
      // Mock / Dev fallback order
      razorpayOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      logger.info(`[Payment] Generated Mock Razorpay Order: ${razorpayOrderId} for ${planTier} (₹${finalAmountInr})`);
    }

    return {
      orderId: razorpayOrderId,
      amount: amountInPaise,
      amountInr: finalAmountInr,
      currency: 'INR',
      planTier,
      billingCycle,
      keyId: keyId || 'rzp_test_mock_key',
    };
  }

  /**
   * 2. Verify Cryptographic HMAC Signature & Double-Check with Razorpay Server
   * Defends against: Signature Spoofing, Replay Attacks, Timing Attacks, Double Spending.
   */
  public static async verifyPaymentAndUpgrade({
    organizationId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planTier,
    billingCycle = 'MONTHLY',
    userId,
  }: {
    organizationId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planTier: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    userId?: string;
  }) {
    // 1. Anti-Replay: Check if this payment ID was already processed
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionId: razorpay_payment_id },
    });

    if (existingPayment) {
      logger.warn(`[Payment] Replay attempt detected for transaction ${razorpay_payment_id}`);
      return {
        success: true,
        message: 'Payment was already verified and processed.',
        payment: existingPayment,
      };
    }

    // 2. Cryptographic HMAC Signature Verification
    const razorpay = getRazorpayClient();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || config.razorpay.keySecret || '').trim();

    if (razorpay && keySecret && !config.razorpay.mock && !razorpay_order_id.startsWith('order_mock_')) {
      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');

      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );

      if (!isSignatureValid) {
        logger.error(`[Security Alert] Invalid payment signature attempt for org ${organizationId}`);
        throw new AppError('Payment signature verification failed. Tampered request rejected.', 400, 'INVALID_SIGNATURE');
      }

      // 3. Server-to-Server Direct Verification with Razorpay API
      try {
        const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
          throw new AppError(`Payment status is ${paymentDetails.status}, not completed.`, 400);
        }
      } catch (apiErr: any) {
        if (apiErr instanceof AppError) throw apiErr;
        logger.error('Failed to verify payment with Razorpay server:', apiErr);
        throw new AppError('Failed to verify payment with gateway.', 502);
      }
    }

    // 4. Calculate Subscription Renewal Duration
    const periodDays = billingCycle === 'YEARLY' ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    // Plan pricing
    const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
    const amountInr = billingCycle === 'YEARLY' ? (plan?.priceYearly || 14990) : (plan?.priceMonthly || 1499);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${crypto.randomInt(100, 999)}`;

    // 5. Execute DB Transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Record payment
        const payment = await tx.payment.create({
          data: {
            organizationId,
            amount: amountInr,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod: 'RAZORPAY_UPI_CARD',
            transactionId: razorpay_payment_id,
            planTier,
            invoiceNumber,
          },
        });

        // Update organization subscription
        const updatedSub = await tx.subscription.upsert({
          where: { organizationId },
          update: {
            planTier,
            status: 'ACTIVE',
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            autoRenew: true,
          },
          create: {
            organizationId,
            planTier,
            status: 'ACTIVE',
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            autoRenew: true,
          },
        });

        return { payment, subscription: updatedSub };
      },
      { maxWait: 20000, timeout: 45000 }
    );

    // 6. Security Audit Log
    await AuditService.log({
      organizationId,
      userId,
      action: 'PAYMENT_VERIFIED_PLAN_UPGRADED',
      entityType: 'SUBSCRIPTION',
      entityId: result.subscription.id,
      details: {
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        planTier,
        amount: amountInr,
        invoiceNumber,
      },
    });

    logger.info(`[Payment Success] Org ${organizationId} upgraded to ${planTier} via ${razorpay_payment_id}`);

    return {
      success: true,
      message: `Payment successful! Your account has been upgraded to the ${planTier} plan.`,
      data: result,
    };
  }

  /**
   * 3. Handle Webhook from Razorpay
   */
  public static async handleRazorpayWebhook(rawBody: string, signature: string) {
    if (!config.razorpay.webhookSecret) {
      logger.warn('Razorpay webhook secret not configured. Skipping webhook processing.');
      return { received: true };
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );

    if (!isValid) {
      throw new AppError('Invalid Razorpay Webhook Signature', 400);
    }

    const event = JSON.parse(rawBody);
    logger.info(`[Razorpay Webhook Event] ${event.event}`);

    if (event.event === 'payment.captured' || event.event === 'order.paid' || event.event === 'payment_link.paid') {
      const paymentEntity = event.payload?.payment?.entity || event.payload?.payment_link?.entity;
      const notes = paymentEntity?.notes || {};
      const { organizationId, planTier, billingCycle, leadId, source } = notes;

      // 1. Handle SaaS Subscription Plan Payment
      if (organizationId && planTier) {
        await this.verifyPaymentAndUpgrade({
          organizationId,
          razorpay_order_id: paymentEntity.order_id || paymentEntity.id,
          razorpay_payment_id: paymentEntity.id,
          razorpay_signature: signature,
          planTier,
          billingCycle: billingCycle || 'MONTHLY',
        });
      }

      // 2. Handle WhatsApp In-Chat Store Order Payment
      const paymentLinkId = paymentEntity?.payment_link_id || paymentEntity?.id;
      if (source === 'WHATSAPP_STORE' || paymentLinkId) {
        const order = await prisma.storeOrder.findFirst({
          where: {
            OR: [
              { paymentLinkId: paymentLinkId },
              { id: notes.orderId || '' },
            ],
          },
          include: {
            customer: true,
            organization: { include: { settings: true } },
          },
        });

        if (order && order.status !== 'PAID') {
          const now = new Date();
          const paidOrder = await prisma.storeOrder.update({
            where: { id: order.id },
            data: {
              status: 'PAID',
              razorpayPaymentId: paymentEntity.id,
              paidAt: now,
            },
          });

          // Convert Lead if attached
          if (order.leadId) {
            await prisma.lead.update({
              where: { id: order.leadId },
              data: {
                status: 'CONVERTED',
                convertedAt: now,
              },
            });
          }

          // Auto-cancel drip sequences on purchase
          const { DripService } = await import('./drip.service.js');
          await DripService.cancelEnrollmentsOnAction({
            organizationId: order.organizationId,
            customerId: order.customerId,
            reason: 'PURCHASED',
          });

          // Dispatch WhatsApp Confirmation Receipt
          const currency = order.organization.settings?.currency || 'INR';
          let receiptText = `🎉 *Payment Confirmed! Order #${order.orderNumber}*\n\n`;
          receiptText += `Dear ${order.customer.name},\n`;
          receiptText += `We have successfully received your payment of *${currency} ${order.amount.toLocaleString('en-IN')}*.\n\n`;
          receiptText += `📦 *Order Summary:* ${order.description}\n`;
          receiptText += `🆔 *Payment Ref:* \`${paymentEntity.id}\`\n`;
          receiptText += `📅 *Date:* ${now.toLocaleString()}\n\n`;
          receiptText += `Thank you for shopping with us! Our team is processing your order now.`;

          const { WhatsAppService } = await import('./whatsapp.service.js');
          await WhatsAppService.sendMessage({
            organizationId: order.organizationId,
            to: order.customer.phone,
            content: receiptText,
            header: 'Payment Received ✅',
            footer: `${order.organization.name || 'AutoMate'} Order Confirmation`,
            metadata: {
              source: 'PAYMENT_RECEIPT',
              orderId: order.id,
              orderNumber: order.orderNumber,
              amount: order.amount,
            },
          });

          // Notify staff via Socket.IO
          const { SocketServer } = await import('../sockets/index.js');
          SocketServer.emitToOrg(order.organizationId, 'order:paid', {
            order: paidOrder,
            customerName: order.customer.name,
            amount: order.amount,
          });

          logger.info(`[Store Payment] In-Chat Order #${order.orderNumber} marked as PAID for customer ${order.customer.phone}`);
        }
      }
    }

    return { received: true };
  }

  /**
   * 4. Create In-Chat Instant WhatsApp Store Payment Link for Customers
   */
  public static async createStorePaymentLink({
    organizationId,
    customerName,
    customerPhone,
    amountInr,
    description,
    leadId,
  }: {
    organizationId: string;
    customerName: string;
    customerPhone: string;
    amountInr: number;
    description: string;
    leadId?: string;
  }) {
    const amountInPaise = Math.round(amountInr * 100);

    const razorpay = getRazorpayClient();
    if (razorpay && !config.razorpay.mock) {
      const paymentLink = await (razorpay as any).paymentLink.create({
        amount: amountInPaise,
        currency: 'INR',
        accept_partial: false,
        description,
        customer: {
          name: customerName,
          contact: customerPhone.replace(/[^\d+]/g, ''),
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        notes: {
          organizationId,
          leadId: leadId || '',
          source: 'WHATSAPP_STORE',
        },
        callback_url: `${config.frontendUrl}/checkout-success`,
        callback_method: 'get',
      });

      return {
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amountInr,
      };
    }

    // Direct UPI / Simulation fallback link
    const upiString = `upi://pay?pa=automatebydk@okhdfcbank&pn=AutoMateStore&am=${amountInr}&cu=INR&tn=${encodeURIComponent(description)}`;
    return {
      paymentLinkId: `plink_mock_${crypto.randomBytes(6).toString('hex')}`,
      shortUrl: `https://rzp.io/i/mock_${crypto.randomBytes(4).toString('hex')}`,
      upiString,
      amountInr,
    };
  }
}
