import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/auth.validation.js';

const router = Router();

// 1. Core Registration & Password Login (Hardened with authLimiter & validation)
router.post('/register', authLimiter, validateRequest(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), AuthController.login);

// 2. Google OAuth 2.0 / OpenID Connect
router.get('/google/url', authLimiter, AuthController.getGoogleAuthUrl);
router.post('/google', authLimiter, AuthController.googleAuth);

// 3. Phone OTP Verification (Hardened with strict otpLimiter)
router.post('/otp/request', otpLimiter, validateRequest(requestOtpSchema), AuthController.sendOtp);
router.post('/otp/send', otpLimiter, validateRequest(requestOtpSchema), AuthController.sendOtp);
router.post('/otp/verify', otpLimiter, validateRequest(verifyOtpSchema), AuthController.verifyOtp);

// 4. Email Verification
router.post('/email/verify', authLimiter, AuthController.verifyEmail);
router.post('/email/resend-verification', otpLimiter, AuthController.resendVerificationEmail);

// 5. Password Reset & Recovery
router.post('/password/forgot', authLimiter, validateRequest(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/password/reset', authLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword);

// 6. Authenticated Profile & Security Endpoints
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, AuthController.updateProfile);
router.post('/password/change', authenticate, validateRequest(changePasswordSchema), AuthController.changePassword);

// 7. Session & Device Management
router.get('/sessions', authenticate, AuthController.getActiveSessions);
router.delete('/sessions/:sessionId', authenticate, AuthController.revokeSession);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-others', authenticate, AuthController.logoutOtherDevices);
router.post('/logout-all', authenticate, AuthController.logoutAll);

// 8. Login History & Security
router.get('/security/login-history', authenticate, AuthController.getLoginHistory);
router.delete('/account', authenticate, AuthController.deleteAccount);

export default router;
