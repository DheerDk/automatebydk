import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// 1. Core Registration & Password Login
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// 2. Google OAuth 2.0 / OpenID Connect
router.get('/google/url', AuthController.getGoogleAuthUrl);
router.post('/google', AuthController.googleAuth);

// 3. Phone OTP Verification
router.post('/otp/request', AuthController.sendOtp);
router.post('/otp/send', AuthController.sendOtp);
router.post('/otp/verify', AuthController.verifyOtp);

// 4. Email Verification
router.post('/email/verify', AuthController.verifyEmail);
router.post('/email/resend-verification', AuthController.resendVerificationEmail);

// 5. Password Reset & Recovery
router.post('/password/forgot', AuthController.forgotPassword);
router.post('/password/reset', AuthController.resetPassword);

// 6. Authenticated Profile & Security Endpoints
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, AuthController.updateProfile);
router.post('/password/change', authenticate, AuthController.changePassword);

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
