import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AutomationService } from '../services/automation.service.js';

export class AutomationController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      let automations = await prisma.automationRule.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      if (!automations || automations.length === 0) {
        const defaultFlow = AutomationService.getDefaultStarterFlowData();
        const created = await prisma.automationRule.create({
          data: {
            organizationId,
            name: 'Retail & E-Commerce Store Workflow',
            description: 'Interactive branching automation with catalog, VIP coupon, location pin, and manager handoff.',
            trigger: 'GREETING',
            conditions: JSON.stringify({ keyword: defaultFlow.triggerKeyword }),
            actions: JSON.stringify([
              {
                type: 'SEND_MESSAGE',
                payload: {
                  text: defaultFlow.welcomeText,
                  mediaUrl: defaultFlow.welcomeMediaUrl,
                  buttons: defaultFlow.welcomeButtons,
                },
              },
            ]),
            flowData: JSON.stringify(defaultFlow),
            isActive: true,
          },
        });
        automations = [created];
      }

      const formatted = automations.map((a) => {
        let parsedFlowData = null;
        if (a.flowData) {
          try {
            parsedFlowData = typeof a.flowData === 'string' ? JSON.parse(a.flowData) : a.flowData;
          } catch {
            parsedFlowData = null;
          }
        }

        return {
          ...a,
          conditions: JSON.parse(a.conditions || '{}'),
          actions: JSON.parse(a.actions || '[]'),
          flowData: parsedFlowData,
        };
      });

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
      const { name, description, trigger, conditions = {}, actions = [], flowData, isActive = true } = req.body;

      const rule = await prisma.automationRule.create({
        data: {
          organizationId,
          name,
          description: description || null,
          trigger,
          conditions: JSON.stringify(conditions),
          actions: JSON.stringify(actions),
          flowData: flowData ? JSON.stringify(flowData) : null,
          isActive,
        },
      });

      let parsedFlowData = null;
      if (rule.flowData) {
        try {
          parsedFlowData = JSON.parse(rule.flowData);
        } catch {}
      }

      return res.status(201).json({
        success: true,
        message: 'Automation rule created successfully',
        data: {
          ...rule,
          conditions: JSON.parse(rule.conditions),
          actions: JSON.parse(rule.actions),
          flowData: parsedFlowData,
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
      const { name, description, trigger, conditions, actions, flowData, isActive } = req.body;

      const existing = await prisma.automationRule.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Automation rule not found', 404);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (trigger !== undefined) updateData.trigger = trigger;
      if (conditions !== undefined) updateData.conditions = JSON.stringify(conditions);
      if (actions !== undefined) updateData.actions = JSON.stringify(actions);
      if (flowData !== undefined) updateData.flowData = flowData ? JSON.stringify(flowData) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await prisma.automationRule.update({
        where: { id },
        data: updateData,
      });

      let parsedFlowData = null;
      if (updated.flowData) {
        try {
          parsedFlowData = JSON.parse(updated.flowData);
        } catch {}
      }

      return res.json({
        success: true,
        message: 'Automation rule updated',
        data: {
          ...updated,
          conditions: JSON.parse(updated.conditions),
          actions: JSON.parse(updated.actions),
          flowData: parsedFlowData,
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

      const existing = await prisma.automationRule.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Automation rule not found', 404);
      }

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

  /**
   * Master Toggle: Turn ALL automations ON / OFF with 1 click
   */
  public static async toggleAll(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new AppError('isActive boolean is required', 400);
      }

      await prisma.automationRule.updateMany({
        where: { organizationId },
        data: { isActive },
      });

      return res.json({
        success: true,
        message: `All automations turned ${isActive ? 'ON' : 'OFF'} successfully`,
        data: { isActive },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 1-Click Single Automation ON / OFF Switch
   */
  public static async toggleSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const existing = await prisma.automationRule.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Automation rule not found', 404);
      }

      const updated = await prisma.automationRule.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });

      let parsedFlowData = null;
      if (updated.flowData) {
        try {
          parsedFlowData = JSON.parse(updated.flowData);
        } catch {}
      }

      return res.json({
        success: true,
        message: `Automation "${updated.name}" is now ${updated.isActive ? 'ACTIVE' : 'PAUSED'}`,
        data: {
          ...updated,
          conditions: JSON.parse(updated.conditions || '{}'),
          actions: JSON.parse(updated.actions || '[]'),
          flowData: parsedFlowData,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
