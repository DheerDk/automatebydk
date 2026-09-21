import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service.js';
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
}
