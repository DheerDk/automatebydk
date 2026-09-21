import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from './errorHandler.js';
import { UserRole } from '@chatflow/shared';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
      organizationId?: string;
      membershipRole?: UserRole;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or invalid Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let payload: TokenPayload;

    try {
      payload = verifyAccessToken(token);
    } catch (jwtErr) {
      throw new AppError('Invalid or expired authentication token.', 401, 'TOKEN_EXPIRED');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401, 'USER_NOT_FOUND');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };

    // Determine target organizationId
    const targetOrgId =
      (req.headers['x-organization-id'] as string) ||
      payload.organizationId ||
      req.params.orgId ||
      req.query.organizationId as string;

    if (targetOrgId) {
      if (user.role === UserRole.SUPER_ADMIN) {
        req.organizationId = targetOrgId;
        req.membershipRole = UserRole.SUPER_ADMIN;
      } else {
        const membership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: targetOrgId,
            },
          },
        });

        if (!membership) {
          throw new AppError('Access denied. You do not belong to this organization.', 403, 'FORBIDDEN_TENANT');
        }

        req.organizationId = targetOrgId;
        req.membershipRole = membership.role as UserRole;
      }
    } else {
      // If no org specified, find the user's primary organization membership
      const firstMembership = await prisma.membership.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (firstMembership) {
        req.organizationId = firstMembership.organizationId;
        req.membershipRole = firstMembership.role as UserRole;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.organizationId) {
    return next(new AppError('Organization context is required for this operation.', 400, 'ORG_CONTEXT_REQUIRED'));
  }
  next();
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    const currentRole = req.membershipRole || req.user.role;
    if (!roles.includes(currentRole as UserRole)) {
      return next(new AppError('Access forbidden: Insufficient permissions for this action.', 403, 'FORBIDDEN_ROLE'));
    }

    next();
  };
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
    return next(new AppError('Access restricted to Super Administrators.', 403, 'SUPER_ADMIN_REQUIRED'));
  }
  next();
};
