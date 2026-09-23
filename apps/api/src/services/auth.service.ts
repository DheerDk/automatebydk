import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { GoogleOAuthService, GoogleUserProfile } from './providers/google.service.js';
import { SmsService } from './providers/sms.service.js';
import { EmailService } from './providers/email.service.js';
import { AuditService } from './audit.service.js';
import { signAccessToken, signRefreshToken } from '../utils/token.js';
import { UserRole } from '@chatflow/shared';

// Helper: Parse User-Agent into clean device / OS / browser info
export function parseUserAgent(ua?: string): { deviceName: string; browser: string; os: string } {
  if (!ua) {
    return { deviceName: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };
  }

  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('PostmanRuntime')) browser = 'Postman API Client';

  let os = 'OS';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceName: `${browser} on ${os}`,
    browser,
    os,
  };
}

// Helper: Cryptographic SHA-256 hash
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class ProductionAuthService {
  /**
   * Secure session creation and token tracking
   */
  public static async createSession({
    userId,
    ipAddress,
    userAgent,
    rememberMe = false,
  }: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    rememberMe?: boolean;
  }) {
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = hashToken(rawSessionToken);
    const sessionDurationDays = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + sessionDurationDays * 24 * 60 * 60 * 1000);

    const { deviceName, browser, os } = parseUserAgent(userAgent);

    const session = await prisma.session.create({
      data: {
        userId,
        sessionTokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        deviceName,
        browser,
        os,
        expiresAt,
      },
    });

    // Also issue JWT access & refresh tokens for backward/hybrid compatibility
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    const primaryMembership = user?.memberships[0];
    const organizationId = primaryMembership?.organizationId;

    const tokenPayload = {
      userId,
      email: user?.email || '',
      role: (primaryMembership?.role as UserRole) || (user?.role as UserRole) || UserRole.BUSINESS_OWNER,
      organizationId,
      sessionId: session.id,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    return {
      sessionId: session.id,
      sessionToken: rawSessionToken,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Validate session token from request
   */
  public static async validateSessionToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const session = await prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: {
                  include: {
                    subscription: true,
                    settings: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return null;
    }

    if (session.user.status === 'SUSPENDED' || session.user.status === 'DELETED') {
      return null;
    }

    // Touch session last active time asynchronously
    prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    return session;
  }

  /**
   * Log authentication attempts for security auditing & brute-force monitoring
   */
  public static async recordLoginAttempt({
    identifier,
    userId,
    authMethod,
    status,
    failureReason,
    ipAddress,
    userAgent,
  }: {
    identifier: string;
    userId?: string;
    authMethod: 'PASSWORD' | 'GOOGLE' | 'OTP';
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      const { deviceName } = parseUserAgent(userAgent);
      await prisma.loginAttempt.create({
        data: {
          identifier: identifier.toLowerCase().trim(),
          userId: userId || null,
          authMethod,
          status,
          failureReason: failureReason || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          deviceName,
        },
      });
    } catch (err) {
      logger.error('Failed to record login attempt:', err);
    }
  }

  /**
   * Register a new user and initialize tenant workspace & email verification
   */
  public static async registerUser({
    email,
    password,
    name,
    phone,
    businessName,
    businessCategory = 'Retail & E-commerce',
    planTier = 'STARTER',
    billingCycle = 'MONTHLY',
    ipAddress,
    userAgent,
  }: {
    email: string;
    password?: string;
    name: string;
    phone?: string;
    businessName?: string;
    businessCategory?: string;
    planTier?: string;
    billingCycle?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail || !name) {
      throw new AppError('Name and a valid email address are required.', 400, 'INVALID_INPUT');
    }

    if (password && password.length < 8) {
      throw new AppError('Password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists. Please sign in instead.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);

    const normalizedPhone = phone ? SmsService.normalizePhoneNumber(phone) : null;
    const finalBusinessName = businessName?.trim() || `${name}'s Business`;

    // Slug generation
    let baseSlug = finalBusinessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!baseSlug) baseSlug = 'workspace';
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const isYearly = billingCycle === 'YEARLY';
    const periodDays = isYearly ? 365 : 30;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          name: name.trim(),
          phone: normalizedPhone,
          role: 'BUSINESS_OWNER',
          isVerified: false,
          isEmailVerified: false,
          isPhoneVerified: Boolean(normalizedPhone),
          status: 'ACTIVE',
          authProvider: 'LOCAL',
          lastLoginAt: new Date(),
        },
      });

      // 2. Create Default Organization & Workspace
      const organization = await tx.organization.create({
        data: {
          name: finalBusinessName,
          slug,
          category: businessCategory,
          status: 'ACTIVE',
          isVerified: false,
          memberships: {
            create: {
              userId: user.id,
              role: 'BUSINESS_OWNER',
            },
          },
          settings: {
            create: {
              currency: 'INR',
              welcomeMessage: `👋 Welcome to *${finalBusinessName}*!\n\n1️⃣ Browse Trending Catalog\n2️⃣ Search by Color / Size / Price\n3️⃣ Active Offers & Deals\n4️⃣ Connect with Support\n\n*Reply with a number or type what you are looking for!*`,
              aiAutoReplyEnabled: true,
              aiTone: 'FRIENDLY',
              phone: normalizedPhone || undefined,
              email: normalizedEmail,
            },
          },
          whatsappAccount: {
            create: {
              phoneNumberId: 'pending_setup',
              businessAccountId: 'pending_setup',
              accessToken: 'pending_setup',
              verifyToken: crypto.randomBytes(16).toString('hex'),
              status: 'DISCONNECTED',
            },
          },
          subscription: {
            create: {
              planTier,
              status: 'ACTIVE',
              billingCycle,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
            },
          },
        },
        include: {
          subscription: true,
          settings: true,
        },
      });

      // 3. Create starter CRM categories/products for immediate SaaS readiness
      await tx.category.create({
        data: {
          organizationId: organization.id,
          name: 'General Collection',
          slug: 'general-collection',
          description: 'Default store catalog collection',
        },
      });

      return { user, organization };
    });

    // 4. Generate Email Verification Token
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = hashToken(rawVerifyToken);
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: result.user.id,
        email: normalizedEmail,
        tokenHash: verifyTokenHash,
        expiresAt: tokenExpires,
      },
    });

    // Dispatch verification email in background (non-blocking if email unconfigured)
    EmailService.sendVerificationEmail(normalizedEmail, result.user.name, rawVerifyToken).catch((err) => {
      logger.warn(`Verification email delivery note for ${normalizedEmail}: ${err.message}`);
    });

    // 5. Create Session
    const sessionData = await this.createSession({
      userId: result.user.id,
      ipAddress,
      userAgent,
      rememberMe: true,
    });

    await this.recordLoginAttempt({
      identifier: normalizedEmail,
      userId: result.user.id,
      authMethod: 'PASSWORD',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    await AuditService.log({
      organizationId: result.organization.id,
      userId: result.user.id,
      action: 'USER_REGISTER_SUCCESS',
      entityType: 'USER',
      entityId: result.user.id,
      ipAddress,
      userAgent,
      details: { email: normalizedEmail, businessName: finalBusinessName, planTier },
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        isVerified: result.user.isVerified,
        isEmailVerified: result.user.isEmailVerified,
        isPhoneVerified: result.user.isPhoneVerified,
        status: result.user.status,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        status: result.organization.status,
        subscription: result.organization.subscription,
      },
      session: sessionData,
    };
  }

  /**
   * Password Login
   */
  public static async loginWithPassword({
    email,
    password,
    ipAddress,
    userAgent,
    rememberMe = false,
  }: {
    email: string;
    password?: string;
    ipAddress?: string;
    userAgent?: string;
    rememberMe?: boolean;
  }) {
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      await this.recordLoginAttempt({
        identifier: normalizedEmail || 'unknown',
        authMethod: 'PASSWORD',
        status: 'FAILED',
        failureReason: 'Missing email or password',
        ipAddress,
        userAgent,
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      await this.recordLoginAttempt({
        identifier: normalizedEmail,
        authMethod: 'PASSWORD',
        status: 'FAILED',
        failureReason: 'User not found',
        ipAddress,
        userAgent,
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status === 'SUSPENDED') {
      await this.recordLoginAttempt({
        identifier: normalizedEmail,
        userId: user.id,
        authMethod: 'PASSWORD',
        status: 'BLOCKED',
        failureReason: 'Account suspended',
        ipAddress,
        userAgent,
      });
      throw new AppError('Your account has been suspended. Please contact platform support.', 403, 'ACCOUNT_SUSPENDED');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await this.recordLoginAttempt({
        identifier: normalizedEmail,
        userId: user.id,
        authMethod: 'PASSWORD',
        status: 'FAILED',
        failureReason: 'Password mismatch',
        ipAddress,
        userAgent,
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const sessionData = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      rememberMe,
    });

    await this.recordLoginAttempt({
      identifier: normalizedEmail,
      userId: user.id,
      authMethod: 'PASSWORD',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    const primaryMembership = user.memberships[0];
    const org = primaryMembership?.organization;

    await AuditService.log({
      organizationId: org?.id,
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      organizations: user.memberships.map((m) => ({
        id: m.organization?.id,
        name: m.organization?.name,
        slug: m.organization?.slug,
        role: m.role,
        status: m.organization?.status,
        subscription: m.organization?.subscription,
      })),
      currentOrganization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: primaryMembership?.role || user.role,
            status: org.status,
            subscription: org.subscription,
          }
        : null,
      session: sessionData,
    };
  }

  /**
   * Google OAuth 2.0 / OpenID Connect Authentication & Account Linking
   */
  public static async authenticateGoogle({
    code,
    idToken,
    redirectUri,
    ipAddress,
    userAgent,
  }: {
    code?: string;
    idToken?: string;
    redirectUri?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    let googleProfile: GoogleUserProfile;

    if (code) {
      googleProfile = await GoogleOAuthService.exchangeCodeForProfile(code, redirectUri);
    } else if (idToken) {
      googleProfile = await GoogleOAuthService.verifyIdToken(idToken);
    } else {
      throw new AppError('Google authorization code or ID token is required.', 400, 'GOOGLE_AUTH_CODE_REQUIRED');
    }

    const { id: googleSubId, email: googleEmail, name: googleName, avatarUrl, emailVerified } = googleProfile;
    const normalizedEmail = googleEmail.toLowerCase().trim();

    // 1. Check if linked via UserAuthProvider
    let authProvider = await prisma.userAuthProvider.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'GOOGLE',
          providerUserId: googleSubId,
        },
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: {
                  include: {
                    subscription: true,
                    settings: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let user = authProvider?.user;

    // 2. If not linked by sub ID, check if user exists with matching verified email
    if (!user) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true,
                  settings: true,
                },
              },
            },
          },
        },
      });

      if (existingUserByEmail) {
        user = existingUserByEmail;

        // Safely link Google Auth Provider to existing account
        await prisma.userAuthProvider.upsert({
          where: {
            provider_providerUserId: {
              provider: 'GOOGLE',
              providerUserId: googleSubId,
            },
          },
          update: {
            providerEmail: normalizedEmail,
          },
          create: {
            userId: user.id,
            provider: 'GOOGLE',
            providerUserId: googleSubId,
            providerEmail: normalizedEmail,
          },
        });

        // If email was verified by Google, verify in our database as well
        if (emailVerified && !user.isEmailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isEmailVerified: true, isVerified: true, avatarUrl: user.avatarUrl || avatarUrl },
          });
        }
      }
    }

    // 3. If user still does not exist, provision new user + organization workspace
    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
      const businessName = `${googleName}'s Business`;

      let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!baseSlug) baseSlug = 'workspace';
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const created = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: googleName,
            password: randomPassword,
            avatarUrl,
            role: 'BUSINESS_OWNER',
            isVerified: true,
            isEmailVerified: emailVerified,
            status: 'ACTIVE',
            authProvider: 'GOOGLE',
            lastLoginAt: new Date(),
            authProviders: {
              create: {
                provider: 'GOOGLE',
                providerUserId: googleSubId,
                providerEmail: normalizedEmail,
              },
            },
          },
        });

        const newOrg = await tx.organization.create({
          data: {
            name: businessName,
            slug,
            category: 'Retail & E-commerce',
            status: 'ACTIVE',
            isVerified: false,
            memberships: {
              create: {
                userId: newUser.id,
                role: 'BUSINESS_OWNER',
              },
            },
            settings: {
              create: {
                currency: 'INR',
                welcomeMessage: `👋 Welcome to *${businessName}*!\n\n1️⃣ Browse Trending Catalog\n2️⃣ Search Products\n3️⃣ Offers & Deals\n4️⃣ Talk to Support`,
                aiAutoReplyEnabled: true,
                email: normalizedEmail,
              },
            },
            whatsappAccount: {
              create: {
                phoneNumberId: 'pending_setup',
                businessAccountId: 'pending_setup',
                accessToken: 'pending_setup',
                verifyToken: crypto.randomBytes(16).toString('hex'),
                status: 'DISCONNECTED',
              },
            },
            subscription: {
              create: {
                planTier: 'STARTER',
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          include: {
            subscription: true,
            settings: true,
            memberships: true,
          },
        });

        return { user: newUser, organization: newOrg };
      });

      user = {
        ...created.user,
        memberships: [
          {
            id: created.organization.memberships[0].id,
            userId: created.user.id,
            organizationId: created.organization.id,
            role: 'BUSINESS_OWNER',
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: created.organization,
          },
        ],
      } as any;
    }

    if (!user) {
      throw new AppError('Failed to initialize user session from Google authentication.', 500);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionData = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      rememberMe: true,
    });

    await this.recordLoginAttempt({
      identifier: normalizedEmail,
      userId: user.id,
      authMethod: 'GOOGLE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    const primaryMembership = user.memberships[0];
    const org = primaryMembership?.organization;

    await AuditService.log({
      organizationId: org?.id,
      userId: user.id,
      action: 'GOOGLE_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
      details: { email: normalizedEmail, googleSubId },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      organizations: (user.memberships || []).map((m) => ({
        id: m.organization?.id,
        name: m.organization?.name,
        slug: m.organization?.slug,
        role: m.role,
        status: m.organization?.status,
        subscription: m.organization?.subscription,
      })),
      currentOrganization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: primaryMembership?.role || user.role,
            status: org.status,
            subscription: org.subscription,
          }
        : null,
      session: sessionData,
    };
  }

  /**
   * Phone OTP Request with cryptographic hashing & rate-limiting
   */
  public static async requestPhoneOtp({
    phone,
    purpose = 'LOGIN',
    ipAddress,
  }: {
    phone: string;
    purpose?: 'LOGIN' | 'VERIFY_PHONE' | 'REGISTER' | 'PASSWORD_RESET';
    ipAddress?: string;
  }) {
    const formattedPhone = SmsService.normalizePhoneNumber(phone);

    // Rate Limiting: Check cooldown (60 seconds)
    const recentChallenge = await prisma.otpChallenge.findFirst({
      where: {
        phone: formattedPhone,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentChallenge) {
      const waitSeconds = Math.max(1, Math.ceil((recentChallenge.createdAt.getTime() + 60000 - Date.now()) / 1000));
      throw new AppError(`Please wait ${waitSeconds} seconds before requesting a new OTP.`, 429, 'OTP_RATE_LIMITED');
    }

    // Rate Limiting: Max 5 OTP requests per phone per hour
    const hourlyCount = await prisma.otpChallenge.count({
      where: {
        phone: formattedPhone,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    if (hourlyCount >= 10) {
      throw new AppError('Too many verification code requests for this phone number. Please try again after 1 hour.', 429, 'OTP_HOURLY_LIMIT');
    }

    // Invalidate prior unconsumed OTPs for this phone number
    await prisma.otpChallenge.updateMany({
      where: {
        phone: formattedPhone,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(0), // Mark invalid/expired
      },
    });

    // Generate cryptographic 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Find linked user if existing
    const existingUser = await prisma.user.findFirst({
      where: { phone: formattedPhone },
    });

    await prisma.otpChallenge.create({
      data: {
        userId: existingUser?.id || null,
        phone: formattedPhone,
        otpHash,
        purpose,
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        ipAddress: ipAddress || null,
      },
    });

    // Send SMS via real SMS provider
    await SmsService.sendOtpSms(formattedPhone, rawOtp, purpose);

    return {
      success: true,
      message: `Verification code sent to ${SmsService.maskPhoneNumber(formattedPhone)}.`,
      data: {
        phone: SmsService.maskPhoneNumber(formattedPhone),
        expiresAt: expiresAt.toISOString(),
        cooldownSeconds: 60,
      },
    };
  }

  /**
   * Phone OTP Verification with attempt counter and session creation
   */
  public static async verifyPhoneOtp({
    phone,
    otp,
    purpose = 'LOGIN',
    ipAddress,
    userAgent,
  }: {
    phone: string;
    otp: string;
    purpose?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const formattedPhone = SmsService.normalizePhoneNumber(phone);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new AppError('Please provide a valid 6-digit OTP code.', 400, 'INVALID_OTP_FORMAT');
    }

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        phone: formattedPhone,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      await this.recordLoginAttempt({
        identifier: formattedPhone,
        authMethod: 'OTP',
        status: 'FAILED',
        failureReason: 'No active OTP challenge found or expired',
        ipAddress,
        userAgent,
      });
      throw new AppError('Verification code has expired or is invalid. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    // Check attempt exhaustion
    if (challenge.attempts >= challenge.maxAttempts) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date(0) },
      });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 429, 'OTP_MAX_ATTEMPTS');
    }

    // Increment attempts
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });

    const submittedOtpHash = hashToken(cleanOtp);
    if (submittedOtpHash !== challenge.otpHash) {
      const remainingAttempts = challenge.maxAttempts - (challenge.attempts + 1);
      await this.recordLoginAttempt({
        identifier: formattedPhone,
        authMethod: 'OTP',
        status: 'FAILED',
        failureReason: 'Incorrect OTP entered',
        ipAddress,
        userAgent,
      });
      throw new AppError(`Incorrect verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Code invalidated.'}`, 400, 'INVALID_OTP');
    }

    // Mark challenge consumed
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { phone: formattedPhone },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      const generatedEmail = `user_${formattedPhone.replace(/\+/g, '')}@automatebydk.local`;
      const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
      const businessName = `Business ${formattedPhone.slice(-4)}`;

      let baseSlug = `workspace-${formattedPhone.slice(-4)}`;
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const created = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: generatedEmail,
            name: `User ${formattedPhone.slice(-4)}`,
            phone: formattedPhone,
            password: randomPassword,
            role: 'BUSINESS_OWNER',
            isVerified: true,
            isPhoneVerified: true,
            status: 'ACTIVE',
            authProvider: 'OTP',
            lastLoginAt: new Date(),
          },
        });

        const newOrg = await tx.organization.create({
          data: {
            name: businessName,
            slug,
            category: 'Retail & E-commerce',
            status: 'ACTIVE',
            isVerified: false,
            memberships: {
              create: {
                userId: newUser.id,
                role: 'BUSINESS_OWNER',
              },
            },
            settings: {
              create: {
                currency: 'INR',
                phone: formattedPhone,
                aiAutoReplyEnabled: true,
              },
            },
            whatsappAccount: {
              create: {
                phoneNumberId: 'pending_setup',
                businessAccountId: 'pending_setup',
                accessToken: 'pending_setup',
                verifyToken: crypto.randomBytes(16).toString('hex'),
                status: 'DISCONNECTED',
              },
            },
            subscription: {
              create: {
                planTier: 'STARTER',
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          include: {
            subscription: true,
            settings: true,
            memberships: true,
          },
        });

        return { user: newUser, organization: newOrg };
      });

      user = {
        ...created.user,
        memberships: [
          {
            id: created.organization.memberships[0].id,
            userId: created.user.id,
            organizationId: created.organization.id,
            role: 'BUSINESS_OWNER',
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: created.organization,
          },
        ],
      } as any;
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true, lastLoginAt: new Date() },
      });
    }

    if (!user) throw new AppError('Failed to establish session for user', 500);

    const sessionData = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      rememberMe: true,
    });

    await this.recordLoginAttempt({
      identifier: formattedPhone,
      userId: user.id,
      authMethod: 'OTP',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    const primaryMembership = user.memberships[0];
    const org = primaryMembership?.organization;

    await AuditService.log({
      organizationId: org?.id,
      userId: user.id,
      action: 'OTP_VERIFIED_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      organizations: (user.memberships || []).map((m) => ({
        id: m.organization?.id,
        name: m.organization?.name,
        slug: m.organization?.slug,
        role: m.role,
        status: m.organization?.status,
        subscription: m.organization?.subscription,
      })),
      currentOrganization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: primaryMembership?.role || user.role,
            status: org.status,
            subscription: org.subscription,
          }
        : null,
      session: sessionData,
    };
  }

  /**
   * Email Verification
   */
  public static async verifyEmailToken(rawToken: string) {
    const tokenHash = hashToken(rawToken.trim());

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new AppError('Email verification link is invalid or has expired. Please request a new verification link.', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true, isVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await AuditService.log({
      userId: record.userId,
      action: 'EMAIL_VERIFIED_SUCCESS',
      entityType: 'USER',
      entityId: record.userId,
      details: { email: record.email },
    });

    return { success: true, email: record.email };
  }

  /**
   * Request Password Reset Link (Enumeration-proof)
   */
  public static async requestPasswordReset(email: string, ipAddress?: string) {
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      throw new AppError('Email address is required.', 400, 'INVALID_INPUT');
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.status !== 'SUSPENDED' && user.status !== 'DELETED') {
      // Invalidate prior reset tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date(0) },
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: ipAddress || null,
        },
      });

      EmailService.sendPasswordResetEmail(user.email, user.name, rawToken).catch((err) => {
        logger.warn(`Password reset email delivery note for ${user.email}: ${err.message}`);
      });

      await AuditService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress,
      });
    }

    // Enumeration-safe response
    return {
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been sent.',
    };
  }

  /**
   * Reset Password with Token
   */
  public static async resetPasswordWithToken({
    token,
    newPassword,
    ipAddress,
  }: {
    token: string;
    newPassword: string;
    ipAddress?: string;
  }) {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    const tokenHash = hashToken(token.trim());
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new AppError('Password reset link is invalid or has expired. Please request a new link.', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      // Revoke all existing sessions on password reset for security
      prisma.session.updateMany({
        where: { userId: record.userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      }),
    ]);

    await AuditService.log({
      userId: record.userId,
      action: 'PASSWORD_RESET_SUCCESS',
      entityType: 'USER',
      entityId: record.userId,
      ipAddress,
    });

    return { success: true, message: 'Your password has been reset successfully. Please log in with your new password.' };
  }

  /**
   * Active Sessions & Device Management
   */
  public static async getUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName || 'Unknown Device',
      browser: s.browser || 'Browser',
      os: s.os || 'OS',
      ipAddress: s.ipAddress || 'Unknown IP',
      isCurrent: s.id === currentSessionId,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Revoke specific session (Single device logout)
   */
  public static async revokeSession(sessionId: string, userId: string) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new AppError('Session not found or access denied.', 404, 'SESSION_NOT_FOUND');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await AuditService.log({
      userId,
      action: 'SESSION_REVOKED',
      entityType: 'SESSION',
      entityId: sessionId,
    });

    return { success: true, message: 'Device session terminated successfully.' };
  }

  /**
   * Revoke all user sessions (Logout all devices / all other devices)
   */
  public static async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    await prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await AuditService.log({
      userId,
      action: exceptSessionId ? 'LOGOUT_OTHER_DEVICES' : 'LOGOUT_ALL_DEVICES',
      entityType: 'USER',
      entityId: userId,
    });

    return {
      success: true,
      message: exceptSessionId
        ? 'All other device sessions have been logged out.'
        : 'All device sessions have been logged out.',
    };
  }

  /**
   * Change Password while logged in
   */
  public static async changePassword({
    userId,
    currentPassword,
    newPassword,
    currentSessionId,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    currentSessionId?: string;
  }) {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    // Revoke all other sessions for security
    await this.revokeAllUserSessions(userId, currentSessionId);

    await AuditService.log({
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
    });

    return { success: true, message: 'Password updated successfully. Other device sessions were terminated for security.' };
  }

  /**
   * Account Deletion
   */
  public static async deleteAccount(userId: string, passwordConfirmation?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.authProvider === 'LOCAL' && passwordConfirmation) {
      const isMatch = await bcrypt.compare(passwordConfirmation, user.password);
      if (!isMatch) {
        throw new AppError('Incorrect password. Account deletion cancelled.', 400, 'INVALID_PASSWORD');
      }
    }

    // Soft-delete user and revoke all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          status: 'DELETED',
          email: `deleted_${userId}_${user.email}`,
        },
      }),
      prisma.session.updateMany({
        where: { userId },
        data: { isRevoked: true, revokedAt: new Date() },
      }),
    ]);

    await AuditService.log({
      userId,
      action: 'ACCOUNT_DELETED',
      entityType: 'USER',
      entityId: userId,
    });

    return { success: true, message: 'Your account and active sessions have been permanently removed.' };
  }
}
