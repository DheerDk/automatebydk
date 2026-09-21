import OpenAI from 'openai';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { CustomerIntent, StockStatus } from '@chatflow/shared';

export interface StructuredSearchFilters {
  category?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  keywords?: string | null;
}

export class AiService {
  private static openaiClient: OpenAI | null = null;

  private static getClient(): OpenAI | null {
    if (config.ai.mock || !config.ai.apiKey || config.ai.apiKey === 'dev_openai_key') {
      return null;
    }
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({ apiKey: config.ai.apiKey });
    }
    return this.openaiClient;
  }

  /**
   * 1. Detect Customer Intent
   */
  public static async detectIntent(message: string): Promise<CustomerIntent> {
    const text = message.toLowerCase().trim();

    // Fast keyword & numeric menu shortcut checks
    if (['hi', 'hello', 'hey', 'start', 'namaste', 'menu', '0'].includes(text)) {
      return CustomerIntent.GREETING;
    }

    if (text === '1' || text === 'browse' || text === 'trending') {
      return CustomerIntent.PRODUCT_SEARCH;
    }

    if (text === '2') {
      return CustomerIntent.PRODUCT_SEARCH;
    }

    if (text === '3' || ['offer', 'discount', 'deal', 'sale', 'promo', 'coupon'].some((k) => text.includes(k))) {
      return CustomerIntent.OFFERS;
    }

    if (text === '4' || ['human', 'agent', 'support', 'help', 'representative', 'talk to person', 'call me'].some((k) => text.includes(k))) {
      return CustomerIntent.HUMAN_SUPPORT;
    }

    if (['5', '6', 'delivery', 'shipping', 'return', 'exchange', 'refund', 'timing', 'hours', 'address', 'location', 'where', 'payment', 'cod', 'upi', 'order', 'buy'].some((k) => text === k || text.includes(k))) {
      return CustomerIntent.FAQ;
    }

    if (['show', 'find', 'search', 'price', 'cost', 'under', 'size', 'color', 'black', 'white', 'red', 'blue', 'shirt', 'kurti', 'dress', 'phone', 'jeans', 'tshirt', 'shoes', 'watch'].some((k) => text.includes(k))) {
      return CustomerIntent.PRODUCT_SEARCH;
    }

    const client = this.getClient();
    if (!client) {
      return CustomerIntent.PRODUCT_SEARCH;
    }

    try {
      const response = await client.chat.completions.create({
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier for a WhatsApp store. Classify the user message into one of these exact intents:
- GREETING
- PRODUCT_SEARCH
- PRODUCT_DETAILS
- PRICE_ENQUIRY
- OFFERS
- ORDER_TRACKING
- FAQ
- HUMAN_SUPPORT
- UNKNOWN

Respond ONLY with the intent string.`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 20,
      });

      const intent = response.choices[0]?.message?.content?.trim() as CustomerIntent;
      return Object.values(CustomerIntent).includes(intent) ? intent : CustomerIntent.PRODUCT_SEARCH;
    } catch (err) {
      logger.error('Error detecting intent with OpenAI:', err);
      return CustomerIntent.PRODUCT_SEARCH;
    }
  }

  /**
   * 2. Extract Structured Product Filters from Natural Language Query
   */
  public static async extractSearchFilters(query: string): Promise<StructuredSearchFilters> {
    const client = this.getClient();

    if (!client) {
      // Deterministic Regex & Rule Parser for Mock / Dev Mode
      return this.mockExtractFilters(query);
    }

    try {
      const response = await client.chat.completions.create({
        model: config.ai.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extract structured ecommerce product search filters from the customer's natural language message.
Return JSON with the following keys (use null if not mentioned):
{
  "category": string | null,
  "brand": string | null,
  "color": string | null,
  "size": string | null,
  "minPrice": number | null,
  "maxPrice": number | null,
  "keywords": string | null
}`,
          },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        category: parsed.category || null,
        brand: parsed.brand || null,
        color: parsed.color || null,
        size: parsed.size || null,
        minPrice: parsed.minPrice ? Number(parsed.minPrice) : null,
        maxPrice: parsed.maxPrice ? Number(parsed.maxPrice) : null,
        keywords: parsed.keywords || null,
      };
    } catch (err) {
      logger.error('Error extracting search filters with OpenAI:', err);
      return this.mockExtractFilters(query);
    }
  }

  /**
   * Local deterministic regex extractor for mock mode / fallback
   */
  private static mockExtractFilters(query: string): StructuredSearchFilters {
    const text = query.toLowerCase();
    const filters: StructuredSearchFilters = {};

    // Price extraction
    const underMatch = text.match(/(?:under|below|less than|<|budget)\s*(?:rs\.?|inr)?\s*(\d+)/i);
    if (underMatch) {
      filters.maxPrice = parseFloat(underMatch[1]);
    }

    const aboveMatch = text.match(/(?:above|more than|>|starting from)\s*(?:rs\.?|inr)?\s*(\d+)/i);
    if (aboveMatch) {
      filters.minPrice = parseFloat(aboveMatch[1]);
    }

    // Color extraction
    const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'grey', 'gray', 'navy', 'beige', 'gold', 'silver'];
    for (const color of colors) {
      if (new RegExp(`\\b${color}\\b`, 'i').test(text)) {
        filters.color = color;
        break;
      }
    }

    // Size extraction
    const sizes = ['xxl', 'xl', 'xs', 's', 'm', 'l', '32', '34', '36', '38', '40', '42'];
    for (const size of sizes) {
      if (new RegExp(`\\b(size\\s*${size}|${size}\\s*size|\\b${size}\\b)`, 'i').test(text)) {
        filters.size = size.toUpperCase();
        break;
      }
    }

    // Categories
    const categories = ['shirt', 'shirts', 't-shirt', 'tshirt', 'kurti', 'kurtis', 'jeans', 'dress', 'shoes', 'phone', 'smartphone', 'mobile', 'watch', 'jacket', 'trousers', 'saree', 'hoodie'];
    for (const cat of categories) {
      if (new RegExp(`\\b${cat}\\b`, 'i').test(text)) {
        filters.category = cat;
        break;
      }
    }

    filters.keywords = query;
    return filters;
  }

  /**
   * 3. Zero-Hallucination Safe Catalog Search
   */
  public static async searchProductsFromDatabase(organizationId: string, filters: StructuredSearchFilters, limit = 5) {
    const whereClause: any = {
      organizationId,
      isActive: true,
      stockStatus: {
        in: ['IN_STOCK', 'LOW_STOCK'],
      },
    };

    if (filters.maxPrice) {
      whereClause.price = { ...(whereClause.price || {}), lte: filters.maxPrice };
    }
    if (filters.minPrice) {
      whereClause.price = { ...(whereClause.price || {}), gte: filters.minPrice };
    }

    const orConditions: any[] = [];

    if (filters.category) {
      orConditions.push(
        { category: { name: { contains: filters.category } } },
        { name: { contains: filters.category } },
        { tags: { contains: filters.category.toLowerCase() } }
      );
    }

    if (filters.color) {
      orConditions.push(
        { color: { contains: filters.color } },
        { name: { contains: filters.color } },
        { description: { contains: filters.color } }
      );
    }

    if (filters.size) {
      orConditions.push(
        { size: { contains: filters.size } }
      );
    }

    if (filters.brand) {
      orConditions.push(
        { brand: { contains: filters.brand } }
      );
    }

    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      take: limit,
      orderBy: { enquiryCount: 'desc' },
    });

    if (products.length === 0 && filters.keywords) {
      return prisma.product.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [
            { name: { contains: filters.keywords } },
            { description: { contains: filters.keywords } },
          ],
        },
        include: { category: true },
        take: limit,
      });
    }

    return products;
  }

  /**
   * 4. FAQ Resolver Using Business Settings Context
   */
  public static async answerFaq(organizationId: string, question: string): Promise<string> {
    const result = await this.generateBusinessAiReply({
      organizationId,
      customerMessage: question,
    });
    return result.replyText;
  }

  /**
   * 5. Generate Custom Business Trained AI Reply
   * Combines tenant's custom prompt, custom FAQs, knowledge base, policies, and catalog
   */
  public static async generateBusinessAiReply(params: {
    organizationId: string;
    customerMessage: string;
    customerName?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{
    replyText: string;
    detectedIntent: CustomerIntent;
    matchedCustomFaq?: { question: string; answer: string } | null;
    products?: any[];
    sourcesUsed: string[];
  }> {
    const { organizationId, customerMessage, customerName = 'Valued Customer', conversationHistory = [] } = params;
    const cleanMsg = (customerMessage || '').trim();
    const lowerMsg = cleanMsg.toLowerCase();

    // 1. Fetch organization and business settings
    const settings = await prisma.businessSettings.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    const storeName = settings?.organization?.name || 'Our Store';

    // Parse custom FAQs
    let customFaqs: Array<{ id?: string; question: string; answer: string; keywords?: string[] }> = [];
    if (settings?.aiCustomFaqs) {
      try {
        customFaqs = typeof settings.aiCustomFaqs === 'string'
          ? JSON.parse(settings.aiCustomFaqs)
          : settings.aiCustomFaqs;
      } catch {
        customFaqs = [];
      }
    }

    // 2. Detect Intent
    const intent = await this.detectIntent(cleanMsg);
    const sourcesUsed: string[] = [];

    // Check Human Support Intent
    if (intent === CustomerIntent.HUMAN_SUPPORT) {
      return {
        replyText: `🧑‍💼 We have connected you with the ${storeName} support team! A representative will reply to you here shortly.`,
        detectedIntent: CustomerIntent.HUMAN_SUPPORT,
        sourcesUsed: ['HUMAN_SUPPORT_TRIGGER'],
      };
    }

    // 3. Match Custom FAQs first (Direct exact/keyword match)
    let matchedFaq: { question: string; answer: string } | null = null;
    for (const faq of customFaqs) {
      const qLower = (faq.question || '').toLowerCase();
      const kwList = Array.isArray(faq.keywords)
        ? faq.keywords.map((k) => k.toLowerCase().trim())
        : (faq.keywords ? String(faq.keywords).split(',').map((k) => k.toLowerCase().trim()) : []);

      if (
        lowerMsg === qLower ||
        lowerMsg.includes(qLower) ||
        qLower.includes(lowerMsg) ||
        kwList.some((kw) => kw.length > 2 && lowerMsg.includes(kw))
      ) {
        matchedFaq = faq;
        sourcesUsed.push('CUSTOM_BUSINESS_FAQ');
        break;
      }
    }

    // 4. Check if Product Search is relevant
    let matchedProducts: any[] = [];
    if (intent === CustomerIntent.PRODUCT_SEARCH || intent === CustomerIntent.OFFERS || lowerMsg.includes('price') || lowerMsg.includes('buy') || lowerMsg.includes('catalog') || lowerMsg.includes('product')) {
      const filters = await this.extractSearchFilters(cleanMsg);
      matchedProducts = await this.searchProductsFromDatabase(organizationId, filters, 3);
      if (matchedProducts.length > 0) {
        sourcesUsed.push('PRODUCT_CATALOG');
      }
    }

    // Tone descriptions
    const toneGuidelines: Record<string, string> = {
      FRIENDLY: 'Warm, polite, approachable, and enthusiastic. Use appropriate emojis.',
      PROFESSIONAL: 'Formal, courteous, respectful, and authoritative. Clear and precise language.',
      SALES_DRIVEN: 'Persuasive, energetic, highlight deals/benefits, with strong call-to-actions to purchase or book.',
      HINGLISH: 'Friendly natural conversational blend of Hindi & English (e.g., "Namaste! Aapka welcome hai...", "Ji zaroor...").',
      CONCISE: 'Direct, brief, bulleted, no fluff, to the point.',
    };
    const toneInstruction = toneGuidelines[settings?.aiTone || 'FRIENDLY'] || toneGuidelines.FRIENDLY;

    const fallbackMsg = settings?.aiFallbackMessage || `Thank you for contacting *${storeName}*! For more specific inquiries, reply *"SUPPORT"* to chat with our team.`;

    // 5. If OpenAI client is available, run GPT-4o-mini generation
    const client = this.getClient();
    if (client) {
      try {
        const faqContext = customFaqs.length > 0
          ? customFaqs.map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`).join('\n\n')
          : 'None';

        const productContext = matchedProducts.length > 0
          ? matchedProducts.map((p) => `- ${p.name}: ₹${p.discountPrice || p.price} (Color: ${p.color || 'N/A'}, Size: ${p.size || 'Free'}, Stock: ${p.stockStatus})`).join('\n')
          : 'No specific products queried.';

        const systemPrompt = `You are the official AI WhatsApp Assistant for the business "${storeName}".
Tone & Persona: ${toneInstruction}

${settings?.aiSystemPrompt ? `BUSINESS CUSTOM INSTRUCTIONS:\n${settings.aiSystemPrompt}\n` : ''}
${settings?.aiKnowledgeBase ? `BUSINESS KNOWLEDGE BASE:\n${settings.aiKnowledgeBase}\n` : ''}

STORE INFORMATION & POLICIES:
- Business Name: ${storeName}
- Operating Hours: ${settings?.businessHours || 'Mon-Sat: 10:00 AM - 08:00 PM'}
- Address/Location: ${settings?.address || 'Main Branch'}
- Delivery Policy: ${settings?.deliveryPolicy || 'Standard delivery in 2-4 business days.'}
- Return Policy: ${settings?.returnPolicy || '7-day easy returns and exchanges available.'}
- Exchange Policy: ${settings?.exchangePolicy || 'Free size exchange within 7 days.'}
- Payment Methods: ${settings?.paymentMethods || 'UPI, Cards, Cash on Delivery (COD)'}
- Contact Phone: ${settings?.phone || 'Available on WhatsApp'}
- Website: ${settings?.website || 'Available on request'}

CUSTOM TRAINED BUSINESS FAQs:
${faqContext}

MATCHING CATALOG PRODUCTS:
${productContext}

CUSTOMER NAME: ${customerName}

CORE RULES:
1. Always stay in character as the official assistant for "${storeName}".
2. Base all factual answers STRICTLY on the knowledge base, FAQs, policies, and products above.
3. If the user asks something completely unknown or outside the business knowledge, reply politely with: "${fallbackMsg}".
4. Use neat WhatsApp formatting (e.g. *bold*, bullet points, line breaks) so the message looks great on mobile screens.
5. If the customer wants human help or speaks of complex complaints, invite them to reply "SUPPORT".`;

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
        ];

        // Append recent conversation history
        if (conversationHistory && conversationHistory.length > 0) {
          const recent = conversationHistory.slice(-4);
          for (const h of recent) {
            messages.push({
              role: h.role === 'assistant' ? 'assistant' : 'user',
              content: h.content,
            });
          }
        }

        messages.push({ role: 'user', content: cleanMsg });

        const response = await client.chat.completions.create({
          model: config.ai.model || 'gpt-4o-mini',
          messages,
          temperature: 0.3,
          max_tokens: 350,
        });

        const reply = response.choices[0]?.message?.content?.trim();
        if (reply) {
          sourcesUsed.push('OPENAI_TRAINED_AGENT');
          return {
            replyText: reply,
            detectedIntent: intent,
            matchedCustomFaq: matchedFaq,
            products: matchedProducts,
            sourcesUsed,
          };
        }
      } catch (err) {
        logger.error('Error generating business AI reply with OpenAI:', err);
      }
    }

    // 6. Intelligent Local Knowledge Engine (Mock / Fallback)
    sourcesUsed.push('LOCAL_BUSINESS_ENGINE');

    // Case A: Matched a custom business FAQ
    if (matchedFaq) {
      let ans = matchedFaq.answer.replace(/\{\{name\}\}/gi, customerName).replace(/\{\{store\}\}/gi, storeName);
      if (settings?.aiTone === 'HINGLISH') {
        ans = `Namaste ${customerName}! 🙏 ${ans}`;
      }
      return {
        replyText: ans,
        detectedIntent: CustomerIntent.FAQ,
        matchedCustomFaq: matchedFaq,
        sourcesUsed,
      };
    }

    // Case B: Greeting
    if (intent === CustomerIntent.GREETING || ['hi', 'hello', 'hey', 'start', 'namaste'].includes(lowerMsg)) {
      if (settings?.welcomeMessage) {
        return {
          replyText: settings.welcomeMessage.replace(/\{\{name\}\}/gi, customerName),
          detectedIntent: CustomerIntent.GREETING,
          sourcesUsed: ['BUSINESS_WELCOME_SETTINGS'],
        };
      }
      return {
        replyText: `👋 Hello ${customerName}! Welcome to *${storeName}*.\n\nHow can we help you today? You can ask about our products, store timings, delivery, or reply *"MENU"* to browse.`,
        detectedIntent: CustomerIntent.GREETING,
        sourcesUsed: ['DEFAULT_GREETING'],
      };
    }

    // Case C: Standard Store FAQs
    if (lowerMsg.includes('deliver') || lowerMsg.includes('shipping') || lowerMsg.includes('courier')) {
      return {
        replyText: `🚚 *Delivery Policy for ${storeName}:*\n${settings?.deliveryPolicy || 'Standard delivery in 2-4 business days.'}`,
        detectedIntent: CustomerIntent.FAQ,
        sourcesUsed: ['STORE_POLICY_DELIVERY'],
      };
    }
    if (lowerMsg.includes('return') || lowerMsg.includes('refund')) {
      return {
        replyText: `🔄 *Return Policy for ${storeName}:*\n${settings?.returnPolicy || '7-day easy returns and exchanges available.'}`,
        detectedIntent: CustomerIntent.FAQ,
        sourcesUsed: ['STORE_POLICY_RETURN'],
      };
    }
    if (lowerMsg.includes('exchange')) {
      return {
        replyText: `🔁 *Exchange Policy:*\n${settings?.exchangePolicy || 'Free size exchange within 7 days.'}`,
        detectedIntent: CustomerIntent.FAQ,
        sourcesUsed: ['STORE_POLICY_EXCHANGE'],
      };
    }
    if (lowerMsg.includes('payment') || lowerMsg.includes('cod') || lowerMsg.includes('upi') || lowerMsg.includes('gpay')) {
      return {
        replyText: `💳 *Accepted Payment Methods at ${storeName}:*\n${settings?.paymentMethods || 'UPI, Cards, Net Banking & Cash on Delivery (COD).'}\n\nAll transactions are 100% secure.`,
        detectedIntent: CustomerIntent.FAQ,
        sourcesUsed: ['STORE_POLICY_PAYMENT'],
      };
    }
    if (lowerMsg.includes('timing') || lowerMsg.includes('hour') || lowerMsg.includes('open') || lowerMsg.includes('close') || lowerMsg.includes('sunday')) {
      return {
        replyText: `⏰ *Store Timings for ${storeName}:*\n${settings?.businessHours || 'Mon-Sat: 10:00 AM - 08:00 PM'}`,
        detectedIntent: CustomerIntent.STORE_INFO,
        sourcesUsed: ['STORE_INFO_HOURS'],
      };
    }
    if (lowerMsg.includes('address') || lowerMsg.includes('location') || lowerMsg.includes('where') || lowerMsg.includes('map') || lowerMsg.includes('branch')) {
      return {
        replyText: `📍 *Store Location:*\n🏢 *${storeName}*\n📍 ${settings?.address || 'Main flagship store'}\n⏰ *Timings:* ${settings?.businessHours || 'Mon-Sat: 10:00 AM - 08:00 PM'}\n📞 *Contact:* ${settings?.phone || 'Available on WhatsApp'}`,
        detectedIntent: CustomerIntent.STORE_INFO,
        sourcesUsed: ['STORE_INFO_ADDRESS'],
      };
    }

    // Case D: Knowledge Base matching
    if (settings?.aiKnowledgeBase && settings.aiKnowledgeBase.trim().length > 0) {
      const words = lowerMsg.split(/\s+/).filter((w) => w.length > 3);
      const kbLines = settings.aiKnowledgeBase.split('\n').filter((l) => l.trim().length > 0);
      const matchedLine = kbLines.find((line) => words.some((w) => line.toLowerCase().includes(w)));
      if (matchedLine) {
        return {
          replyText: `ℹ️ *Information from ${storeName}:*\n${matchedLine.trim()}`,
          detectedIntent: CustomerIntent.FAQ,
          sourcesUsed: ['KNOWLEDGE_BASE_TEXT'],
        };
      }
    }

    // Case E: Products Found
    if (matchedProducts.length > 0) {
      let productReply = `🛍️ *Matching Products at ${storeName}:*\n\n`;
      matchedProducts.forEach((p, idx) => {
        const price = p.discountPrice ? `₹${p.discountPrice} (was ₹${p.price})` : `₹${p.price}`;
        productReply += `${idx + 1}. *${p.name}* - ${price}\n${p.description || ''}\n\n`;
      });
      productReply += `👉 Reply with the product name to order now!`;

      return {
        replyText: productReply,
        detectedIntent: CustomerIntent.PRODUCT_SEARCH,
        products: matchedProducts,
        sourcesUsed,
      };
    }

    // Case F: Fallback
    return {
      replyText: fallbackMsg,
      detectedIntent: CustomerIntent.UNKNOWN,
      sourcesUsed: ['AI_FALLBACK'],
    };
  }
}
