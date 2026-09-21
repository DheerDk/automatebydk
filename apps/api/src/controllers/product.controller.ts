import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class ProductController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { search, categoryId, stockStatus, minPrice, maxPrice, page = '1', limit = '50', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId };

      if (categoryId) {
        where.categoryId = categoryId as string;
      }

      if (stockStatus) {
        where.stockStatus = stockStatus as string;
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      if (search) {
        const query = String(search).trim();
        where.OR = [
          { name: { contains: query } },
          { sku: { contains: query } },
          { brand: { contains: query } },
          { description: { contains: query } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { category: true },
          orderBy: { [sortBy as string]: sortOrder as string },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);

      const formattedProducts = products.map((p) => ({
        ...p,
        images: JSON.parse(p.images || '[]'),
        tags: JSON.parse(p.tags || '[]'),
      }));

      return res.json({
        success: true,
        data: formattedProducts,
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

      const product = await prisma.product.findFirst({
        where: { id, organizationId },
        include: { category: true },
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      return res.json({
        success: true,
        data: {
          ...product,
          images: JSON.parse(product.images || '[]'),
          tags: JSON.parse(product.tags || '[]'),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, sku, description, price, discountPrice, categoryId, brand, color, size, stock, stockStatus, images, tags, isActive } = req.body;

      const existingSku = await prisma.product.findUnique({
        where: {
          organizationId_sku: {
            organizationId,
            sku,
          },
        },
      });

      if (existingSku) {
        throw new AppError(`A product with SKU "${sku}" already exists in your store.`, 409, 'DUPLICATE_SKU');
      }

      const product = await prisma.product.create({
        data: {
          organizationId,
          name,
          sku,
          description,
          price: parseFloat(price),
          discountPrice: discountPrice ? parseFloat(discountPrice) : null,
          categoryId: categoryId || null,
          brand: brand || null,
          color: color || null,
          size: size || null,
          stock: parseInt(stock || '0', 10),
          stockStatus: stockStatus || (stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
          images: JSON.stringify(images || []),
          tags: JSON.stringify(tags || []),
          isActive: isActive !== undefined ? isActive : true,
        },
        include: { category: true },
      });

      await AuditService.log({
        organizationId,
        userId: req.user?.id,
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: product.id,
        details: { name: product.name, sku: product.sku, price: product.price },
      });

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          ...product,
          images: JSON.parse(product.images || '[]'),
          tags: JSON.parse(product.tags || '[]'),
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
      const { name, sku, description, price, discountPrice, categoryId, brand, color, size, stock, stockStatus, images, tags, isActive } = req.body;

      const existing = await prisma.product.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Product not found', 404);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (sku !== undefined) updateData.sku = sku;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (discountPrice !== undefined) updateData.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;
      if (brand !== undefined) updateData.brand = brand || null;
      if (color !== undefined) updateData.color = color || null;
      if (size !== undefined) updateData.size = size || null;
      if (stock !== undefined) {
        updateData.stock = parseInt(stock, 10);
        if (!stockStatus) {
          updateData.stockStatus = updateData.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
        }
      }
      if (stockStatus !== undefined) updateData.stockStatus = stockStatus;
      if (images !== undefined) updateData.images = JSON.stringify(images);
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });

      await AuditService.log({
        organizationId,
        userId: req.user?.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: updated.id,
      });

      return res.json({
        success: true,
        message: 'Product updated successfully',
        data: {
          ...updated,
          images: JSON.parse(updated.images || '[]'),
          tags: JSON.parse(updated.tags || '[]'),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const existing = await prisma.product.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Product not found', 404);
      }

      await prisma.product.delete({ where: { id } });

      await AuditService.log({
        organizationId,
        userId: req.user?.id,
        action: 'PRODUCT_DELETED',
        entityType: 'PRODUCT',
        entityId: id,
        details: { name: existing.name, sku: existing.sku },
      });

      return res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
