import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

export class CategoryController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const categories = await prisma.category.findMany({
        where: { organizationId },
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.json({
        success: true,
        data: categories.map((c) => ({
          ...c,
          productCount: c._count.products,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, description, imageUrl } = req.body;

      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      const category = await prisma.category.create({
        data: {
          organizationId,
          name,
          slug,
          description: description || null,
          imageUrl: imageUrl || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { name, description, imageUrl } = req.body;

      const updated = await prisma.category.update({
        where: { id },
        data: {
          name,
          description: description || null,
          imageUrl: imageUrl || null,
        },
      });

      return res.json({
        success: true,
        message: 'Category updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      await prisma.category.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
