import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

export class AutomationController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const automations = await prisma.automationRule.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = automations.map((a) => ({
        ...a,
        conditions: JSON.parse(a.conditions || '{}'),
        actions: JSON.parse(a.actions || '[]'),
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
      const { name, description, trigger, conditions = {}, actions = [], isActive = true } = req.body;

      const rule = await prisma.automationRule.create({
        data: {
          organizationId,
          name,
          description: description || null,
          trigger,
          conditions: JSON.stringify(conditions),
          actions: JSON.stringify(actions),
          isActive,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Automation rule created successfully',
        data: {
          ...rule,
          conditions: JSON.parse(rule.conditions),
          actions: JSON.parse(rule.actions),
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
      const { name, description, trigger, conditions, actions, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (trigger !== undefined) updateData.trigger = trigger;
      if (conditions !== undefined) updateData.conditions = JSON.stringify(conditions);
      if (actions !== undefined) updateData.actions = JSON.stringify(actions);
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await prisma.automationRule.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: 'Automation rule updated',
        data: {
          ...updated,
          conditions: JSON.parse(updated.conditions),
          actions: JSON.parse(updated.actions),
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

      await prisma.automationRule.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Automation rule deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}
