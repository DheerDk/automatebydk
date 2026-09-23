import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class SubscriptionController {
  /**
   * Get organization's subscription details, tier quotas, and current usage
   */
  public static async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;

      const [org, productCount, convCount, automationCount, campaignCount, customerCount] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          include: {
            subscription: true,
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        }),
        prisma.product.count({ where: { organizationId: orgId } }),
        prisma.conversation.count({ where: { organizationId: orgId } }),
        prisma.automationRule.count({ where: { organizationId: orgId } }),
        prisma.campaign.count({ where: { organizationId: orgId } }),
        prisma.customer.count({ where: { organizationId: orgId } }),
      ]);

      if (!org) throw new AppError('Organization not found', 404);

      const planTier = org.subscription?.planTier || 'STARTER';
      const plan = await prisma.plan.findUnique({ where: { tier: planTier } });

      const defaultQuotas: Record<string, any> = {
        FREE: { maxProducts: 20, maxConversations: 200, maxUsers: 1, maxAutomations: 2, maxCampaigns: 1, aiSearchLimit: 500 },
        STARTER: { maxProducts: 100, maxConversations: 2000, maxUsers: 3, maxAutomations: 5, maxCampaigns: 5, aiSearchLimit: 2000 },
        GROWTH: { maxProducts: 500, maxConversations: 10000, maxUsers: 10, maxAutomations: 20, maxCampaigns: 20, aiSearchLimit: 10000 },
        PRO: { maxProducts: 2000, maxConversations: 50000, maxUsers: 25, maxAutomations: 100, maxCampaigns: 100, aiSearchLimit: 50000 },
        ENTERPRISE: { maxProducts: 10000, maxConversations: 200000, maxUsers: 100, maxAutomations: 500, maxCampaigns: 500, aiSearchLimit: 200000 },
      };

      const limits = plan || defaultQuotas[planTier] || defaultQuotas.STARTER;

      const now = new Date();
      const periodEnd = org.subscription?.currentPeriodEnd ? new Date(org.subscription.currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return res.json({
        success: true,
        data: {
          subscription: org.subscription,
          planTier,
          daysRemaining,
          status: org.subscription?.status || 'ACTIVE',
          billingCycle: org.subscription?.billingCycle || 'MONTHLY',
          autoRenew: org.subscription?.autoRenew ?? true,
          limits: {
            maxProducts: limits.maxProducts,
            maxConversations: limits.maxConversations,
            maxUsers: limits.maxUsers,
            maxAutomations: limits.maxAutomations,
            maxCampaigns: limits.maxCampaigns,
            aiSearchLimit: limits.aiSearchLimit,
          },
          usage: {
            products: productCount,
            conversations: convCount,
            automations: automationCount,
            campaigns: campaignCount,
            customers: customerCount,
          },
          recentPayments: org.payments,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renew current subscription period
   */
  public static async renewSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { paymentMethod = 'UPI', billingCycle = 'MONTHLY' } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { subscription: true },
      });

      if (!org) throw new AppError('Organization not found', 404);

      const planTier = org.subscription?.planTier || 'STARTER';
      const isYearly = billingCycle === 'YEARLY';
      const periodDays = isYearly ? 365 : 30;

      const pricingMap: Record<string, { monthly: number; yearly: number }> = {
        FREE: { monthly: 0, yearly: 0 },
        STARTER: { monthly: 1499, yearly: 14390 },
        GROWTH: { monthly: 2999, yearly: 28790 },
        PRO: { monthly: 5999, yearly: 57590 },
        ENTERPRISE: { monthly: 12999, yearly: 124790 },
      };

      const amount = pricingMap[planTier]
        ? isYearly ? pricingMap[planTier].yearly : pricingMap[planTier].monthly
        : 1499;

      const newPeriodStart = new Date();
      const currentEnd = org.subscription?.currentPeriodEnd ? new Date(org.subscription.currentPeriodEnd) : new Date();
      const baseDate = currentEnd > newPeriodStart ? currentEnd : newPeriodStart;
      const newPeriodEnd = new Date(baseDate.getTime() + periodDays * 24 * 60 * 60 * 1000);

      const txnId = `TXN-RNW-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const result = await prisma.$transaction(async (tx) => {
        const updatedSub = await tx.subscription.upsert({
          where: { organizationId: orgId },
          update: {
            status: 'ACTIVE',
            billingCycle,
            paymentMethod,
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd,
          },
          create: {
            organizationId: orgId,
            planTier,
            status: 'ACTIVE',
            billingCycle,
            paymentMethod,
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd,
          },
        });

        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            subscriptionId: updatedSub.id,
            amount,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod,
            planTier,
            invoiceNumber,
            transactionId: txnId,
          },
        });

        return { updatedSub, payment };
      }, { maxWait: 20000, timeout: 45000 });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: 'SUBSCRIPTION_RENEWED',
        entityType: 'SUBSCRIPTION',
        entityId: result.updatedSub.id,
        details: { planTier, billingCycle, amount, transactionId: txnId },
      });

      return res.json({
        success: true,
        message: `Subscription successfully renewed for ${periodDays} days!`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upgrade or change subscription tier
   */
  public static async upgradePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { newTier, billingCycle = 'MONTHLY', paymentMethod = 'UPI' } = req.body;

      if (!newTier) throw new AppError('New plan tier is required', 400);

      const isYearly = billingCycle === 'YEARLY';
      const periodDays = isYearly ? 365 : 30;

      const pricingMap: Record<string, { monthly: number; yearly: number }> = {
        FREE: { monthly: 0, yearly: 0 },
        STARTER: { monthly: 1499, yearly: 14390 },
        GROWTH: { monthly: 2999, yearly: 28790 },
        PRO: { monthly: 5999, yearly: 57590 },
        ENTERPRISE: { monthly: 12999, yearly: 124790 },
      };

      const amount = pricingMap[newTier]
        ? isYearly ? pricingMap[newTier].yearly : pricingMap[newTier].monthly
        : 1499;

      const txnId = `TXN-UPG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const newPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx) => {
        const updatedSub = await tx.subscription.upsert({
          where: { organizationId: orgId },
          update: {
            planTier: newTier,
            status: 'ACTIVE',
            billingCycle,
            paymentMethod,
            currentPeriodStart: new Date(),
            currentPeriodEnd: newPeriodEnd,
          },
          create: {
            organizationId: orgId,
            planTier: newTier,
            status: 'ACTIVE',
            billingCycle,
            paymentMethod,
            currentPeriodStart: new Date(),
            currentPeriodEnd: newPeriodEnd,
          },
        });

        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            subscriptionId: updatedSub.id,
            amount,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod,
            planTier: newTier,
            invoiceNumber,
            transactionId: txnId,
          },
        });

        return { updatedSub, payment };
      }, { maxWait: 20000, timeout: 45000 });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: 'SUBSCRIPTION_UPGRADED',
        entityType: 'SUBSCRIPTION',
        entityId: result.updatedSub.id,
        details: { newTier, billingCycle, amount, transactionId: txnId },
      });

      return res.json({
        success: true,
        message: `Successfully upgraded plan to ${newTier}!`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List invoice payments for organization
   */
  public static async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const payments = await prisma.payment.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }
}
