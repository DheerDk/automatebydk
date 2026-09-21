import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service.js';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

export class AiController {
  public static async testSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const intent = await AiService.detectIntent(query);
      const filters = await AiService.extractSearchFilters(query);
      const products = await AiService.searchProductsFromDatabase(organizationId, filters, 5);

      const formattedProducts = products.map((p) => ({
        ...p,
        images: JSON.parse(p.images || '[]'),
        tags: JSON.parse(p.tags || '[]'),
      }));

      return res.json({
        success: true,
        data: {
          query,
          detectedIntent: intent,
          extractedFilters: filters,
          productsCount: formattedProducts.length,
          products: formattedProducts,
          aiMode: config.ai.mock ? 'MOCK_ENGINE' : 'OPENAI_LIVE',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async testFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const answer = await AiService.answerFaq(organizationId, question);

      return res.json({
        success: true,
        data: {
          question,
          answer,
          aiMode: config.ai.mock ? 'MOCK_ENGINE' : 'OPENAI_LIVE',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test Business AI Agent with prompt, custom FAQs, and full multi-turn conversational simulator
   */
  public static async testAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { message, customerName, history } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const result = await AiService.generateBusinessAiReply({
        organizationId,
        customerMessage: message,
        customerName: customerName || 'Simulated Customer',
        conversationHistory: history || [],
      });

      return res.json({
        success: true,
        data: {
          message,
          reply: result.replyText,
          detectedIntent: result.detectedIntent,
          matchedCustomFaq: result.matchedCustomFaq,
          products: result.products || [],
          sourcesUsed: result.sourcesUsed,
          aiMode: config.ai.mock ? 'MOCK_ENGINE' : 'OPENAI_LIVE',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI Training Settings for Organization
   */
  public static async getTraining(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const settings = await prisma.businessSettings.findUnique({
        where: { organizationId },
        include: { organization: true },
      });

      let customFaqs = [];
      if (settings?.aiCustomFaqs) {
        try {
          customFaqs = typeof settings.aiCustomFaqs === 'string'
            ? JSON.parse(settings.aiCustomFaqs)
            : settings.aiCustomFaqs;
        } catch {
          customFaqs = [];
        }
      }

      return res.json({
        success: true,
        data: {
          businessName: settings?.organization?.name || '',
          aiAutoReplyEnabled: settings?.aiAutoReplyEnabled ?? true,
          aiSystemPrompt: settings?.aiSystemPrompt || '',
          aiKnowledgeBase: settings?.aiKnowledgeBase || '',
          aiCustomFaqs: customFaqs,
          aiTone: settings?.aiTone || 'FRIENDLY',
          aiFallbackMessage: settings?.aiFallbackMessage || 'I am sorry, I am not sure about that. Let me connect you with our store team!',
          aiIncludeCatalog: settings?.aiIncludeCatalog ?? true,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update AI Training Settings for Organization
   */
  public static async updateTraining(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const {
        aiAutoReplyEnabled,
        aiSystemPrompt,
        aiKnowledgeBase,
        aiCustomFaqs,
        aiTone,
        aiFallbackMessage,
        aiIncludeCatalog,
      } = req.body;

      const faqsJson = Array.isArray(aiCustomFaqs)
        ? JSON.stringify(aiCustomFaqs)
        : (typeof aiCustomFaqs === 'string' ? aiCustomFaqs : '[]');

      const updated = await (prisma.businessSettings as any).upsert({
        where: { organizationId },
        update: {
          aiAutoReplyEnabled: aiAutoReplyEnabled !== undefined ? Boolean(aiAutoReplyEnabled) : true,
          aiSystemPrompt: aiSystemPrompt !== undefined ? aiSystemPrompt : undefined,
          aiKnowledgeBase: aiKnowledgeBase !== undefined ? aiKnowledgeBase : undefined,
          aiCustomFaqs: faqsJson,
          aiTone: aiTone || 'FRIENDLY',
          aiFallbackMessage: aiFallbackMessage !== undefined ? aiFallbackMessage : undefined,
          aiIncludeCatalog: aiIncludeCatalog !== undefined ? Boolean(aiIncludeCatalog) : true,
        },
        create: {
          organizationId,
          aiAutoReplyEnabled: aiAutoReplyEnabled !== undefined ? Boolean(aiAutoReplyEnabled) : true,
          aiSystemPrompt: aiSystemPrompt || '',
          aiKnowledgeBase: aiKnowledgeBase || '',
          aiCustomFaqs: faqsJson,
          aiTone: aiTone || 'FRIENDLY',
          aiFallbackMessage: aiFallbackMessage || 'I am sorry, I am not sure about that. Let me connect you with our store team!',
          aiIncludeCatalog: aiIncludeCatalog !== undefined ? Boolean(aiIncludeCatalog) : true,
        },
      });

      let parsedFaqs = [];
      try {
        parsedFaqs = JSON.parse(updated.aiCustomFaqs || '[]');
      } catch {
        parsedFaqs = [];
      }

      return res.json({
        success: true,
        message: 'AI Training instructions and knowledge base updated successfully',
        data: {
          ...updated,
          aiCustomFaqs: parsedFaqs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
