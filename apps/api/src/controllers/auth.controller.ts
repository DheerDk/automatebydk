import { Request, Response, NextFunction } from 'express';
import { ProductionAuthService } from '../services/auth.service.js';
import { GoogleOAuthService } from '../services/providers/google.service.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';
import { SmsService } from '../services/providers/sms.service.js';
import { EmailService } from '../services/providers/email.service.js';
import { UserRole } from '@chatflow/shared';

export class AuthController {
  /**
   * Register a new user account + default workspace
   */
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        name,
        phone,
        businessName,
        businessCategory,
        planTier,
        billingCycle,
      } = req.body;

      const result = await ProductionAuthService.registerUser({
        email,
        password,
        name: name || businessName || 'Store Owner',
        phone,
        businessName,
        businessCategory,
        planTier,
        billingCycle,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Set session cookie if in browser context
      res.cookie('chatflow_session', result.session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        success: true,
        message: 'Account and workspace created successfully. Please check your email to verify your account.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Email and password login
   */
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rememberMe } = req.body;

      const result = await ProductionAuthService.loginWithPassword({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        rememberMe: Boolean(rememberMe),
      });

      res.cookie('chatflow_session', result.session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: result.user,
          organizations: result.organizations,
          currentOrganization: result.currentOrganization,
          accessToken: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          sessionToken: result.session.sessionToken,
          sessionId: result.session.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate official Google OAuth 2.0 Authorization URL
   */
  public static async getGoogleAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const isConfigured = GoogleOAuthService.isConfigured();
      if (!isConfigured) {
        return res.json({
          success: false,
          isConfigured: false,
          message: 'Google Sign-In is not configured on this server yet.',
        });
      }

      const state = (req.query.state as string) || undefined;
      const redirectUri = (req.query.redirectUri as string) || undefined;
      const url = GoogleOAuthService.getAuthorizationUrl(state, redirectUri);

      return res.json({
        success: true,
        isConfigured: true,
        url,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Official Google OAuth 2.0 / OpenID Connect callback exchange
   */
  public static async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, idToken, redirectUri } = req.body;

      const result = await ProductionAuthService.authenticateGoogle({
        code,
        idToken,
        redirectUri,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('chatflow_session', result.session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: 'Authenticated with Google successfully',
        data: {
          user: result.user,
          organizations: result.organizations,
          currentOrganization: result.currentOrganization,
          accessToken: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          sessionToken: result.session.sessionToken,
          sessionId: result.session.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request Phone OTP (dispatched via SMS with cryptographic challenge)
   */
  public static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, purpose } = req.body;
      if (!phone) {
        throw new AppError('Phone number is required to send verification code.', 400, 'PHONE_REQUIRED');
      }

      const result = await ProductionAuthService.requestPhoneOtp({
        phone,
        purpose: purpose || 'LOGIN',
        ipAddress: req.ip,
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Phone OTP and create authenticated session
   */
  public static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp, purpose } = req.body;
      if (!phone || !otp) {
        throw new AppError('Phone number and 6-digit OTP code are required.', 400, 'INVALID_INPUT');
      }

      const result = await ProductionAuthService.verifyPhoneOtp({
        phone,
        otp,
        purpose: purpose || 'LOGIN',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('chatflow_session', result.session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          user: result.user,
          organizations: result.organizations,
          currentOrganization: result.currentOrganization,
          accessToken: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          sessionToken: result.session.sessionToken,
          sessionId: result.session.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Email Token
   */
  public static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) {
        throw new AppError('Verification token is required.', 400, 'TOKEN_REQUIRED');
      }

      const result = await ProductionAuthService.verifyEmailToken(token);
      return res.json({
        success: true,
        message: 'Your email address has been verified successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend Verification Email
   */
  public static async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const normalizedEmail = email?.toLowerCase().trim() || req.user?.email;

      if (!normalizedEmail) {
        throw new AppError('Email address is required.', 400, 'EMAIL_REQUIRED');
      }

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return res.json({
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.',
        });
      }

      if (user.isEmailVerified) {
        return res.json({
          success: true,
          message: 'Your email address is already verified.',
        });
      }

      // Check recent tokens (cooldown 2 minutes)
      const recent = await prisma.emailVerificationToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
        },
      });

      if (recent) {
        throw new AppError('Please wait 2 minutes before requesting another verification email.', 429, 'RATE_LIMITED');
      }

      const rawVerifyToken = (await import('crypto')).randomBytes(32).toString('hex');
      const verifyTokenHash = (await import('crypto')).createHash('sha256').update(rawVerifyToken).digest('hex');

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash: verifyTokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await EmailService.sendVerificationEmail(user.email, user.name, rawVerifyToken);

      return res.json({
        success: true,
        message: 'A fresh verification link has been sent to your email address.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request Password Reset Link (Enumeration-proof)
   */
  public static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await ProductionAuthService.requestPasswordReset(email, req.ip);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset Password with Token
   */
  public static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        throw new AppError('Reset token and new password are required.', 400, 'INVALID_INPUT');
      }

      const result = await ProductionAuthService.resetPasswordWithToken({
        token,
        newPassword,
        ipAddress: req.ip,
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Password (while authenticated)
   */
  public static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required.', 400, 'INVALID_INPUT');
      }

      const result = await ProductionAuthService.changePassword({
        userId: req.user.id,
        currentPassword,
        newPassword,
        currentSessionId: req.sessionId,
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve Authenticated User Profile & Restored Workspace Data
   */
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
          isVerified: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          authProviders: {
            select: {
              provider: true,
              providerEmail: true,
              createdAt: true,
            },
          },
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

      if (!user || user.status === 'DELETED') {
        throw new AppError('User account not found or has been removed.', 404, 'USER_NOT_FOUND');
      }

      const targetOrgId = req.organizationId;
      const currentOrgMembership = targetOrgId
        ? user.memberships.find((m) => m.organization?.id === targetOrgId)
        : user.memberships[0];

      const currentOrg = currentOrgMembership?.organization || user.memberships[0]?.organization || null;

      return res.json({
        authenticated: true,
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            connectedAccounts: user.authProviders.map((p) => ({
              provider: p.provider,
              email: p.providerEmail,
              connectedAt: p.createdAt,
            })),
          },
          organizations: user.memberships.map((m) => ({
            id: m.organization?.id,
            name: m.organization?.name,
            slug: m.organization?.slug,
            role: m.role,
            status: m.organization?.status,
            isVerified: m.organization?.isVerified,
            subscription: m.organization?.subscription,
          })),
          currentOrganization: currentOrg
            ? {
                id: currentOrg.id,
                name: currentOrg.name,
                slug: currentOrg.slug,
                role: currentOrgMembership?.role || user.role,
                status: currentOrg.status,
                isVerified: currentOrg.isVerified,
                settings: currentOrg.settings,
                whatsappAccount: currentOrg.whatsappAccount,
                subscription: currentOrg.subscription,
              }
            : null,
          sessionId: req.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Profile Information
   */
  public static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { name, phone, avatarUrl } = req.body;
      const normalizedPhone = phone ? SmsService.normalizePhoneNumber(phone) : undefined;

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(phone !== undefined ? { phone: normalizedPhone, isPhoneVerified: phone ? false : false } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      await AuditService.log({
        userId: req.user.id,
        action: 'PROFILE_UPDATED',
        entityType: 'USER',
        entityId: req.user.id,
        details: { name, phone: normalizedPhone },
      });

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Active Sessions List (Device Management)
   */
  public static async getActiveSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const sessions = await ProductionAuthService.getUserSessions(req.user.id, req.sessionId);
      return res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke Single Device Session
   */
  public static async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { sessionId } = req.params;
      const result = await ProductionAuthService.revokeSession(sessionId, req.user.id);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke All Other Devices
   */
  public static async logoutOtherDevices(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const result = await ProductionAuthService.revokeAllUserSessions(req.user.id, req.sessionId);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout Current Device
   */
  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user && req.sessionId) {
        await ProductionAuthService.revokeSession(req.sessionId, req.user.id).catch(() => {});
        await AuditService.log({
          userId: req.user.id,
          action: 'USER_LOGOUT',
          entityType: 'SESSION',
          entityId: req.sessionId,
        });
      }

      res.clearCookie('chatflow_session');
      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout All Devices
   */
  public static async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await ProductionAuthService.revokeAllUserSessions(req.user.id);
      }

      res.clearCookie('chatflow_session');
      return res.json({
        success: true,
        message: 'All active sessions have been logged out.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login History & Security Audit Logs
   */
  public static async getLoginHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const attempts = await prisma.loginAttempt.findMany({
        where: {
          OR: [
            { userId: req.user.id },
            { identifier: req.user.email.toLowerCase() },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      return res.json({
        success: true,
        data: {
          history: attempts.map((a) => ({
            id: a.id,
            authMethod: a.authMethod,
            status: a.status,
            failureReason: a.failureReason,
            ipAddress: a.ipAddress || 'Unknown IP',
            deviceName: a.deviceName || 'Unknown Device',
            createdAt: a.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Account Deletion
   */
  public static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { passwordConfirmation } = req.body;
      const result = await ProductionAuthService.deleteAccount(req.user.id, passwordConfirmation);

      res.clearCookie('chatflow_session');
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
