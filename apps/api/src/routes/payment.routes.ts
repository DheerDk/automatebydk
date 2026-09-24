import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate, requireTenant, requireRole } from '../middlewares/auth.js';
import { UserRole } from '@chatflow/shared';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for payment creation & verification
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many payment requests. Please try again after 15 minutes.' },
});

// Protected Tenant Payment Operations
router.use(authenticate, requireTenant, paymentLimiter);

// 1. Create Order for Plan Upgrade
router.post('/create-order', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), PaymentController.createOrder);

// 2. Verify Razorpay Signature & Upgrade Plan
router.post('/verify', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), PaymentController.verifyPayment);

// 3. Payment History & Invoices
router.get('/history', PaymentController.listPaymentHistory);

// 4. Create WhatsApp Store Payment Link for Customers
router.post('/store-link', PaymentController.createStorePaymentLink);

// 5. Send In-Chat WhatsApp Payment Link & Interactive Checkout Card
router.post('/in-chat-link', PaymentController.sendInChatPaymentLink);

// 6. List In-Chat Customer Orders
router.get('/orders', PaymentController.listStoreOrders);

export default router;
