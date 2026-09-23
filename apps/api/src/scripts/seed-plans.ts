import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

async function seedPlans() {
  const count = await prisma.plan.count();
  console.log(`Current plans in DB: ${count}`);

  if (count === 0) {
    console.log('Seeding default subscription plans...');
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
          features: JSON.stringify(['AI Catalog Search', 'Unlimited Lead Events', 'Auto-Reply Rules', 'Live WhatsApp QR Connection']),
        },
        {
          tier: 'PRO',
          name: 'Business Growth',
          priceMonthly: 3999,
          priceYearly: 39990,
          maxProducts: 1000,
          maxConversations: 10000,
          maxUsers: 10,
          maxAutomations: 50,
          maxCampaigns: 25,
          aiSearchLimit: 25000,
          features: JSON.stringify(['Custom AI Training', 'Dynamic WhatsApp Flows', 'Priority Meta Routing', 'Team RBAC']),
        },
        {
          tier: 'ENTERPRISE',
          name: 'Enterprise Scale',
          priceMonthly: 9999,
          priceYearly: 99990,
          maxProducts: 10000,
          maxConversations: 100000,
          maxUsers: 50,
          maxAutomations: 200,
          maxCampaigns: 100,
          aiSearchLimit: 100000,
          features: JSON.stringify(['Custom WhatsApp WABA', 'Dedicated Database', 'SLA 99.9%', 'Dedicated Account Manager']),
        },
      ],
    });
    console.log('✅ Subscription plans seeded successfully!');
  } else {
    console.log('Plans already exist.');
  }

  await prisma.$disconnect();
}

seedPlans();
