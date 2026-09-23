import { Router } from 'express';
import authRoutes from './auth.routes.js';
import webhookRoutes from './webhook.routes.js';
import qrRoutes from './qr.routes.js';
import uploadRoutes from './upload.routes.js';
import { ProductController } from '../controllers/product.controller.js';
import { CategoryController } from '../controllers/category.controller.js';
import { CustomerController } from '../controllers/customer.controller.js';
import { LeadController } from '../controllers/lead.controller.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { MessageController } from '../controllers/message.controller.js';
import { AutomationController } from '../controllers/automation.controller.js';
import { TemplateController } from '../controllers/template.controller.js';
import { CampaignController } from '../controllers/campaign.controller.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { OrganizationController } from '../controllers/organization.controller.js';
import { SuperAdminController } from '../controllers/superadmin.controller.js';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { AiController } from '../controllers/ai.controller.js';
import { UserRole } from '@chatflow/shared';
import { authenticate, requireTenant, requireRole, requireSuperAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  generalApiLimiter,
  aiLimiter,
  campaignLimiter,
  webhookLimiter,
} from '../middlewares/rateLimiter.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '../validations/campaign.validation.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoMate by DK API',
    tagline: 'Automate conversations. Capture leads. Grow your business.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public Auth & Webhook
router.use('/auth', authRoutes);
router.use('/webhooks', webhookLimiter, webhookRoutes);

// Public Plans List
router.get('/plans', SuperAdminController.listPlans);

// Protected Tenant Routes (Require Authentication + Tenant Context + General API Shield)
const tenantRouter = Router();
tenantRouter.use(authenticate, requireTenant, generalApiLimiter);

// Secure File Upload Engine (Images, Media, Contacts CSV)
tenantRouter.use('/upload', uploadRoutes);

// Subscription & Invoices (Protected: only owners/admins can modify billing)
tenantRouter.get('/subscription', SubscriptionController.getSubscription);
tenantRouter.post('/subscription/renew', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), SubscriptionController.renewSubscription);
tenantRouter.post('/subscription/upgrade', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), SubscriptionController.upgradePlan);
tenantRouter.get('/subscription/invoices', SubscriptionController.listInvoices);

// Products
tenantRouter.get('/products', ProductController.list);
tenantRouter.get('/products/:id', ProductController.getById);
tenantRouter.post('/products', ProductController.create);
tenantRouter.put('/products/:id', ProductController.update);
tenantRouter.delete('/products/:id', ProductController.delete);

// Categories
tenantRouter.get('/categories', CategoryController.list);
tenantRouter.post('/categories', CategoryController.create);
tenantRouter.put('/categories/:id', CategoryController.update);
tenantRouter.delete('/categories/:id', CategoryController.delete);

// Customers CRM
tenantRouter.get('/customers', CustomerController.list);
tenantRouter.get('/customers/:id', CustomerController.getById);
tenantRouter.put('/customers/:id', CustomerController.update);

// Leads & Kanban
tenantRouter.get('/leads/kanban', LeadController.getKanban);
tenantRouter.get('/leads', LeadController.list);
tenantRouter.post('/leads', LeadController.create);
tenantRouter.put('/leads/:id/status', LeadController.updateStatus);

// WhatsApp Inbox & Conversations
tenantRouter.get('/conversations', ConversationController.list);
tenantRouter.get('/conversations/:id', ConversationController.getById);
tenantRouter.put('/conversations/:id/status', ConversationController.updateStatus);
tenantRouter.post('/messages/send', MessageController.sendMessage);

// Automations
tenantRouter.get('/automations', AutomationController.list);
tenantRouter.post('/automations', AutomationController.create);
tenantRouter.put('/automations/:id', AutomationController.update);
tenantRouter.delete('/automations/:id', AutomationController.delete);

// Templates & Broadcast Campaigns
tenantRouter.get('/templates', TemplateController.list);
tenantRouter.post('/templates', TemplateController.create);
tenantRouter.put('/templates/:id', TemplateController.update);
tenantRouter.delete('/templates/:id', TemplateController.delete);

tenantRouter.get('/campaigns', CampaignController.list);
tenantRouter.post('/campaigns', validateRequest(createCampaignSchema), CampaignController.create);
tenantRouter.put('/campaigns/:id', validateRequest(updateCampaignSchema), CampaignController.update);
tenantRouter.delete('/campaigns/:id', CampaignController.delete);
tenantRouter.post('/campaigns/:id/launch', campaignLimiter, CampaignController.launch);

// Analytics
tenantRouter.get('/analytics/dashboard', AnalyticsController.getDashboardStats);

// Settings (Sensitive: only business owner & admins can change profile or WhatsApp credentials)
tenantRouter.get('/settings', SettingsController.getSettings);
tenantRouter.put('/settings/profile', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), SettingsController.updateBusinessProfile);
tenantRouter.post('/settings/whatsapp', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), SettingsController.updateWhatsAppCredentials);

// Team & Members (Protected: only business owner & admins can manage team)
tenantRouter.get('/organization/members', OrganizationController.getMembers);
tenantRouter.post('/organization/members', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), OrganizationController.inviteMember);
tenantRouter.delete('/organization/members/:memberId', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), OrganizationController.removeMember);

// AI Sandbox & Test Search & Custom Business Agent Training (Rate Limited)
tenantRouter.get('/ai/training', AiController.getTraining);
tenantRouter.put('/ai/training', requireRole(UserRole.BUSINESS_OWNER, UserRole.ADMIN), AiController.updateTraining);
tenantRouter.post('/ai/test-agent', aiLimiter, AiController.testAgent);
tenantRouter.post('/ai/test-search', aiLimiter, AiController.testSearch);
tenantRouter.post('/ai/test-faq', aiLimiter, AiController.testFaq);

// WhatsApp QR Code Session Routes
tenantRouter.use('/whatsapp/qr', qrRoutes);

// Super Admin Routes (Mounted before tenantRouter)
const superAdminRouter = Router();
superAdminRouter.use(authenticate, requireSuperAdmin);
superAdminRouter.get('/stats', SuperAdminController.getPlatformStats);
superAdminRouter.post('/organizations/:id/approve', SuperAdminController.approveOrganization);
superAdminRouter.post('/organizations/:id/reject', SuperAdminController.rejectOrganization);
superAdminRouter.put('/organizations/:id/subscription', SuperAdminController.updateTenantSubscription);
superAdminRouter.get('/payments', SuperAdminController.listAllPayments);
router.use('/super-admin', superAdminRouter);

// Protected Tenant Routes
router.use('/', tenantRouter);

export default router;
