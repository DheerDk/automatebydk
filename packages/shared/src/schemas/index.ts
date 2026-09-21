import { z } from 'zod';
import {
  UserRole,
  LeadStatus,
  ConversationStatus,
  StockStatus,
  AutomationTrigger,
  AutomationActionType,
  CampaignStatus,
} from '../types/index.js';

// Auth Schemas
export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must match'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must match'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Organization & Business Profile Schemas
export const businessProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  currency: z.string().default('INR'),
  businessHours: z.string().optional(),
  deliveryPolicy: z.string().optional(),
  returnPolicy: z.string().optional(),
  exchangePolicy: z.string().optional(),
  paymentMethods: z.string().optional(),
  welcomeMessage: z.string().optional(),
  aiAutoReplyEnabled: z.boolean().default(true),
  humanHandoffKeywords: z.array(z.string()).default(['human', 'agent', 'support', 'help', 'person']),
});

// Product Schemas
export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or positive'),
  discountPrice: z.number().min(0).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  stockStatus: z.nativeEnum(StockStatus).default(StockStatus.IN_STOCK),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

// Customer CRM Schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email().optional().nullable(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

// Lead Schemas
export const leadSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  productId: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  source: z.string().default('WHATSAPP'),
  assignedUserId: z.string().optional().nullable(),
  estimatedValue: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  notes: z.string().optional(),
});

// WhatsApp Send Message Schema
export const sendWhatsAppMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
  imageUrl: z.string().url().optional(),
  productId: z.string().optional(),
});

// WhatsApp Account Connection Schema
export const whatsAppConnectionSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  businessAccountId: z.string().min(1, 'Business Account ID is required'),
  accessToken: z.string().min(1, 'System Access Token is required'),
  verifyToken: z.string().min(1, 'Webhook Verify Token is required'),
  displayPhoneNumber: z.string().optional(),
  metaAppSecret: z.string().optional(),
});

// Automation Rule Schemas
export const automationRuleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  trigger: z.nativeEnum(AutomationTrigger),
  conditions: z.record(z.any()).default({}),
  actions: z.array(
    z.object({
      type: z.nativeEnum(AutomationActionType),
      payload: z.record(z.any()),
      delayMinutes: z.number().int().min(0).default(0),
    })
  ),
  isActive: z.boolean().default(true),
});

// Message Template Schemas
export const messageTemplateSchema = z.object({
  name: z.string().min(2),
  category: z.string().default('MARKETING'),
  language: z.string().default('en'),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

// Campaign Schemas
export const campaignSchema = z.object({
  name: z.string().min(2),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
  targetAudience: z.object({
    all: z.boolean().optional(),
    leadStatuses: z.array(z.nativeEnum(LeadStatus)).optional(),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
  }),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// AI Search Filters Schema
export const aiProductSearchFiltersSchema = z.object({
  category: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  minPrice: z.number().optional().nullable(),
  maxPrice: z.number().optional().nullable(),
  keywords: z.string().optional().nullable(),
});
