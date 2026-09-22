import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing tables
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aiSearch.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.leadEvent.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.whatsAppAccount.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 1. Create Subscription Plans
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

  // 2. Create Users
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@chatflow.ai',
      name: 'ChatFlow Platform Admin',
      phone: '+919999900001',
      role: 'SUPER_ADMIN',
      password: adminPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const businessOwner = await prisma.user.create({
    data: {
      email: 'owner@stylehub.com',
      name: 'Priya Sharma',
      phone: '+919876543210',
      role: 'BUSINESS_OWNER',
      password: passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@stylehub.com',
      name: 'Rahul Verma',
      phone: '+919876543211',
      role: 'STAFF',
      password: passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 3. Create Organization "StyleHub"
  const org = await prisma.organization.create({
    data: {
      name: 'StyleHub Fashion & Lifestyle',
      slug: 'stylehub',
      logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80',
      memberships: {
        create: [
          { userId: businessOwner.id, role: 'BUSINESS_OWNER' },
          { userId: staffUser.id, role: 'STAFF' },
        ],
      },
      settings: {
        create: {
          currency: 'INR',
          businessHours: 'Mon-Sat: 10:00 AM - 09:00 PM, Sun: 11:00 AM - 07:00 PM',
          deliveryPolicy: 'Express shipping in 2-3 business days across India. Free shipping on orders over ₹999.',
          returnPolicy: 'Hassle-free 7-day return & refund guarantee on unworn items with tags intact.',
          exchangePolicy: 'Instant size and color exchange within 7 days of delivery.',
          paymentMethods: 'Google Pay, PhonePe, Paytm, UPI, All Credit/Debit Cards, Net Banking, and COD (Cash on Delivery).',
          welcomeMessage: '👋 Welcome to *StyleHub Fashion & Lifestyle*!\n\nExplore our latest collections or find anything instantly:\n1️⃣ Browse Trending Catalog\n2️⃣ Search by Color / Size / Price\n3️⃣ Active Offers & Coupons\n4️⃣ Track Ongoing Enquiry\n5️⃣ Chat with Fashion Advisor\n\n*Reply with a number or simply type what you are looking for!*',
          aiAutoReplyEnabled: true,
          humanHandoffKeywords: 'human,agent,support,help,person,representative,priya,rahul',
          address: '42, Commercial Street, Fashion Hub, Bangalore, Karnataka - 560001',
          phone: '+91 98765 43210',
          email: 'support@stylehub.com',
          website: 'https://stylehub.com',
          instagram: '@stylehub_fashion',
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
          metaAppSecret: 'meta_secret_stylehub_app_key',
        },
      },
      subscription: {
        create: {
          planTier: 'GROWTH',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log(`🏢 Created Organization: ${org.name} (${org.id})`);

  // 4. Create Product Categories
  const categoriesData = [
    {
      name: "Men's Shirts & Formals",
      slug: 'mens-shirts',
      description: 'Premium cotton slim-fit and casual shirts for men',
      imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: "Women's Ethnic Kurtis & Dresses",
      slug: 'womens-ethnic',
      description: 'Designer anarkali, straight kurtis, and festive wear',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Denim Jeans & Trousers',
      slug: 'jeans-trousers',
      description: 'Stretchable comfort denim and formal chinos',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Footwear & Sneakers',
      slug: 'footwear',
      description: 'Casual running sneakers, loafers, and formal shoes',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Watches & Accessories',
      slug: 'accessories',
      description: 'Smartwatches, leather belts, and sunglasses',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const createdCategories: any[] = [];
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: {
        organizationId: org.id,
        ...cat,
      },
    });
    createdCategories.push(created);
  }

  // 5. Create 20 Realistic Products
  const productsData = [
    // Category 1: Men's Shirts
    {
      name: 'Royal Oxford Slim Fit Black Shirt',
      sku: 'SH-MS-001',
      description: '100% Egyptian breathable cotton formal slim-fit shirt in rich jet black.',
      price: 1499,
      discountPrice: 1199,
      categoryId: createdCategories[0].id,
      brand: 'StyleHub Royal',
      color: 'black',
      size: 'M',
      stock: 35,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shirt', 'black', 'men', 'formal', 'cotton']),
      enquiryCount: 42,
    },
    {
      name: 'Crisp White Linen Casual Shirt',
      sku: 'SH-MS-002',
      description: 'Pure breathable organic linen shirt, ideal for summer and casual evenings.',
      price: 1799,
      discountPrice: 1399,
      categoryId: createdCategories[0].id,
      brand: 'StyleHub Royal',
      color: 'white',
      size: 'L',
      stock: 28,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shirt', 'white', 'linen', 'casual']),
      enquiryCount: 38,
    },
    {
      name: 'Classic Navy Blue Checked Flannel Shirt',
      sku: 'SH-MS-003',
      description: 'Soft brushed flannel shirt in navy and dark blue checks with chest pockets.',
      price: 1299,
      discountPrice: 999,
      categoryId: createdCategories[0].id,
      brand: 'UrbanThreads',
      color: 'navy',
      size: 'XL',
      stock: 14,
      stockStatus: 'LOW_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shirt', 'navy', 'blue', 'checked', 'flannel']),
      enquiryCount: 22,
    },
    {
      name: 'Olive Green Mandarin Collar Shirt',
      sku: 'SH-MS-004',
      description: 'Modern mandarin collar shirt tailored from pure cotton with matte buttons.',
      price: 1399,
      discountPrice: 1099,
      categoryId: createdCategories[0].id,
      brand: 'UrbanThreads',
      color: 'green',
      size: 'M',
      stock: 20,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shirt', 'green', 'mandarin', 'casual']),
      enquiryCount: 15,
    },

    // Category 2: Women's Ethnic
    {
      name: 'Embroidered Ruby Red Anarkali Kurti',
      sku: 'SH-WE-001',
      description: 'Handcrafted zari embroidery work on pure georgette ruby red floor-length kurti.',
      price: 2499,
      discountPrice: 1899,
      categoryId: createdCategories[1].id,
      brand: 'Aura Ethnic',
      color: 'red',
      size: 'M',
      stock: 40,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['kurti', 'red', 'ethnic', 'anarkali', 'party wear']),
      enquiryCount: 56,
    },
    {
      name: 'Floral Printed Mustard Yellow Kurti Set',
      sku: 'SH-WE-002',
      description: '3-piece kurti set with matching palazzo pants and chiffon floral dupatta.',
      price: 1999,
      discountPrice: 1499,
      categoryId: createdCategories[1].id,
      brand: 'Aura Ethnic',
      color: 'yellow',
      size: 'L',
      stock: 25,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['kurti', 'yellow', 'floral', 'ethnic', 'cotton']),
      enquiryCount: 47,
    },
    {
      name: 'Emerald Green Straight Cut Chanderi Kurti',
      sku: 'SH-WE-003',
      description: 'Chanderi silk festive kurti in rich emerald green with intricate thread detailing.',
      price: 2199,
      discountPrice: 1699,
      categoryId: createdCategories[1].id,
      brand: 'Aura Ethnic',
      color: 'green',
      size: 'S',
      stock: 18,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['kurti', 'green', 'silk', 'chanderi', 'festive']),
      enquiryCount: 31,
    },
    {
      name: 'Pastel Pink Chikankari Long Kurti',
      sku: 'SH-WE-004',
      description: 'Authentic Lucknowi hand-stitched Chikankari work on breathable modal fabric.',
      price: 1699,
      discountPrice: 1299,
      categoryId: createdCategories[1].id,
      brand: 'Aura Ethnic',
      color: 'pink',
      size: 'XL',
      stock: 30,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['kurti', 'pink', 'chikankari', 'cotton', 'summer']),
      enquiryCount: 39,
    },

    // Category 3: Jeans & Trousers
    {
      name: 'Midnight Black Slim Stretch Denim Jeans',
      sku: 'SH-JN-001',
      description: 'Ultra-flex 4-way stretch midnight black denim with reinforced stitching.',
      price: 1899,
      discountPrice: 1499,
      categoryId: createdCategories[2].id,
      brand: 'DenimCraft',
      color: 'black',
      size: '32',
      stock: 50,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['jeans', 'black', 'denim', 'stretch', 'slim']),
      enquiryCount: 65,
    },
    {
      name: 'Vintage Washed Light Blue Jeans',
      sku: 'SH-JN-002',
      description: 'Authentic 90s vintage wash straight-leg comfortable denim jeans.',
      price: 1799,
      discountPrice: 1349,
      categoryId: createdCategories[2].id,
      brand: 'DenimCraft',
      color: 'blue',
      size: '34',
      stock: 35,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['jeans', 'blue', 'vintage', 'denim']),
      enquiryCount: 29,
    },
    {
      name: 'Khaki Beige Slim Fit Cotton Chinos',
      sku: 'SH-JN-003',
      description: 'Versatile formal-to-casual stretch cotton chinos in versatile khaki beige.',
      price: 1599,
      discountPrice: 1199,
      categoryId: createdCategories[2].id,
      brand: 'DenimCraft',
      color: 'beige',
      size: '32',
      stock: 22,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['chinos', 'trousers', 'beige', 'cotton', 'formal']),
      enquiryCount: 24,
    },
    {
      name: 'Charcoal Grey Smart Casual Trousers',
      sku: 'SH-JN-004',
      description: 'Wrinkle-resistant smart trousers with flexible waistband for work & travel.',
      price: 1699,
      discountPrice: 1299,
      categoryId: createdCategories[2].id,
      brand: 'DenimCraft',
      color: 'grey',
      size: '36',
      stock: 19,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['trousers', 'grey', 'formal', 'work']),
      enquiryCount: 18,
    },

    // Category 4: Footwear
    {
      name: 'AirComfort White Low-Top Leather Sneakers',
      sku: 'SH-FW-001',
      description: 'Minimalist clean white vegan leather sneakers with memory foam cushioned sole.',
      price: 2799,
      discountPrice: 1999,
      categoryId: createdCategories[3].id,
      brand: 'StrideStep',
      color: 'white',
      size: '42',
      stock: 45,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shoes', 'sneakers', 'white', 'leather', 'casual']),
      enquiryCount: 52,
    },
    {
      name: 'Tan Brown Handcrafted Leather Penny Loafers',
      sku: 'SH-FW-002',
      description: 'Hand-burnished genuine leather penny loafers with anti-skid rubber grip.',
      price: 3499,
      discountPrice: 2699,
      categoryId: createdCategories[3].id,
      brand: 'StrideStep',
      color: 'brown',
      size: '41',
      stock: 15,
      stockStatus: 'LOW_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shoes', 'loafers', 'brown', 'leather', 'formal']),
      enquiryCount: 33,
    },
    {
      name: 'Stealth Black Running & Gym Shoes',
      sku: 'SH-FW-003',
      description: 'Engineered mesh ultra-lightweight running shoes with dynamic energy return.',
      price: 2299,
      discountPrice: 1799,
      categoryId: createdCategories[3].id,
      brand: 'StrideStep',
      color: 'black',
      size: '43',
      stock: 28,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shoes', 'sports', 'black', 'running', 'gym']),
      enquiryCount: 27,
    },
    {
      name: 'Casual Slip-On Canvas Espadrilles',
      sku: 'SH-FW-004',
      description: 'Summer holiday breathable canvas slip-ons with natural jute rope sole.',
      price: 1299,
      discountPrice: 899,
      categoryId: createdCategories[3].id,
      brand: 'StrideStep',
      color: 'navy',
      size: '40',
      stock: 20,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['shoes', 'canvas', 'slip-on', 'summer', 'casual']),
      enquiryCount: 14,
    },

    // Category 5: Accessories & Watches
    {
      name: 'AeroChronos Men Obsidian Chronograph Watch',
      sku: 'SH-AC-001',
      description: 'Japanese quartz movement matte black stainless steel analog chronograph.',
      price: 3999,
      discountPrice: 2899,
      categoryId: createdCategories[4].id,
      brand: 'AeroTime',
      color: 'black',
      size: null,
      stock: 30,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['watch', 'black', 'chronograph', 'accessories', 'luxury']),
      enquiryCount: 48,
    },
    {
      name: 'Genuine Full-Grain Leather Reversible Belt',
      sku: 'SH-AC-002',
      description: 'Dual-sided black/brown genuine Italian leather belt with rotating silver buckle.',
      price: 999,
      discountPrice: 749,
      categoryId: createdCategories[4].id,
      brand: 'AeroTime',
      color: 'black',
      size: '34',
      stock: 40,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['belt', 'leather', 'accessories', 'reversible']),
      enquiryCount: 21,
    },
    {
      name: 'Polarized Aviator Sunglasses with Gold Frame',
      sku: 'SH-AC-003',
      description: '100% UV400 protection polarized gradient lens in lightweight titanium gold alloy.',
      price: 1499,
      discountPrice: 999,
      categoryId: createdCategories[4].id,
      brand: 'AeroTime',
      color: 'gold',
      size: null,
      stock: 25,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['sunglasses', 'aviator', 'gold', 'accessories']),
      enquiryCount: 35,
    },
    {
      name: 'SmartPro Bluetooth Calling Smartwatch with AMOLED Display',
      sku: 'SH-AC-004',
      description: '1.43" AMOLED screen, 100+ sports modes, SpO2 & 24/7 heart rate monitoring.',
      price: 3499,
      discountPrice: 2499,
      categoryId: createdCategories[4].id,
      brand: 'AeroTime',
      color: 'black',
      size: null,
      stock: 35,
      stockStatus: 'IN_STOCK',
      images: JSON.stringify(['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80']),
      tags: JSON.stringify(['smartwatch', 'watch', 'tech', 'fitness', 'amoled']),
      enquiryCount: 60,
    },
  ];

  const createdProducts: any[] = [];
  for (const prod of productsData) {
    const p = await prisma.product.create({
      data: {
        organizationId: org.id,
        ...prod,
      },
    });
    createdProducts.push(p);
  }

  console.log(`📦 Seeded ${createdProducts.length} products across 5 categories.`);

  // 6. Create 10 Customers
  const customersData = [
    { name: 'Amitabh Sen', phone: '+919811122334', email: 'amitabh.sen@gmail.com', tags: JSON.stringify(['VIP', 'Men Shirts']), notes: 'Prefers formal slim-fit cotton shirts in M size' },
    { name: 'Neha Kulkarni', phone: '+919822233445', email: 'neha.k@yahoo.com', tags: JSON.stringify(['Interested', 'Kurtis']), notes: 'Asked about Anarkali kurti in Red' },
    { name: 'Vikram Rajput', phone: '+919833344556', email: 'vikram.r@outlook.com', tags: JSON.stringify(['Converted', 'Repeat Buyer']), notes: 'Bought sneakers and sunglasses' },
    { name: 'Ananya Roy', phone: '+919844455667', email: 'ananya.roy@gmail.com', tags: JSON.stringify(['High Intent', 'Festive']), notes: 'Looking for Chanderi silk kurtis' },
    { name: 'Rohan Mehta', phone: '+919855566778', email: 'rohan.m@gmail.com', tags: JSON.stringify(['Price Sensitive']), notes: 'Asked for black denim under 1500' },
    { name: 'Pooja Hegde', phone: '+919866677889', email: 'pooja.h@gmail.com', tags: JSON.stringify(['New Lead']), notes: 'First-time WhatsApp enquiry' },
    { name: 'Karan Patel', phone: '+919877788990', email: 'karan.p@yahoo.com', tags: JSON.stringify(['VIP', 'Smartwatch']), notes: 'Interested in SmartPro watch' },
    { name: 'Sneha Iyer', phone: '+919888899001', email: 'sneha.iyer@gmail.com', tags: JSON.stringify(['Follow Up']), notes: 'Requested size exchange info' },
    { name: 'Deepak Nair', phone: '+919899900112', email: 'deepak.nair@hotmail.com', tags: JSON.stringify(['Discount Seeker']), notes: 'Wants coupon code for footwear' },
    { name: 'Meera Deshmukh', phone: '+919800011223', email: 'meera.d@gmail.com', tags: JSON.stringify(['Converted']), notes: 'Order delivered, 5-star review' },
  ];

  const createdCustomers: any[] = [];
  for (const cust of customersData) {
    const c = await prisma.customer.create({
      data: {
        organizationId: org.id,
        ...cust,
      },
    });
    createdCustomers.push(c);
  }

  // 7. Create Conversations & Messages
  for (let i = 0; i < createdCustomers.length; i++) {
    const cust = createdCustomers[i];
    const isHumanHandoff = i === 7; // Sneha requested human
    const isConverted = i === 2 || i === 9;

    const conv = await prisma.conversation.create({
      data: {
        organizationId: org.id,
        customerId: cust.id,
        status: isHumanHandoff ? 'HUMAN_REQUIRED' : isConverted ? 'RESOLVED' : 'AI_ACTIVE',
        assignedUserId: isHumanHandoff ? staffUser.id : null,
        unreadCount: i < 3 ? 1 : 0,
        lastMessageText: i === 0 ? 'Show me black shirts under 1500' : 'Thank you for your assistance!',
      },
    });

    // Inbound Customer Query
    await prisma.message.create({
      data: {
        organizationId: org.id,
        conversationId: conv.id,
        customerId: cust.id,
        direction: 'INBOUND',
        type: 'TEXT',
        status: 'READ',
        content: i === 0 ? 'Show me black shirts under 1500' : i === 1 ? 'Do you have red anarkali kurti in M size?' : 'Hi, do you have sneakers under 2000?',
        createdAt: new Date(Date.now() - 3600000 * (10 - i)),
      },
    });

    // Outbound AI / System Response
    const matchingProduct = createdProducts[i % createdProducts.length];
    await prisma.message.create({
      data: {
        organizationId: org.id,
        conversationId: conv.id,
        customerId: cust.id,
        direction: 'OUTBOUND',
        type: 'PRODUCT',
        status: 'DELIVERED',
        content: `🛍️ *${matchingProduct.name}*\n💰 Price: ₹${matchingProduct.price} (Offer: ₹${matchingProduct.discountPrice})\n📦 Status: In Stock\n\n👉 Reply with BUY or ask any question!`,
        mediaUrl: JSON.parse(matchingProduct.images)[0],
        metadata: JSON.stringify({ productId: matchingProduct.id }),
        createdAt: new Date(Date.now() - 3600000 * (10 - i) + 5000),
      },
    });
  }

  // 8. Create 10 Leads across Kanban Pipeline
  const leadStatuses = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'NEGOTIATION', 'CONVERTED', 'LOST'];
  for (let i = 0; i < createdCustomers.length; i++) {
    const cust = createdCustomers[i];
    const prod = createdProducts[i % createdProducts.length];
    const status = leadStatuses[i % leadStatuses.length];

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        customerId: cust.id,
        productId: prod.id,
        status,
        source: 'WHATSAPP',
        assignedUserId: i % 2 === 0 ? businessOwner.id : staffUser.id,
        estimatedValue: prod.discountPrice || prod.price,
        notes: `Enquired via WhatsApp on ${new Date().toLocaleDateString()}`,
        convertedAt: status === 'CONVERTED' ? new Date() : null,
      },
    });

    await prisma.leadEvent.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        userId: businessOwner.id,
        fromStatus: null,
        toStatus: status,
        note: `Lead captured via WhatsApp automated intent flow.`,
      },
    });
  }

  // 9. Create Automation Rules
  await prisma.automationRule.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Automated Welcome & Menu Reply',
        description: 'Sends interactive store menu when customer greets the store with Hi/Hello/Start',
        trigger: 'GREETING',
        conditions: JSON.stringify({ keywords: ['hi', 'hello', 'hey', 'start'] }),
        actions: JSON.stringify([
          {
            type: 'SEND_MESSAGE',
            payload: {
              text: '👋 Welcome to *StyleHub* {{name}}! How can we assist you today?\n\n1️⃣ Browse Trending Catalog\n2️⃣ Search Product\n3️⃣ Offers & Deals\n4️⃣ Talk to Human Assistant\n\n*Reply with a number!*',
            },
          },
        ]),
        isActive: true,
        executionCount: 142,
      },
      {
        organizationId: org.id,
        name: 'Auto Capture Leads for Product Searches',
        description: 'Creates high-intent CRM lead whenever customer queries a product price or stock',
        trigger: 'MESSAGE_RECEIVED',
        conditions: JSON.stringify({ keyword: 'price' }),
        actions: JSON.stringify([
          {
            type: 'CREATE_LEAD',
            payload: { source: 'WHATSAPP_AUTOMATION', notes: 'Price enquiry triggered lead creation' },
          },
        ]),
        isActive: true,
        executionCount: 67,
      },
      {
        organizationId: org.id,
        name: 'Smart 24-Hour Follow-up Reminder',
        description: 'Dispatches gentle reminder after 24h of inactivity on open enquiries',
        trigger: 'NO_RESPONSE',
        conditions: JSON.stringify({ hours: 24 }),
        actions: JSON.stringify([
          {
            type: 'SEND_MESSAGE',
            payload: {
              text: 'Hi {{name}}, just checking in! Are you still interested in our latest collection? Let us know if you need help with size or colors 😊',
            },
            delayMinutes: 1440,
          },
        ]),
        isActive: true,
        executionCount: 38,
      },
    ],
  });

  // 10. Create Message Templates
  await prisma.messageTemplate.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'festive_discount_20',
        category: 'MARKETING',
        language: 'en',
        body: '🎉 Hey {{1}}! Exclusive 20% OFF on all {{2}} this weekend! Use code FESTIVE20 at checkout or reply YES to order directly here. 🛍️',
        variables: JSON.stringify(['name', 'category']),
        status: 'APPROVED',
      },
      {
        organizationId: org.id,
        name: 'order_status_update',
        category: 'UTILITY',
        language: 'en',
        body: '📦 Hello {{1}}, your order #{{2}} for {{3}} has been dispatched! Track delivery status anytime by replying TRACK.',
        variables: JSON.stringify(['name', 'orderId', 'productName']),
        status: 'APPROVED',
      },
      {
        organizationId: org.id,
        name: 'cart_abandonment_followup',
        category: 'MARKETING',
        language: 'en',
        body: '👋 Hi {{1}}, we saved your favourite item: {{2}}! Complete your order today and get free express shipping 🚀',
        variables: JSON.stringify(['name', 'productName']),
        status: 'APPROVED',
      },
    ],
  });

  // 11. Create Sample Broadcast Campaign
  await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'Weekend Flash Sale - 20% OFF Men & Women Wear',
      customMessage: '🎉 Big Weekend Flash Sale at StyleHub! Flat 20% OFF on all shirts & kurtis. Limited stock only.',
      targetAudience: JSON.stringify({ all: true }),
      status: 'COMPLETED',
      sentCount: 10,
      deliveredCount: 10,
      readCount: 8,
      failedCount: 0,
      scheduledAt: new Date(Date.now() - 86400000),
    },
  });

  // 12. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        organizationId: org.id,
        userId: businessOwner.id,
        title: 'New High-Value Lead Captured',
        message: 'Amitabh Sen enquired about Royal Oxford Slim Fit Black Shirt (₹1,199)',
        type: 'LEAD',
        isRead: false,
      },
      {
        organizationId: org.id,
        userId: staffUser.id,
        title: 'Human Support Requested',
        message: 'Sneha Iyer requested to speak with a store advisor.',
        type: 'SUPPORT',
        isRead: false,
      },
      {
        organizationId: org.id,
        userId: businessOwner.id,
        title: 'Weekend Campaign Sent',
        message: '10 WhatsApp broadcast messages dispatched successfully.',
        type: 'CAMPAIGN',
        isRead: true,
      },
    ],
  });

  // 12. Create StyleHub Subscription Payment
  await prisma.payment.create({
    data: {
      organizationId: org.id,
      amount: 2999,
      currency: 'INR',
      status: 'COMPLETED',
      paymentMethod: 'UPI',
      planTier: 'GROWTH',
      invoiceNumber: 'INV-202501',
      transactionId: 'TXN-UPI-9928172948',
    },
  });

  // 13. Create a Pending Approval Business (For Super Admin Verification flow demo)
  const pendingOwner = await prisma.user.create({
    data: {
      email: 'pending@luxurydental.com',
      name: 'Dr. Sameer Kapoor',
      phone: '+919811122233',
      role: 'BUSINESS_OWNER',
      password: passwordHash,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    },
  });

  const pendingOrg = await prisma.organization.create({
    data: {
      name: 'Luxury Smile Dental Clinic',
      slug: 'luxury-smile-dental',
      category: 'Healthcare & Clinic',
      status: 'PENDING_APPROVAL',
      isVerified: false,
      memberships: {
        create: [
          { userId: pendingOwner.id, role: 'BUSINESS_OWNER' },
        ],
      },
      settings: {
        create: {
          currency: 'INR',
          welcomeMessage: '👋 Welcome to Luxury Smile Dental Clinic! Reply 1 for Dental Implants, 2 for Root Canal, 3 to Book Consultation.',
          aiAutoReplyEnabled: true,
        },
      },
      subscription: {
        create: {
          planTier: 'PRO',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          paymentMethod: 'CARD',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      payments: {
        create: {
          amount: 5999,
          currency: 'INR',
          status: 'COMPLETED',
          paymentMethod: 'CARD',
          planTier: 'PRO',
          invoiceNumber: 'INV-202502',
          transactionId: 'TXN-CRD-8819203912',
        },
      },
    },
  });

  console.log('✅ Seed finished successfully!');
  console.log('---------------------------------------------------------');
  console.log('👑 Super Admin: admin@chatflow.ai  | Password: Admin@123456');
  console.log('🏪 Active Business: owner@stylehub.com | Password: Password@123 (Growth Plan)');
  console.log('⏳ Pending Verification Business: pending@luxurydental.com | Password: Password@123 (Pro Plan)');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
