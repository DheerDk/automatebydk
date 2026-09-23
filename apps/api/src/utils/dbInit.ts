import { prisma } from './prisma.js';
import { logger } from './logger.js';
import bcrypt from 'bcryptjs';

export async function ensureDatabaseReady() {
  try {
    logger.info('🔄 Checking database tables & running schema synchronization...');

    // 1. Ensure all new columns and tables exist using raw SQL (works seamlessly over Supabase transaction pooler)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Plan" (
        "id" TEXT PRIMARY KEY,
        "tier" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "priceMonthly" DOUBLE PRECISION NOT NULL,
        "priceYearly" DOUBLE PRECISION NOT NULL,
        "maxProducts" INTEGER NOT NULL DEFAULT 50,
        "maxConversations" INTEGER NOT NULL DEFAULT 500,
        "maxUsers" INTEGER NOT NULL DEFAULT 2,
        "maxAutomations" INTEGER NOT NULL DEFAULT 5,
        "maxCampaigns" INTEGER NOT NULL DEFAULT 2,
        "aiSearchLimit" INTEGER NOT NULL DEFAULT 1000,
        "features" TEXT NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch((e) => logger.warn('Plan table creation note:', e.message));

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT UNIQUE NOT NULL,
        "planTier" TEXT NOT NULL DEFAULT 'FREE',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
        "autoRenew" BOOLEAN NOT NULL DEFAULT true,
        "paymentMethod" TEXT DEFAULT 'CARD',
        "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "currentPeriodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch((e) => logger.warn('Subscription table creation note:', e.message));

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "subscriptionId" TEXT,
        "amount" DOUBLE PRECISION NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "status" TEXT NOT NULL DEFAULT 'COMPLETED',
        "paymentMethod" TEXT NOT NULL DEFAULT 'CARD',
        "transactionId" TEXT UNIQUE NOT NULL,
        "planTier" TEXT DEFAULT 'STARTER',
        "invoiceNumber" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch((e) => logger.warn('Payment table creation note:', e.message));

    // Ensure Subscription columns
    const subscriptionColumns = [
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "planTier" TEXT DEFAULT 'FREE';`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'MONTHLY';`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN DEFAULT true;`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CARD';`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN DEFAULT false;`,
    ];
    for (const col of subscriptionColumns) {
      await prisma.$executeRawUnsafe(col).catch(() => {});
    }

    // Ensure Payment columns
    const paymentColumns = [
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "planTier" TEXT DEFAULT 'STARTER';`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CARD';`,
    ];
    for (const col of paymentColumns) {
      await prisma.$executeRawUnsafe(col).catch(() => {});
    }

    // Ensure User columns
    const userColumns = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'LOCAL';`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpCode" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpExpires" TIMESTAMP(3);`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP(3);`,
    ];
    for (const col of userColumns) {
      await prisma.$executeRawUnsafe(col).catch(() => {});
    }

    // Ensure Organization columns
    const orgColumns = [
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'Retail & E-commerce';`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);`,
    ];
    for (const col of orgColumns) {
      await prisma.$executeRawUnsafe(col).catch(() => {});
    }

    // Ensure BusinessSettings columns
    const settingsColumns = [
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "aiSystemPrompt" TEXT;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "aiKnowledgeBase" TEXT;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "aiCustomFaqs" TEXT DEFAULT '[]';`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "aiTone" TEXT DEFAULT 'FRIENDLY';`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "aiFallbackMessage" TEXT DEFAULT 'I am sorry, I am not sure about that. Let me connect you with our store team!';`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "aiIncludeCatalog" BOOLEAN DEFAULT true;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "onlyUnsavedContacts" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "excludedNumbers" TEXT DEFAULT '';`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "humanHandoffKeywords" TEXT DEFAULT 'human,agent,support,help,person,representative';`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "address" TEXT;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "phone" TEXT;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "email" TEXT;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "website" TEXT;`,
      `ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "instagram" TEXT;`,
    ];
    for (const col of settingsColumns) {
      await prisma.$executeRawUnsafe(col).catch(() => {});
    }

    // 2. Ensure Plans exist
    const planCount = await prisma.plan.count().catch(() => 0);
    if (planCount === 0) {
      const defaultPlans = [
        {
          id: 'plan_free',
          tier: 'FREE',
          name: 'Free Starter',
          priceMonthly: 0,
          priceYearly: 0,
          maxProducts: 20,
          maxConversations: 200,
          maxUsers: 1,
          maxAutomations: 2,
          maxCampaigns: 1,
          aiSearchLimit: 500,
          features: JSON.stringify(['WhatsApp Webhook', 'Basic Catalog', 'Lead Capture', 'Standard Support']),
        },
        {
          id: 'plan_starter',
          tier: 'STARTER',
          name: 'Starter Pro',
          priceMonthly: 1499,
          priceYearly: 14990,
          maxProducts: 100,
          maxConversations: 2000,
          maxUsers: 3,
          maxAutomations: 10,
          maxCampaigns: 5,
          aiSearchLimit: 5000,
          features: JSON.stringify(['AI Product Search', 'Automated Follow-ups', 'CRM & Kanban', '3 Team Members', 'Priority Support']),
        },
        {
          id: 'plan_growth',
          tier: 'GROWTH',
          name: 'Growth Business',
          priceMonthly: 2999,
          priceYearly: 29990,
          maxProducts: 500,
          maxConversations: 10000,
          maxUsers: 10,
          maxAutomations: 50,
          maxCampaigns: 20,
          aiSearchLimit: 25000,
          features: JSON.stringify(['Advanced OpenAI Integration', 'Broadcast Campaigns', 'Custom Webhooks', 'Full Analytics', '10 Team Members']),
        },
        {
          id: 'plan_pro',
          tier: 'PRO',
          name: 'Enterprise Scale',
          priceMonthly: 5999,
          priceYearly: 59990,
          maxProducts: 5000,
          maxConversations: 50000,
          maxUsers: 50,
          maxAutomations: 200,
          maxCampaigns: 100,
          aiSearchLimit: 100000,
          features: JSON.stringify(['Unlimited Everything', 'Dedicated Meta Account Manager', 'Custom AI Fine-tuning', '24/7 SLA Support']),
        },
      ];

      for (const p of defaultPlans) {
        await prisma.plan.upsert({
          where: { tier: p.tier },
          update: {},
          create: p,
        }).catch(() => {});
      }
      logger.info('✅ Default subscription plans ready');
    }

    // 3. Ensure Super Admin exists
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@chatflow.ai' },
    }).catch(() => null);

    if (!superAdmin) {
      const adminPass = await bcrypt.hash('Admin@123456', 10);
      await prisma.user.create({
        data: {
          email: 'admin@chatflow.ai',
          name: 'ChatFlow Platform Admin',
          phone: '+919999900001',
          role: 'SUPER_ADMIN',
          password: adminPass,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          authProvider: 'LOCAL',
        },
      }).catch((e) => logger.warn('Super admin creation note:', e.message));
      logger.info('✅ Super Admin account ready (admin@chatflow.ai)');
    }

    // 4. Ensure StyleHub Demo Store Owner & Staff exist and have memberships
    let ownerUser = await prisma.user.findUnique({
      where: { email: 'owner@stylehub.com' },
      include: { memberships: true },
    }).catch(() => null);

    const pass = await bcrypt.hash('Password@123', 10);
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          email: 'owner@stylehub.com',
          name: 'Priya Sharma',
          phone: '+919876543210',
          role: 'BUSINESS_OWNER',
          password: pass,
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          authProvider: 'LOCAL',
        },
        include: { memberships: true },
      }).catch(() => null);
    }

    let staffUser = await prisma.user.findUnique({
      where: { email: 'staff@stylehub.com' },
      include: { memberships: true },
    }).catch(() => null);

    if (!staffUser) {
      staffUser = await prisma.user.create({
        data: {
          email: 'staff@stylehub.com',
          name: 'Rahul Verma',
          phone: '+919876543211',
          role: 'STAFF',
          password: pass,
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          authProvider: 'LOCAL',
        },
        include: { memberships: true },
      }).catch(() => null);
    }

    if (ownerUser && staffUser) {
      let org = await prisma.organization.findUnique({
        where: { slug: 'stylehub' },
        include: { subscription: true, settings: true },
      }).catch(() => null);

      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: 'StyleHub Fashion & Lifestyle',
            slug: 'stylehub',
            logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80',
            status: 'ACTIVE',
            isVerified: true,
            category: 'Retail & E-commerce',
            memberships: {
              create: [
                { userId: ownerUser.id, role: 'BUSINESS_OWNER' },
                { userId: staffUser.id, role: 'STAFF' },
              ],
            },
            settings: {
              create: {
                currency: 'INR',
                businessHours: 'Mon-Sat: 10:00 AM - 09:00 PM, Sun: 11:00 AM - 07:00 PM',
                deliveryPolicy: 'Express shipping in 2-3 business days across India.',
                returnPolicy: 'Hassle-free 7-day return & refund guarantee.',
                paymentMethods: 'UPI, Credit/Debit Cards, Net Banking, and COD.',
                welcomeMessage: '👋 Welcome to *StyleHub Fashion & Lifestyle*!\n\n1️⃣ Browse Catalog\n2️⃣ Search Product\n3️⃣ Offers & Deals\n4️⃣ Talk to Support',
                aiAutoReplyEnabled: true,
                address: '42, Commercial Street, Bangalore - 560001',
                phone: '+91 98765 43210',
                email: 'support@stylehub.com',
              },
            },
            whatsappAccount: {
              create: {
                phoneNumberId: '109823485729104',
                businessAccountId: '209384729182394',
                accessToken: 'mock_meta_token_stylehub_live_2025',
                verifyToken: 'chatflow_webhook_verify_token_secure_xyz_987',
                displayPhoneNumber: '+91 98765 43210',
                status: 'CONNECTED',
              },
            },
            subscription: {
              create: {
                planTier: 'GROWTH',
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          include: { subscription: true, settings: true },
        }).catch((e) => {
          logger.warn('Demo org creation note:', e.message);
          return null;
        });
      }

      if (org) {
        // Guarantee memberships exist
        await prisma.membership.upsert({
          where: { userId_organizationId: { userId: ownerUser.id, organizationId: org.id } },
          update: {},
          create: { userId: ownerUser.id, organizationId: org.id, role: 'BUSINESS_OWNER' },
        }).catch(() => {});

        await prisma.membership.upsert({
          where: { userId_organizationId: { userId: staffUser.id, organizationId: org.id } },
          update: {},
          create: { userId: staffUser.id, organizationId: org.id, role: 'STAFF' },
        }).catch(() => {});

        if (!org.subscription) {
          await prisma.subscription.create({
            data: {
              organizationId: org.id,
              planTier: 'GROWTH',
              status: 'ACTIVE',
              billingCycle: 'MONTHLY',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          }).catch(() => {});
        }
      }
      logger.info('✅ Demo Organization StyleHub ready with active subscription and memberships');
    }
  } catch (err: any) {
    logger.warn('Database initialization warning (non-fatal):', err?.message || err);
  }
}
