import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from './errorHandler.js';
import { UserRole } from '@chatflow/shared';
import { ProductionAuthService } from '../services/auth.service.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        isVerified?: boolean;
        isEmailVerified?: boolean;
        isPhoneVerified?: boolean;
      };
      sessionId?: string;
      organizationId?: string;
      membershipRole?: UserRole;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = (req as any).cookies?.chatflow_session;
    let rawToken = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.split(' ')[1];
    } else if (cookieToken) {
      rawToken = cookieToken;
    }

    if (!rawToken) {
      throw new AppError('Authentication required. Missing or invalid Bearer token.', 401, 'UNAUTHORIZED');
    }

    let userId: string | null = null;
    let sessionId: string | undefined = undefined;

    // 1. Try resolving as a direct session token
    if (rawToken.length === 64) {
      // 32-byte hex token
      const session = await ProductionAuthService.validateSessionToken(rawToken);
      if (session) {
        userId = session.userId;
        sessionId = session.id;
      }
    }

    // 2. Try resolving as JWT if not matched as raw session token
    if (!userId) {
      try {
        const payload = verifyAccessToken(rawToken);
        userId = payload.userId;
        sessionId = (payload as any).sessionId;

        // If sessionId was encoded in JWT, verify it has not been revoked in DB
        if (sessionId) {
          const dbSession = await prisma.session.findUnique({
            where: { id: sessionId },
          });
          if (!dbSession || dbSession.isRevoked || dbSession.expiresAt < new Date()) {
            throw new AppError('Session has been revoked or expired. Please sign in again.', 401, 'SESSION_REVOKED');
          }
        }
      } catch (jwtErr: any) {
        if (jwtErr instanceof AppError) throw jwtErr;
        throw new AppError('Invalid or expired authentication token.', 401, 'TOKEN_EXPIRED');
      }
    }

    if (!userId) {
      throw new AppError('Authentication failed. Invalid session.', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new AppError('User belonging to this token no longer exists or account is inactive.', 401, 'USER_INACTIVE');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    };
    req.sessionId = sessionId;

    // Determine target organizationId (multi-tenant context)
    const targetOrgId =
      (req.headers['x-organization-id'] as string) ||
      req.params.orgId ||
      (req.query.organizationId as string);

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
