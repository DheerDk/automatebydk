import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';

export class SuperAdminController {
  public static async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalOrganizations,
        totalUsers,
        totalCustomers,
        totalLeads,
        totalMessages,
        activeSubscriptions,
        plans,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.customer.count(),
        prisma.lead.count(),
        prisma.message.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.plan.findMany(),
      ]);

      const organizations = await prisma.organization.findMany({
        include: {
          subscription: true,
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
        take: 50,
      });

      const formattedOrgs = organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        planTier: org.subscription?.planTier || 'FREE',
        subscriptionStatus: org.subscription?.status || 'ACTIVE',
        customerCount: org._count.customers,
        productCount: org._count.products,
        messageCount: org._count.messages,
        leadCount: org._count.leads,
        memberCount: org._count.memberships,
      }));

      const recentAuditLogs = await prisma.auditLog.findMany({
        take: 20,
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
            totalUsers,
            totalCustomers,
            totalLeads,
            totalMessages,
            activeSubscriptions,
          },
          organizations: formattedOrgs,
          plans,
          recentAuditLogs: recentAuditLogs.map((log) => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await prisma.plan.findMany();
      return res.json({
        success: true,
        data: plans.map((p) => ({
          ...p,
          features: JSON.parse(p.features || '[]'),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
