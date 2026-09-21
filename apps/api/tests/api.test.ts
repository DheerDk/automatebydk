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
});
