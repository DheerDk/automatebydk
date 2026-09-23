import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateSafeFileName } from '../middlewares/upload.js';
import { logger } from '../utils/logger.js';

// Base uploads directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class UploadController {
  /**
   * Upload single media (Image, Audio, Video)
   */
  static async uploadMedia(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          code: 'NO_FILE_PROVIDED',
          message: 'Please provide a media file to upload.',
        });
      }

      const safeName = generateSafeFileName(req.file.originalname);
      const filePath = path.join(UPLOADS_DIR, safeName);

      // Write file safely
      await fs.promises.writeFile(filePath, req.file.buffer);

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const fileUrl = `${protocol}://${host}/uploads/${safeName}`;

      logger.info(`[Upload] File saved securely: ${safeName} (${req.file.size} bytes) for Tenant: ${(req as any).tenantId || 'Public'}`);

      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully and verified for safety.',
        data: {
          url: fileUrl,
          filename: safeName,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error: any) {
      logger.error('Failed to process media upload:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process file upload.',
        error: error.message,
      });
    }
  }

  /**
   * Parse CSV Contacts upload
   */
  static async parseContactsCsv(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          code: 'NO_FILE_PROVIDED',
          message: 'Please upload a valid CSV file containing contacts.',
        });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is empty or missing data rows.',
        });
      }

      const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      const phoneIndex = header.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('number') || h.includes('contact'));
      const nameIndex = header.findIndex((h) => h.includes('name') || h.includes('customer') || h.includes('first'));
      const emailIndex = header.findIndex((h) => h.includes('email') || h.includes('mail'));

      if (phoneIndex === -1) {
        return res.status(400).json({
          success: false,
          message: 'CSV must contain a header with "phone", "mobile", or "number" column.',
        });
      }

      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const phone = row[phoneIndex];
        if (phone && phone.replace(/\D/g, '').length >= 7) {
          contacts.push({
            phoneNumber: phone.replace(/[^\d+]/g, ''),
            name: nameIndex !== -1 ? row[nameIndex] || 'Contact' : 'Contact',
            email: emailIndex !== -1 ? row[emailIndex] || '' : '',
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Successfully parsed ${contacts.length} contacts from CSV.`,
        data: {
          totalCount: contacts.length,
          contacts,
        },
      });
    } catch (error: any) {
      logger.error('Failed to parse contacts CSV:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to parse CSV.',
        error: error.message,
      });
    }
  }
}
