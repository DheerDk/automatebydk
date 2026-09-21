import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

export class TemplateController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const templates = await prisma.messageTemplate.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = templates.map((t) => ({
        ...t,
        variables: JSON.parse(t.variables || '[]'),
      }));

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, category = 'MARKETING', language = 'en', body, variables = [] } = req.body;

      const template = await prisma.messageTemplate.create({
        data: {
          organizationId,
          name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          category,
          language,
          body,
          variables: JSON.stringify(variables),
          status: 'APPROVED',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Message template created successfully',
        data: {
          ...template,
          variables: JSON.parse(template.variables),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.messageTemplate.delete({ where: { id } });
      return res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      next(error);
    }
  }
}
