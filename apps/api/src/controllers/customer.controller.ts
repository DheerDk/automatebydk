import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

export class CustomerController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { search, tag, page = '1', limit = '50', sortBy = 'lastInteractionAt', sortOrder = 'desc' } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId };

      if (search) {
        const query = String(search).trim();
        where.OR = [
          { name: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
        ];
      }

      if (tag) {
        where.tags = { contains: String(tag) };
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            _count: {
              select: { conversations: true, leads: true },
            },
            leads: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { [sortBy as string]: sortOrder as string },
          skip,
          take: limitNum,
        }),
        prisma.customer.count({ where }),
      ]);

      const formatted = customers.map((c) => ({
        ...c,
        tags: JSON.parse(c.tags || '[]'),
        latestLead: c.leads[0] || null,
        conversationCount: c._count.conversations,
        leadCount: c._count.leads,
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

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const customer = await prisma.customer.findFirst({
        where: { id, organizationId },
        include: {
          conversations: {
            include: {
              messages: {
                take: 20,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          leads: {
            include: {
              product: true,
              events: {
                orderBy: { createdAt: 'desc' },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      return res.json({
        success: true,
        data: {
          ...customer,
          tags: JSON.parse(customer.tags || '[]'),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { name, email, tags, notes } = req.body;

      const customer = await prisma.customer.findFirst({
        where: { id, organizationId },
      });

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email || null;
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (notes !== undefined) updateData.notes = notes || null;

      const updated = await prisma.customer.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: 'Customer updated successfully',
        data: {
          ...updated,
          tags: JSON.parse(updated.tags || '[]'),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
