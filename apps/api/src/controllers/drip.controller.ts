import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { DripService } from '../services/drip.service.js';
import { AppError } from '../middlewares/errorHandler.js';

export class DripController {
  /**
   * List all drip sequences for tenant
   */
  public static async listSequences(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const sequences = await DripService.listSequences(organizationId);

      return res.status(200).json({
        success: true,
        data: sequences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single sequence with steps & logs
   */
  public static async getSequenceById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const sequence = await prisma.dripSequence.findFirst({
        where: { id, organizationId },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
          enrollments: {
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: true,
              lead: true,
            },
          },
        },
      });

      if (!sequence) {
        throw new AppError('Drip sequence not found', 404);
      }

      return res.status(200).json({
        success: true,
        data: sequence,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new drip sequence
   */
  public static async createSequence(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, description, triggerType, triggerStatus, steps } = req.body;

      if (!name) {
        throw new AppError('Sequence name is required', 400);
      }

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        throw new AppError('At least one follow-up step is required', 400);
      }

      const sequence = await DripService.createSequence({
        organizationId,
        name,
        description,
        triggerType,
        triggerStatus,
        steps,
      });

      return res.status(201).json({
        success: true,
        message: 'Drip sequence created successfully',
        data: sequence,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing drip sequence & steps
   */
  public static async updateSequence(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { name, description, triggerType, triggerStatus, isActive, steps } = req.body;

      const existing = await prisma.dripSequence.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Drip sequence not found', 404);
      }

      await prisma.$transaction(async (tx) => {
        await tx.dripSequence.update({
          where: { id },
          data: {
            ...(name ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(triggerType ? { triggerType } : {}),
            ...(triggerStatus !== undefined ? { triggerStatus } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
          },
        });

        if (steps && Array.isArray(steps)) {
          // Replace steps
          await tx.dripStep.deleteMany({ where: { sequenceId: id } });
          await tx.dripStep.createMany({
            data: steps.map((s: any, idx: number) => ({
              sequenceId: id,
              stepOrder: s.stepOrder || idx + 1,
              delayMinutes: s.delayMinutes || 120,
              messageType: s.messageType || 'TEXT',
              messageContent: s.messageContent,
              mediaUrl: s.mediaUrl || null,
              buttonOptions: s.buttonOptions ? JSON.stringify(s.buttonOptions) : '[]',
            })),
          });
        }
      });

      const updated = await prisma.dripSequence.findUnique({
        where: { id },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      return res.status(200).json({
        success: true,
        message: 'Drip sequence updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete drip sequence
   */
  public static async deleteSequence(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const existing = await prisma.dripSequence.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Drip sequence not found', 404);
      }

      await prisma.dripSequence.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Drip sequence deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle active status of a sequence
   */
  public static async toggleSequence(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      const existing = await prisma.dripSequence.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new AppError('Drip sequence not found', 404);
      }

      const updated = await prisma.dripSequence.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });

      return res.status(200).json({
        success: true,
        message: `Sequence ${updated.isActive ? 'activated' : 'paused'}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually enroll a customer/lead into a sequence
   */
  public static async manualEnroll(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { sequenceId, customerId, leadId } = req.body;

      if (!sequenceId || !customerId) {
        throw new AppError('Sequence ID and Customer ID are required', 400);
      }

      const enrollment = await DripService.enrollCustomer({
        organizationId,
        sequenceId,
        customerId,
        leadId,
      });

      return res.status(200).json({
        success: true,
        message: 'Customer successfully enrolled into follow-up sequence',
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overarching drip analytics stats
   */
  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const [totalSequences, activeEnrollments, completedEnrollments, repliedEnrollments, convertedEnrollments] = await Promise.all([
        prisma.dripSequence.count({ where: { organizationId } }),
        prisma.dripEnrollment.count({ where: { organizationId, status: 'ACTIVE' } }),
        prisma.dripEnrollment.count({ where: { organizationId, status: 'COMPLETED' } }),
        prisma.dripEnrollment.count({ where: { organizationId, status: 'CANCELLED_REPLIED' } }),
        prisma.dripEnrollment.count({ where: { organizationId, status: 'CANCELLED_PURCHASED' } }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalSequences,
          activeEnrollments,
          completedEnrollments,
          repliedEnrollments,
          convertedEnrollments,
          totalReactivations: repliedEnrollments + convertedEnrollments,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
