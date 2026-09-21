import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { hashPassword } from '../utils/token.js';
import { AppError } from '../middlewares/errorHandler.js';
import { UserRole } from '@chatflow/shared';

export class OrganizationController {
  public static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;

      const memberships = await prisma.membership.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        data: memberships.map((m) => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt,
          user: m.user,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { name, email, role = 'STAFF', password = 'Password@123' } = req.body;

      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        const passwordHash = await hashPassword(password);
        user = await prisma.user.create({
          data: {
            name,
            email: email.toLowerCase(),
            password: passwordHash,
            role: 'STAFF',
          },
        });
      }

      // Create membership
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId,
          },
        },
      });

      if (existingMembership) {
        throw new AppError('User is already a member of this organization', 400);
      }

      const membership = await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId,
          role: role as string,
        },
        include: { user: true },
      });

      return res.status(201).json({
        success: true,
        message: 'Team member added successfully',
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { memberId } = req.params;

      const membership = await prisma.membership.findFirst({
        where: { id: memberId, organizationId },
      });

      if (!membership) {
        throw new AppError('Membership not found', 404);
      }

      if (membership.role === UserRole.BUSINESS_OWNER) {
        throw new AppError('Cannot remove the primary business owner', 400);
      }

      await prisma.membership.delete({ where: { id: memberId } });

      return res.json({
        success: true,
        message: 'Member removed from organization',
      });
    } catch (error) {
      next(error);
    }
  }
}
