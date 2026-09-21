import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '@chatflow/shared';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), AuthController.refresh);
router.get('/me', authenticate, AuthController.getMe);

export default router;
