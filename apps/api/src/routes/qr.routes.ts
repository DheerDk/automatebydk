import { Router } from 'express';
import { QRController } from '../controllers/qr.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Require authentication for all QR endpoints
router.use(authenticate);

router.post('/start', QRController.startSession);
router.get('/status', QRController.getStatus);
router.post('/logout', QRController.logout);

export default router;
