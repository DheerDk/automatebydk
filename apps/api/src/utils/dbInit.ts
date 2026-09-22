import { prisma } from './prisma.js';
import { logger } from './logger.js';
import bcrypt from 'bcryptjs';

export async function ensureDatabaseReady() {
  try {
    // 1. Ensure Plans exist
    const planCount = await prisma.plan.count();
    if (planCount === 0) {
      await prisma.plan.createMany({
        data: [
          {
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
        ],
      });
      logger.info('✅ Default subscription plans initialized');
    }

    // 2. Ensure Super Admin exists
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@chatflow.ai' },
    });
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
      });
      logger.info('✅ Super Admin account initialized (admin@chatflow.ai)');
    }

    // 3. Ensure StyleHub Demo Store Owner & Staff exist
    const storeOwner = await prisma.user.findUnique({
      where: { email: 'owner@stylehub.com' },
      include: { memberships: true },
    });
    if (!storeOwner) {
      const pass = await bcrypt.hash('Password@123', 10);
      const ownerUser = await prisma.user.create({
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
      });

      const staffUser = await prisma.user.create({
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
      });

      let org = await prisma.organization.findUnique({ where: { slug: 'stylehub' } });
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
        });
        logger.info('✅ Demo Organization StyleHub initialized');
      }
    }
  } catch (err) {
    logger.error('Database initialization check error:', err);
  }
}
