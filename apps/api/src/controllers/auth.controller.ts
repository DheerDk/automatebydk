import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';
import { UserRole } from '@chatflow/shared';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessName, ownerName, email, phone, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
      }

      // Generate organization slug
      let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!baseSlug) baseSlug = 'store';
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const passwordHash = await hashPassword(password);

      // Create user, organization, membership, and default settings in a single transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            name: ownerName,
            phone: phone || null,
            password: passwordHash,
            role: 'BUSINESS_OWNER',
          },
        });

        const organization = await tx.organization.create({
          data: {
            name: businessName,
            slug,
            memberships: {
              create: {
                userId: user.id,
                role: 'BUSINESS_OWNER',
              },
            },
            settings: {
              create: {
                currency: 'INR',
                welcomeMessage: `👋 Welcome to ${businessName}!\n\n1️⃣ Browse Products\n2️⃣ Search a Product\n3️⃣ Offers & Deals\n4️⃣ Talk to Support\n\nReply with a number to begin.`,
                aiAutoReplyEnabled: true,
              },
            },
            whatsappAccount: {
              create: {
                phoneNumberId: 'pending_setup',
                businessAccountId: 'pending_setup',
                accessToken: 'pending_setup',
                verifyToken: 'chatflow_webhook_verify_token_secure_xyz_987',
                status: 'DISCONNECTED',
              },
            },
            subscription: {
              create: {
                planTier: 'FREE',
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        });

        return { user, organization };
      });

      const tokenPayload = {
        userId: result.user.id,
        email: result.user.email,
        role: UserRole.BUSINESS_OWNER,
        organizationId: result.organization.id,
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      await AuditService.log({
        organizationId: result.organization.id,
        userId: result.user.id,
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: result.user.id,
        details: { businessName, email },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          },
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            slug: result.organization.slug,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      });

      if (!user) {
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      // Pick primary organization
      const primaryMembership = user.memberships[0];
      const organizationId = primaryMembership?.organizationId;

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: (primaryMembership?.role as UserRole) || (user.role as UserRole),
        organizationId,
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      await AuditService.log({
        organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          organizations: user.memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          })),
          currentOrganization: primaryMembership ? {
            id: primaryMembership.organization.id,
            name: primaryMembership.organization.name,
            slug: primaryMembership.organization.slug,
            role: primaryMembership.role,
          } : null,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'TOKEN_REQUIRED');
      }

      const payload = verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      const newAccessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: payload.role,
        organizationId: payload.organizationId,
      });

      return res.json({
        success: true,
        data: { accessToken: newAccessToken },
      });
    } catch (error) {
      next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatarUrl: true,
          memberships: {
            include: {
              organization: {
                include: {
                  settings: true,
                  whatsappAccount: {
                    select: {
                      id: true,
                      status: true,
                      displayPhoneNumber: true,
                      phoneNumberId: true,
                      lastWebhookReceivedAt: true,
                    },
                  },
                  subscription: true,
                },
              },
            },
          },
        },
      });

      if (!user) throw new AppError('User not found', 404);

      const currentOrg = req.organizationId
        ? user.memberships.find((m) => m.organization.id === req.organizationId)?.organization
        : user.memberships[0]?.organization;

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          organizations: user.memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          })),
          currentOrganization: currentOrg || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
