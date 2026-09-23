import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { ProductionAuthService, hashToken } from '../src/services/auth.service.js';
import { SmsService } from '../src/services/providers/sms.service.js';

describe('Production Authentication & Session Architecture Tests', () => {
  const testEmail = `test_user_${Date.now()}@automatebydk.test`;
  const testPassword = 'SecurePassword@2025!';
  const testPhone = '+919988776655';
  let createdUserId: string;
  let createdOrgId: string;
  let activeSessionToken: string;
  let activeSessionId: string;

  beforeAll(async () => {
    // Cleanup any leftovers for this test run
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: 'test_user_' } },
          { phone: testPhone },
        ],
      },
    });
  }, 30000);

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  }, 30000);

  it('1. Registration: Creates User, Profile, Default Workspace & Session', async () => {
    const result = await ProductionAuthService.registerUser({
      email: testEmail,
      password: testPassword,
      name: 'Test Business Owner',
      phone: testPhone,
      businessName: 'Apex Fashion Studio',
      businessCategory: 'Apparel & Fashion',
      planTier: 'GROWTH',
      billingCycle: 'MONTHLY',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.isEmailVerified).toBe(false);
    expect(result.organization).toBeDefined();
    expect(result.organization.name).toBe('Apex Fashion Studio');
    expect(result.session.sessionToken).toBeDefined();

    createdUserId = result.user.id;
    createdOrgId = result.organization.id;
    activeSessionToken = result.session.sessionToken;
    activeSessionId = result.session.sessionId;

    const tokenHash = hashToken(activeSessionToken);
    const dbSession = await prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
    });
    expect(dbSession).not.toBeNull();
    expect(dbSession?.isRevoked).toBe(false);
  }, 30000);

  it('2. Login: Valid Credentials returns Active Session & Workspace', async () => {
    const loginResult = await ProductionAuthService.loginWithPassword({
      email: testEmail,
      password: testPassword,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
    });

    expect(loginResult.user.id).toBe(createdUserId);
    expect(loginResult.currentOrganization?.id).toBe(createdOrgId);
    expect(loginResult.session.sessionToken).toBeDefined();

    const attempt = await prisma.loginAttempt.findFirst({
      where: { identifier: testEmail },
      orderBy: { createdAt: 'desc' },
    });
    expect(attempt).not.toBeNull();
    expect(attempt?.status).toBe('SUCCESS');
  }, 30000);

  it('3. Login Failure: Incorrect Password Rejection (Enumeration Safe)', async () => {
    await expect(
      ProductionAuthService.loginWithPassword({
        email: testEmail,
        password: 'WrongPassword123!',
      })
    ).rejects.toThrow(/Invalid email or password/);

    const attempt = await prisma.loginAttempt.findFirst({
      where: { identifier: testEmail, status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(attempt).not.toBeNull();
  }, 30000);

  it('4. Phone Number Normalization & E.164 Format Validation', () => {
    expect(SmsService.normalizePhoneNumber('+91 98765 43210')).toBe('+919876543210');
    expect(SmsService.normalizePhoneNumber('9876543210')).toBe('+919876543210');
    expect(SmsService.normalizePhoneNumber('+1 (555) 234-5678')).toBe('+15552345678');
    expect(() => SmsService.normalizePhoneNumber('123')).toThrow();
  });

  it('5. Email Verification Token: Verification Updates isEmailVerified', async () => {
    const rawToken = 'test_email_verification_token_sample_123';
    const tokenHash = hashToken(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        userId: createdUserId,
        email: testEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const verifyResult = await ProductionAuthService.verifyEmailToken(rawToken);
    expect(verifyResult.success).toBe(true);

    const updatedUser = await prisma.user.findUnique({
      where: { id: createdUserId },
    });
    expect(updatedUser?.isEmailVerified).toBe(true);
  }, 30000);

  it('6. Password Reset Token: Request & Reset Flow', async () => {
    const rawResetToken = 'test_password_reset_token_sample_456';
    const resetTokenHash = hashToken(rawResetToken);

    await prisma.passwordResetToken.create({
      data: {
        userId: createdUserId,
        tokenHash: resetTokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const newPassword = 'NewSecurePassword@2026!';
    const resetResult = await ProductionAuthService.resetPasswordWithToken({
      token: rawResetToken,
      newPassword,
    });
    expect(resetResult.success).toBe(true);

    // Verify login with new password
    const newLogin = await ProductionAuthService.loginWithPassword({
      email: testEmail,
      password: newPassword,
    });
    expect(newLogin.user.id).toBe(createdUserId);
  }, 30000);

  it('7. Session & Device Management: Active Sessions and Revocation', async () => {
    const session1 = await ProductionAuthService.createSession({
      userId: createdUserId,
      userAgent: 'Chrome on Windows 11',
    });
    const session2 = await ProductionAuthService.createSession({
      userId: createdUserId,
      userAgent: 'Safari on iPhone',
    });

    const activeSessions = await ProductionAuthService.getUserSessions(createdUserId, session1.sessionId);
    expect(activeSessions.length).toBeGreaterThanOrEqual(2);

    const currentDeviceSession = activeSessions.find((s) => s.id === session1.sessionId);
    expect(currentDeviceSession?.isCurrent).toBe(true);

    // Revoke session2
    await ProductionAuthService.revokeSession(session2.sessionId, createdUserId);

    const remainingSessions = await ProductionAuthService.getUserSessions(createdUserId, session1.sessionId);
    expect(remainingSessions.find((s) => s.id === session2.sessionId)).toBeUndefined();
  }, 30000);

  it('8. Multi-Tenant Workspace Security Isolation: User A vs User B', async () => {
    const userB = await ProductionAuthService.registerUser({
      email: `user_b_${Date.now()}@automatebydk.test`,
      password: 'Password@123',
      name: 'User B',
      businessName: 'User B Enterprise',
    });

    const userAMembershipInOrgB = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: createdUserId,
          organizationId: userB.organization.id,
        },
      },
    });

    expect(userAMembershipInOrgB).toBeNull();

    // Cleanup User B
    await prisma.user.delete({ where: { id: userB.user.id } });
  }, 30000);
});
