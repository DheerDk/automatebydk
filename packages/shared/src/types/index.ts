// User & Organization Roles
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

// Lead Pipeline Statuses
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  INTERESTED = 'INTERESTED',
  FOLLOW_UP = 'FOLLOW_UP',
  NEGOTIATION = 'NEGOTIATION',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

// Conversation Lifecycle
export enum ConversationStatus {
  AI_ACTIVE = 'AI_ACTIVE',
  HUMAN_REQUIRED = 'HUMAN_REQUIRED',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
}

// Message Direction & Status
export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  PRODUCT = 'PRODUCT',
  TEMPLATE = 'TEMPLATE',
  INTERACTIVE = 'INTERACTIVE',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

// Product Stock Status
export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

// Automations
export enum AutomationTrigger {
  GREETING = 'GREETING',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  KEYWORD_MATCH = 'KEYWORD_MATCH',
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_STATUS_CHANGED = 'LEAD_STATUS_CHANGED',
  NO_RESPONSE = 'NO_RESPONSE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  HUMAN_HANDOFF_REQUESTED = 'HUMAN_HANDOFF_REQUESTED',
}

export enum AutomationActionType {
  SEND_MESSAGE = 'SEND_MESSAGE',
  SEND_TEMPLATE = 'SEND_TEMPLATE',
  SEND_PRODUCT_CATALOG = 'SEND_PRODUCT_CATALOG',
  CREATE_LEAD = 'CREATE_LEAD',
  UPDATE_LEAD_STATUS = 'UPDATE_LEAD_STATUS',
  ASSIGN_STAFF = 'ASSIGN_STAFF',
  ADD_TAGS = 'ADD_TAGS',
  SCHEDULE_FOLLOWUP = 'SCHEDULE_FOLLOWUP',
  NOTIFY_ADMIN = 'NOTIFY_ADMIN',
}

// Campaigns
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  FAILED = 'FAILED',
}

// Organization Status
export enum OrganizationStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

// Subscriptions
export enum SubscriptionPlanTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// WhatsApp Connection State
export enum WhatsAppConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  ERROR = 'ERROR',
}

// AI Intents
export enum CustomerIntent {
  GREETING = 'GREETING',
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  PRODUCT_DETAILS = 'PRODUCT_DETAILS',
  PRICE_ENQUIRY = 'PRICE_ENQUIRY',
  OFFERS = 'OFFERS',
  ORDER_TRACKING = 'ORDER_TRACKING',
  STORE_INFO = 'STORE_INFO',
  FAQ = 'FAQ',
  HUMAN_SUPPORT = 'HUMAN_SUPPORT',
  COMPLAINT = 'COMPLAINT',
  UNKNOWN = 'UNKNOWN',
}

export enum AiTone {
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  SALES_DRIVEN = 'SALES_DRIVEN',
  HINGLISH = 'HINGLISH',
  CONCISE = 'CONCISE',
}

export interface CustomFaqItem {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
  category?: string;
}

