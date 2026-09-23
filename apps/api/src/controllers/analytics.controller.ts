import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { LeadStatus } from '@chatflow/shared';

export class AnalyticsController {
  public static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { timeframe = '30d' } = req.query;

      let days = 30;
      if (timeframe === '7d') days = 7;
      if (timeframe === '90d') days = 90;
      if (timeframe === 'today') days = 1;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Run parallel aggregations
      const [
        totalCustomers,
        newCustomers,
        totalLeads,
        newLeads,
        convertedLeads,
        openConversations,
        totalMessages,
        inboundMessages,
        outboundMessages,
        convertedLeadsSum,
        leadsByStatus,
        topProducts,
        recentMessages,
        recentLeads,
        recentConversations,
      ] = await Promise.all([
        prisma.customer.count({ where: { organizationId } }),
        prisma.customer.count({
          where: { organizationId, createdAt: { gte: startDate } },
        }),
        prisma.lead.count({ where: { organizationId } }),
        prisma.lead.count({
          where: { organizationId, createdAt: { gte: startDate } },
        }),
        prisma.lead.count({
          where: { organizationId, status: LeadStatus.CONVERTED },
        }),
        prisma.conversation.count({
          where: { organizationId, status: { in: ['AI_ACTIVE', 'HUMAN_REQUIRED', 'ASSIGNED'] } },
        }),
        prisma.message.count({ where: { organizationId } }),
        prisma.message.count({
          where: { organizationId, direction: 'INBOUND', createdAt: { gte: startDate } },
        }),
        prisma.message.count({
          where: { organizationId, direction: 'OUTBOUND', createdAt: { gte: startDate } },
        }),
        prisma.lead.aggregate({
          where: { organizationId, status: LeadStatus.CONVERTED },
          _sum: { estimatedValue: true },
        }),
        prisma.lead.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { id: true },
        }),
        prisma.product.findMany({
          where: { organizationId },
          orderBy: { enquiryCount: 'desc' },
          take: 5,
          include: { category: true },
        }),
        prisma.message.findMany({
          where: { organizationId, createdAt: { gte: startDate } },
          select: { createdAt: true, direction: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.lead.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { customer: true },
        }),
        prisma.conversation.findMany({
          where: { organizationId },
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
          include: { customer: true },
        }),
      ]);

      const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';
      const revenue = convertedLeadsSum._sum.estimatedValue || 0;

      // Build daily messages timeline
      const dailyMap: Record<string, { date: string; inbound: number; outbound: number; leads: number }> = {};
      for (let i = 0; i < Math.min(days, 30); i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap[key] = { date: key.substring(5), inbound: 0, outbound: 0, leads: 0 };
      }

      for (const m of recentMessages) {
        const key = m.createdAt.toISOString().split('T')[0];
        if (dailyMap[key]) {
          if (m.direction === 'INBOUND') dailyMap[key].inbound++;
          else dailyMap[key].outbound++;
        }
      }

      const timelineData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      // Build Funnel Data
      const statusMap: Record<string, number> = {};
      for (const item of leadsByStatus) {
        statusMap[item.status] = item._count.id;
      }

      const funnel = [
        { stage: 'New Leads', count: statusMap['NEW'] || 0, fill: '#3b82f6' },
        { stage: 'Contacted', count: statusMap['CONTACTED'] || 0, fill: '#6366f1' },
        { stage: 'Interested', count: statusMap['INTERESTED'] || 0, fill: '#8b5cf6' },
        { stage: 'Follow Up', count: statusMap['FOLLOW_UP'] || 0, fill: '#ec4899' },
        { stage: 'Negotiation', count: statusMap['NEGOTIATION'] || 0, fill: '#f59e0b' },
        { stage: 'Converted', count: statusMap['CONVERTED'] || 0, fill: '#10b981' },
      ];

      return res.json({
        success: true,
        data: {
          metrics: {
            totalCustomers,
            newCustomers,
            totalLeads,
            newLeads,
            convertedLeads,
            openConversations,
            totalMessages,
            inboundMessages,
            outboundMessages,
            conversionRate: parseFloat(conversionRate),
            revenue,
          },
          timeline: timelineData,
          funnel,
          recentLeads: recentLeads.map((l) => ({
            id: l.id,
            title: l.notes || `WhatsApp Lead #${l.id.slice(-4)}`,
            status: l.status,
            estimatedValue: l.estimatedValue || 0,
            customerName: l.customer?.name || l.customer?.phone || 'Customer',
            customerPhone: l.customer?.phone || '',
            createdAt: l.createdAt,
          })),
          recentConversations: recentConversations.map((c) => ({
            id: c.id,
            status: c.status,
            lastMessageAt: c.lastMessageAt,
            customerName: c.customer?.name || c.customer?.phone || 'Customer',
            customerPhone: c.customer?.phone || '',
          })),
          topProducts: topProducts.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            discountPrice: p.discountPrice,
            enquiryCount: p.enquiryCount,
            category: p.category?.name || 'Uncategorized',
            image: JSON.parse(p.images || '[]')[0] || null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
