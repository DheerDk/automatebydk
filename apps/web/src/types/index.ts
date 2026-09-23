export {
  UserRole,
  LeadStatus,
  ConversationStatus,
  MessageDirection,
  MessageType,
  MessageStatus,
  StockStatus,
  AutomationTrigger,
  AutomationActionType,
  CampaignStatus,
} from '@chatflow/shared';

export interface ConnectedAccount {
  provider: string;
  email?: string | null;
  connectedAt: string;
}

export interface UserSession {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface LoginHistoryItem {
  id: string;
  authMethod: string;
  status: string;
  failureReason?: string | null;
  ipAddress: string;
  deviceName: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  status?: string;
  authProvider?: string;
  connectedAccounts?: ConnectedAccount[];
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  category?: string | null;
  status?: string;
  isVerified?: boolean;
  approvalNote?: string | null;
  approvedAt?: string | null;
  role?: string;
  settings?: BusinessSettings;
  whatsappAccount?: WhatsAppAccountSummary | null;
  subscription?: Subscription;
}

export interface BusinessSettings {
  id: string;
  currency: string;
  businessHours?: string | null;
  deliveryPolicy?: string | null;
  returnPolicy?: string | null;
  exchangePolicy?: string | null;
  paymentMethods?: string | null;
  welcomeMessage?: string | null;
  aiAutoReplyEnabled: boolean;
  humanHandoffKeywords: string[];
  onlyUnsavedContacts?: boolean;
  excludedNumbers?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
}

export interface WhatsAppAccountSummary {
  id: string;
  status: string;
  displayPhoneNumber?: string | null;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  lastWebhookReceivedAt?: string | null;
  isConfigured?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  productCount?: number;
}

export interface Product {
  id: string;
  categoryId?: string | null;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  stock: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  images: string[];
  tags: string[];
  isActive: boolean;
  enquiryCount: number;
  category?: Category | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  tags: string[];
  notes?: string | null;
  lastInteractionAt: string;
  createdAt: string;
  conversationCount?: number;
  leadCount?: number;
  latestLead?: Lead | null;
}

export interface Lead {
  id: string;
  organizationId: string;
  customerId: string;
  productId?: string | null;
  status: string;
  source: string;
  assignedUserId?: string | null;
  estimatedValue?: number | null;
  notes?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  product?: Product;
  assignedUser?: { id: string; name: string; email: string; avatarUrl?: string } | null;
  events?: LeadEvent[];
}

export interface LeadEvent {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  note?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

export interface Conversation {
  id: string;
  customerId: string;
  status: string;
  assignedUserId?: string | null;
  lastMessageText?: string | null;
  lastMessageAt: string;
  unreadCount: number;
  customer?: Customer;
  assignedUser?: { id: string; name: string; email: string; avatarUrl?: string } | null;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  customerId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  status: string;
  content: string;
  mediaUrl?: string | null;
  metadata?: any;
  whatsappMessageId?: string | null;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  conditions: Record<string, any>;
  actions: Array<{ type: string; payload: any; delayMinutes?: number }>;
  flowData?: string | null;
  isActive: boolean;
  executionCount: number;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  variables: string[];
  status: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateId?: string | null;
  customMessage?: string | null;
  targetAudience: Record<string, any>;
  status: string;
  scheduledAt?: string | null;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  template?: MessageTemplate | null;
}

export interface Subscription {
  id: string;
  planTier: string;
  status: string;
  billingCycle?: string;
  autoRenew?: boolean;
  paymentMethod?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  planTier?: string;
  invoiceNumber?: string;
  createdAt: string;
  organization?: { id: string; name: string; slug: string };
}

export interface Plan {
  id: string;
  tier: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxProducts: number;
  maxConversations: number;
  maxUsers: number;
  maxAutomations: number;
  maxCampaigns: number;
  aiSearchLimit: number;
  features: string[];
}
