import { Request, Response, NextFunction } from 'express';
import { BaileysService } from '../services/baileys.service.js';
import { logger } from '../utils/logger.js';

export class QRController {
  /**
   * POST /api/whatsapp/qr/start
   * Start or retrieve Baileys QR session for the authenticated organization
   */
  public static async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      logger.info(`Starting/Getting WhatsApp QR session for organization: ${organizationId}`);
      const sessionState = await BaileysService.initSession(organizationId);

      return res.json({
        success: true,
        data: sessionState,
      });
    } catch (error) {
      logger.error('Error starting QR session:', error);
      next(error);
    }
  }

  /**
   * GET /api/whatsapp/qr/status
   * Get current connection status & QR code for the organization
   */
  public static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const status = BaileysService.getSessionStatus(organizationId);
      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/whatsapp/qr/logout
   * Disconnect WhatsApp QR session
   */
  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const result = await BaileysService.logout(organizationId);
      return res.json({
        success: true,
        message: 'WhatsApp session logged out successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
