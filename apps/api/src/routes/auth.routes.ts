import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/otp/send', AuthController.sendOtp);
router.post('/otp/verify', AuthController.verifyOtp);
router.post('/google', AuthController.googleAuth);
router.get('/me', authenticate, AuthController.getMe);

export default router;
