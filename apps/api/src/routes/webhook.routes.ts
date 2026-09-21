import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

// Meta WhatsApp Webhook endpoints
router.get('/whatsapp', WebhookController.verifyWebhook);
router.post('/whatsapp', WebhookController.handleWebhook);

// Direct Testing Simulator endpoint
router.post('/simulate', WebhookController.simulateIncoming);

export default router;
