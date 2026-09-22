import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class SuperAdminController {
  public static async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalOrganizations,
        pendingApprovalsCount,
        totalUsers,
        totalCustomers,
        totalLeads,
        totalMessages,
        activeSubscriptions,
        plans,
        allPayments,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.organization.count({ where: { isVerified: false } }),
        prisma.user.count(),
        prisma.customer.count(),
        prisma.lead.count(),
        prisma.message.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.plan.findMany(),
        prisma.payment.findMany({ where: { status: 'COMPLETED' } }),
      ]);

      const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);

      // Estimate MRR based on active plans
      const activeSubs = await prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
      });
      const tierPriceMap: Record<string, number> = {
        FREE: 0,
        STARTER: 1499,
        GROWTH: 2999,
        PRO: 5999,
        ENTERPRISE: 12999,
      };
      const mrr = activeSubs.reduce((sum, sub) => sum + (tierPriceMap[sub.planTier] || 1499), 0);

      const organizations = await prisma.organization.findMany({
        include: {
          subscription: true,
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              customers: true,
              products: true,
              messages: true,
              leads: true,
              memberships: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const formattedOrgs = organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        category: org.category || 'Retail & E-commerce',
        status: org.status,
        isVerified: org.isVerified,
        approvalNote: org.approvalNote,
        approvedAt: org.approvedAt,
        createdAt: org.createdAt,
        planTier: org.subscription?.planTier || 'FREE',
        subscriptionStatus: org.subscription?.status || 'ACTIVE',
        billingCycle: org.subscription?.billingCycle || 'MONTHLY',
        currentPeriodEnd: org.subscription?.currentPeriodEnd,
        customerCount: org._count.customers,
        productCount: org._count.products,
        messageCount: org._count.messages,
        leadCount: org._count.leads,
        memberCount: org._count.memberships,
        lastPayment: org.payments[0] || null,
      }));

      const recentAuditLogs = await prisma.auditLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } },
        },
      });

      return res.json({
        success: true,
        data: {
          overview: {
            totalOrganizations,
            pendingApprovalsCount,
            totalUsers,
            totalCustomers,
            totalLeads,
            totalMessages,
            activeSubscriptions,
            totalRevenue,
            mrr,
          },
          organizations: formattedOrgs,
          plans,
          recentAuditLogs: recentAuditLogs.map((log) => ({
            ...log,
            details: log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a business organization account
   */
  public static async approveOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const org = await prisma.organization.findUnique({ where: { id } });
      if (!org) throw new AppError('Organization not found', 404);

      const updated = await prisma.organization.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          isVerified: true,
          approvedAt: new Date(),
          approvalNote: note || 'Approved by Super Admin',
        },
      });

      await AuditService.log({
        organizationId: id,
        userId: req.user?.id,
        action: 'SUPERADMIN_APPROVED_TENANT',
        entityType: 'ORGANIZATION',
        entityId: id,
        details: { note },
      });

      return res.json({
        success: true,
        message: `Business ${org.name} has been verified and approved successfully!`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject or request changes for a business organization account
   */
  public static async rejectOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) throw new AppError('Rejection reason is required', 400);

      const org = await prisma.organization.findUnique({ where: { id } });
      if (!org) throw new AppError('Organization not found', 404);

      const updated = await prisma.organization.update({
        where: { id },
        data: {
          status: 'REJECTED',
          isVerified: false,
          approvalNote: reason,
        },
      });

      await AuditService.log({
        organizationId: id,
        userId: req.user?.id,
        action: 'SUPERADMIN_REJECTED_TENANT',
        entityType: 'ORGANIZATION',
        entityId: id,
        details: { reason },
      });

      return res.json({
        success: true,
        message: `Business ${org.name} has been rejected.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant subscription details (tier, extend days, toggle status)
   */
  public static async updateTenantSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { planTier, status, extendDays, newPeriodEnd } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id },
        include: { subscription: true },
      });
      if (!org) throw new AppError('Organization not found', 404);

      let updatedPeriodEnd = org.subscription?.currentPeriodEnd || new Date();
      if (extendDays) {
        const base = new Date(updatedPeriodEnd) > new Date() ? new Date(updatedPeriodEnd) : new Date();
        updatedPeriodEnd = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000);
      } else if (newPeriodEnd) {
        updatedPeriodEnd = new Date(newPeriodEnd);
      }

      const updatedSub = await prisma.subscription.upsert({
        where: { organizationId: id },
        update: {
          planTier: planTier || org.subscription?.planTier,
          status: status || org.subscription?.status || 'ACTIVE',
          currentPeriodEnd: updatedPeriodEnd,
        },
        create: {
          organizationId: id,
          planTier: planTier || 'STARTER',
          status: status || 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: updatedPeriodEnd,
        },
      });

      if (status) {
        await prisma.organization.update({
          where: { id },
          data: { status },
        });
      }

      await AuditService.log({
        organizationId: id,
        userId: req.user?.id,
        action: 'SUPERADMIN_MODIFIED_SUBSCRIPTION',
        entityType: 'SUBSCRIPTION',
        entityId: updatedSub.id,
        details: { planTier, status, extendDays, currentPeriodEnd: updatedPeriodEnd },
      });

      return res.json({
        success: true,
        message: `Subscription updated for ${org.name} successfully!`,
        data: updatedSub,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all global payments
   */
  public static async listAllPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
        take: 100,
      });

      return res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all plans
   */
  public static async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await prisma.plan.findMany();
      return res.json({
        success: true,
        data: plans.map((p) => ({
          ...p,
          features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : p.features,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
