import { Router } from 'express';
import authRoutes from './auth.routes.js';
import webhookRoutes from './webhook.routes.js';
import qrRoutes from './qr.routes.js';
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
import { AiController } from '../controllers/ai.controller.js';
import { authenticate, requireTenant, requireRole, requireSuperAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  productSchema,
  categorySchema,
  leadSchema,
  updateLeadStatusSchema,
  sendWhatsAppMessageSchema,
  businessProfileSchema,
  automationRuleSchema,
  campaignSchema,
} from '@chatflow/shared';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ChatFlow AI API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public Auth & Webhook
router.use('/auth', authRoutes);
router.use('/webhooks', webhookRoutes);

// Public Plans List
router.get('/plans', SuperAdminController.listPlans);

// Protected Tenant Routes (Require Authentication + Tenant Context)
const tenantRouter = Router();
tenantRouter.use(authenticate, requireTenant);

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
tenantRouter.delete('/templates/:id', TemplateController.delete);

tenantRouter.get('/campaigns', CampaignController.list);
tenantRouter.post('/campaigns', CampaignController.create);
tenantRouter.post('/campaigns/:id/launch', CampaignController.launch);

// Analytics
tenantRouter.get('/analytics/dashboard', AnalyticsController.getDashboardStats);

// Settings
tenantRouter.get('/settings', SettingsController.getSettings);
tenantRouter.put('/settings/profile', SettingsController.updateBusinessProfile);
tenantRouter.post('/settings/whatsapp', SettingsController.updateWhatsAppCredentials);

// Team & Members
tenantRouter.get('/organization/members', OrganizationController.getMembers);
tenantRouter.post('/organization/members', OrganizationController.inviteMember);
tenantRouter.delete('/organization/members/:memberId', OrganizationController.removeMember);

// AI Sandbox & Test Search
tenantRouter.post('/ai/test-search', AiController.testSearch);
tenantRouter.post('/ai/test-faq', AiController.testFaq);

// WhatsApp QR Code Session Routes
tenantRouter.use('/whatsapp/qr', qrRoutes);

router.use('/', tenantRouter);

// Super Admin Routes
const superAdminRouter = Router();
superAdminRouter.use(authenticate, requireSuperAdmin);
superAdminRouter.get('/stats', SuperAdminController.getPlatformStats);
router.use('/super-admin', superAdminRouter);

export default router;
