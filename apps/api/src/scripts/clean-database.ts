import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🔄 Starting full database cleanup of test and mock data...');

  try {
    // Delete transactional and relationship records first to respect foreign keys
    console.log('Clearing messages and conversations...');
    await prisma.message.deleteMany({});
    await prisma.aiConversation.deleteMany({});
    await prisma.conversation.deleteMany({});

    console.log('Clearing leads and events...');
    await prisma.leadEvent.deleteMany({});
    await prisma.lead.deleteMany({});

    console.log('Clearing campaigns and templates...');
    await prisma.campaign.deleteMany({});
    await prisma.messageTemplate.deleteMany({});

    console.log('Clearing automations, products, and categories...');
    await prisma.automationRule.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    console.log('Clearing AI searches and customers...');
    await prisma.aiSearch.deleteMany({});
    await prisma.customer.deleteMany({});

    console.log('Clearing notifications, audit logs, and payments...');
    await prisma.notification.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.subscription.deleteMany({});

    console.log('Clearing business settings and WhatsApp accounts...');
    await prisma.businessSettings.deleteMany({});
    await prisma.whatsAppAccount.deleteMany({});

    console.log('Clearing auth tokens, challenges, sessions, and attempts...');
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.otpChallenge.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.userAuthProvider.deleteMany({});
    await prisma.loginAttempt.deleteMany({});

    console.log('Clearing memberships, organizations, and users...');
    await prisma.membership.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ DATABASE CLEANUP COMPLETE! All test data and mock records have been wiped cleanly.');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
