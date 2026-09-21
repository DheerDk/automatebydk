import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { SocketServer } from '../sockets/index.js';
import { AuditService } from '../services/audit.service.js';
import { AutomationService } from '../services/automation.service.js';
import { AutomationTrigger, LeadStatus } from '@chatflow/shared';

export class LeadController {
  public static async getKanban(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const leads = await prisma.lead.findMany({
        where: { organizationId },
        include: {
          customer: true,
          product: true,
          assignedUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const allStatuses = [
        LeadStatus.NEW,
        LeadStatus.CONTACTED,
        LeadStatus.INTERESTED,
        LeadStatus.FOLLOW_UP,
        LeadStatus.NEGOTIATION,
        LeadStatus.CONVERTED,
        LeadStatus.LOST,
      ];

      const columns: Record<string, { leads: any[]; totalValue: number }> = {};
      for (const status of allStatuses) {
        columns[status] = { leads: [], totalValue: 0 };
      }

      for (const lead of leads) {
        const formattedLead = {
          ...lead,
          customer: lead.customer
            ? { ...lead.customer, tags: JSON.parse(lead.customer.tags || '[]') }
            : null,
          product: lead.product
            ? {
                ...lead.product,
                images: JSON.parse(lead.product.images || '[]'),
                tags: JSON.parse(lead.product.tags || '[]'),
              }
            : null,
        };

        const col = columns[lead.status] || { leads: [], totalValue: 0 };
        col.leads.push(formattedLead);
        col.totalValue += lead.estimatedValue || 0;
        columns[lead.status] = col;
      }

      return res.json({
        success: true,
        data: columns,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { status, assignedUserId, page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId };
      if (status) where.status = status as string;
      if (assignedUserId) where.assignedUserId = assignedUserId as string;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            customer: true,
            product: true,
            assignedUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.lead.count({ where }),
      ]);

      const formatted = leads.map((l) => ({
        ...l,
        customer: l.customer
          ? { ...l.customer, tags: JSON.parse(l.customer.tags || '[]') }
          : null,
        product: l.product
          ? {
              ...l.product,
              images: JSON.parse(l.product.images || '[]'),
              tags: JSON.parse(l.product.tags || '[]'),
            }
          : null,
      }));

      return res.json({
        success: true,
        data: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { status, note } = req.body;

      const lead = await prisma.lead.findFirst({
        where: { id, organizationId },
        include: { customer: true, product: true },
      });

      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      const previousStatus = lead.status;

      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          status,
          convertedAt: status === LeadStatus.CONVERTED ? new Date() : lead.convertedAt,
          events: {
            create: {
              organizationId,
              userId: req.user?.id || null,
              fromStatus: previousStatus,
              toStatus: status,
              note: note || `Status updated from ${previousStatus} to ${status}`,
            },
          },
        },
        include: {
          customer: true,
          product: true,
          assignedUser: { select: { id: true, name: true, email: true } },
          events: { orderBy: { createdAt: 'desc' } },
        },
      });

      const formattedLead = {
        ...updatedLead,
        customer: updatedLead.customer
          ? { ...updatedLead.customer, tags: JSON.parse(updatedLead.customer.tags || '[]') }
          : null,
        product: updatedLead.product
          ? {
              ...updatedLead.product,
              images: JSON.parse(updatedLead.product.images || '[]'),
              tags: JSON.parse(updatedLead.product.tags || '[]'),
            }
          : null,
      };

      // Emit real-time Socket update to organization room
      SocketServer.emitToOrg(organizationId, 'lead:updated', formattedLead);

      // Trigger automation rules for LEAD_STATUS_CHANGED
      AutomationService.processRules({
        organizationId,
        trigger: AutomationTrigger.LEAD_STATUS_CHANGED,
        customerId: lead.customerId,
        leadId: lead.id,
        metadata: { fromStatus: previousStatus, toStatus: status },
      });

      await AuditService.log({
        organizationId,
        userId: req.user?.id,
        action: 'LEAD_STATUS_UPDATED',
        entityType: 'LEAD',
        entityId: id,
        details: { from: previousStatus, to: status },
      });

      return res.json({
        success: true,
        message: `Lead status updated to ${status}`,
        data: formattedLead,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { customerId, productId, status = LeadStatus.NEW, source = 'MANUAL', assignedUserId, estimatedValue, notes } = req.body;

      const lead = await prisma.lead.create({
        data: {
          organizationId,
          customerId,
          productId: productId || null,
          status,
          source,
          assignedUserId: assignedUserId || null,
          estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
          notes: notes || null,
          events: {
            create: {
              organizationId,
              userId: req.user?.id,
              fromStatus: null,
              toStatus: status,
              note: 'Lead created manually',
            },
          },
        },
        include: {
          customer: true,
          product: true,
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      });

      const formatted = {
        ...lead,
        customer: lead.customer
          ? { ...lead.customer, tags: JSON.parse(lead.customer.tags || '[]') }
          : null,
        product: lead.product
          ? {
              ...lead.product,
              images: JSON.parse(lead.product.images || '[]'),
              tags: JSON.parse(lead.product.tags || '[]'),
            }
          : null,
      };

      SocketServer.emitToOrg(organizationId, 'lead:created', formatted);

      return res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }
}
