import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { AiService } from '../src/services/ai.service.js';
import { hashPassword, signAccessToken, comparePassword } from '../src/utils/token.js';
import { UserRole, LeadStatus } from '@chatflow/shared';

describe('ChatFlow AI Core Backend Test Suite', () => {
  let testOrgId: string;
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    const org = await prisma.organization.findUnique({
      where: { slug: 'stylehub' },
    });

    if (org) {
      testOrgId = org.id;
    } else {
      const created = await prisma.organization.create({
        data: { name: 'Test Store', slug: 'test-store' },
      });
      testOrgId = created.id;
    }

    const user = await prisma.user.findFirst({
      where: { email: 'owner@stylehub.com' },
    });

    if (user) {
      testUserId = user.id;
      testToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: UserRole.BUSINESS_OWNER,
        organizationId: testOrgId,
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Secure Password Hashing & Verification', async () => {
    const rawPass = 'SecretP@ss123';
    const hash = await hashPassword(rawPass);
    expect(hash).not.toBe(rawPass);
    const valid = await comparePassword(rawPass, hash);
    expect(valid).toBe(true);
  });

  it('2. Natural Language AI Product Search Filter Extraction (Zero-Hallucination Safe)', async () => {
    const query = 'Show me black shirts under 1500';
    const filters = await AiService.extractSearchFilters(query);
    
    expect(filters.color).toBe('black');
    expect(filters.maxPrice).toBe(1500);
    expect(filters.category).toMatch(/shirt/i);
  });

  it('3. Catalog Query against Database with Extracted Filters', async () => {
    const filters = {
      color: 'black',
      maxPrice: 1600,
      category: 'shirt',
    };

    const products = await AiService.searchProductsFromDatabase(testOrgId, filters, 5);
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThanOrEqual(1);
    
    const topProd = products[0];
    expect(topProd.price).toBeLessThanOrEqual(1600);
    expect(topProd.color?.toLowerCase()).toBe('black');
  });

  it('4. Intent Detection Classification', async () => {
    const greetingIntent = await AiService.detectIntent('Hi there, what is your store timing?');
    expect(['GREETING', 'FAQ', 'STORE_INFO']).toContain(greetingIntent);

    const humanIntent = await AiService.detectIntent('I need to speak with human support agent please');
    expect(humanIntent).toBe('HUMAN_SUPPORT');
  });

  it('5. Tenant Isolation Verification', async () => {
    const fakeOrgProducts = await prisma.product.findMany({
      where: { organizationId: 'non_existent_tenant_999' },
    });
    expect(fakeOrgProducts.length).toBe(0);

    const styleHubProducts = await prisma.product.findMany({
      where: { organizationId: testOrgId },
    });
    expect(styleHubProducts.length).toBeGreaterThan(0);
  });

  it('6. Lead Lifecycle Transition & Events Recording', async () => {
    const customer = await prisma.customer.findFirst({
      where: { organizationId: testOrgId },
    });
    expect(customer).toBeDefined();

    const lead = await prisma.lead.create({
      data: {
        organizationId: testOrgId,
        customerId: customer!.id,
        status: LeadStatus.NEW,
        estimatedValue: 1999,
        source: 'WHATSAPP_TEST',
      },
    });

    expect(lead.status).toBe(LeadStatus.NEW);

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.CONVERTED,
        convertedAt: new Date(),
      },
    });

    expect(updated.status).toBe(LeadStatus.CONVERTED);
    expect(updated.convertedAt).toBeDefined();

    await prisma.lead.delete({ where: { id: lead.id } });
  });

  it('7. Custom Business AI Training & FAQ Reply Generation', async () => {
    // 1. Update business settings with custom AI training and custom FAQ
    const customFaqs = [
      {
        id: 'faq_test_1',
        question: 'Do you deliver to Bangalore?',
        answer: 'Yes! We deliver across all areas of Bangalore within 24 hours with express courier.',
        keywords: ['bangalore', 'bengaluru', 'karnataka delivery'],
      },
    ];

    await prisma.businessSettings.upsert({
      where: { organizationId: testOrgId },
      update: {
        aiSystemPrompt: 'You are Maya for StyleHub. Always be polite and offer store assistance.',
        aiTone: 'FRIENDLY',
        aiCustomFaqs: JSON.stringify(customFaqs),
        aiKnowledgeBase: 'Warranty: All leather shoes have a 1-year replacement warranty.',
      },
      create: {
        organizationId: testOrgId,
        aiSystemPrompt: 'You are Maya for StyleHub. Always be polite and offer store assistance.',
        aiTone: 'FRIENDLY',
        aiCustomFaqs: JSON.stringify(customFaqs),
        aiKnowledgeBase: 'Warranty: All leather shoes have a 1-year replacement warranty.',
      },
    });

    // 2. Test exact custom FAQ resolution
    const faqReply = await AiService.generateBusinessAiReply({
      organizationId: testOrgId,
      customerMessage: 'Do you deliver to Bangalore?',
      customerName: 'Rahul',
    });

    expect(faqReply.replyText).toContain('Bangalore within 24 hours');
    expect(faqReply.sourcesUsed).toContain('CUSTOM_BUSINESS_FAQ');

    // 3. Test knowledge base recall
    const kbReply = await AiService.generateBusinessAiReply({
      organizationId: testOrgId,
      customerMessage: 'What is the warranty on leather shoes?',
      customerName: 'Rahul',
    });

    expect(kbReply.replyText.toLowerCase()).toContain('warranty');
    expect(kbReply.sourcesUsed.some(s => s.includes('KNOWLEDGE') || s.includes('FAQ') || s.includes('LOCAL'))).toBe(true);

    // 4. Test Human handoff trigger
    const humanReply = await AiService.generateBusinessAiReply({
      organizationId: testOrgId,
      customerMessage: 'I want to talk to a human agent please',
      customerName: 'Rahul',
    });

    expect(humanReply.detectedIntent).toBe('HUMAN_SUPPORT');
  });

  it('8. Full End-to-End Inbound WhatsApp Message with Custom AI Training', async () => {
    const { WebhookController } = await import('../src/controllers/webhook.controller.js');

    const result = await WebhookController.processInboundMessage({
      organizationId: testOrgId,
      phone: '+919988776655',
      name: 'Priya Sharma',
      text: 'Do you deliver to Bangalore?',
      whatsappMessageId: `msg_test_${Date.now()}`,
    });

    expect(result.conversation).toBeDefined();
    expect(result.customer).toBeDefined();
    expect(result.outgoingResponse).toBeDefined();
    expect(result.sourcesUsed).toContain('CUSTOM_BUSINESS_FAQ');
  }, 15000);
});

