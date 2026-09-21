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
    const settings = await prisma.businessSettings.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    if (!settings) {
      return "Thank you for reaching out! Our team will assist you shortly with your enquiry.";
    }

    const client = this.getClient();
    if (!client) {
      const text = question.toLowerCase();
      if (text.includes('deliver') || text.includes('shipping')) {
        return `🚚 *Delivery Policy:* ${settings.deliveryPolicy || 'Standard delivery in 2-4 business days.'}`;
      }
      if (text.includes('return') || text.includes('refund')) {
        return `🔄 *Return Policy:* ${settings.returnPolicy || '7-day easy returns and exchanges available.'}`;
      }
      if (text.includes('exchange')) {
        return `🔁 *Exchange Policy:* ${settings.exchangePolicy || 'Free size exchange within 7 days.'}`;
      }
      if (text.includes('payment') || text.includes('cod') || text.includes('upi')) {
        return `💳 *Payment Methods:* ${settings.paymentMethods || 'UPI, Cards, Net Banking & Cash on Delivery (COD).'}`;
      }
      if (text.includes('timing') || text.includes('hour') || text.includes('open')) {
        return `⏰ *Store Timings:* ${settings.businessHours || 'Mon-Sat: 10:00 AM - 08:00 PM'}`;
      }
      if (text.includes('address') || text.includes('location') || text.includes('where') || text.includes('map') || text === '5') {
        return `📍 *Store Location & Hours:*\n🏢 ${settings.organization.name}\n📍 ${settings.address || 'Visit our flagship store!'}\n⏰ *Timings:* ${settings.businessHours || 'Mon-Sat: 10:00 AM - 08:00 PM'}\n📞 *Phone:* ${settings.phone || 'Available on WhatsApp'}`;
      }
      if (text.includes('order') || text.includes('buy') || text.includes('cart') || text === '6') {
        return `🛒 *Ready to Order?*\n1. Browse our catalog and reply with the product name\n2. We support UPI, Cards, and Cash on Delivery\n🌐 *Website:* ${settings.website || 'Available on request'}`;
      }

      return `👋 Thank you for contacting *${settings.organization.name}*!\n\n${settings.welcomeMessage || 'How can we assist you today?'}`;
    }

    try {
      const response = await client.chat.completions.create({
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: `You are the friendly WhatsApp AI assistant for the business "${settings.organization.name}".
Answer the customer's question strictly using the provided store information. NEVER invent policies, prices or store details.

Store Context:
- Store Name: ${settings.organization.name}
- Store Timings: ${settings.businessHours}
- Address: ${settings.address}
- Delivery Policy: ${settings.deliveryPolicy}
- Return Policy: ${settings.returnPolicy}
- Exchange Policy: ${settings.exchangePolicy}
- Payment Methods: ${settings.paymentMethods}
- Contact Phone: ${settings.phone}`,
          },
          { role: 'user', content: question },
        ],
        temperature: 0.2,
      });

      return response.choices[0]?.message?.content || 'Our team will assist you shortly.';
    } catch (err) {
      logger.error('OpenAI FAQ Error:', err);
      return `Thank you for contacting *${settings.organization.name}*! Our support team will answer your query shortly.`;
    }
  }
}
