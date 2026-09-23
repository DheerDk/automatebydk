import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { mediaUploader, docUploader, validateUploadedFiles } from '../middlewares/upload.js';
import { uploadLimiter } from '../middlewares/rateLimiter.js';
import { authenticate, requireTenant } from '../middlewares/auth.js';

const router = Router();

// Require tenant authentication and rate limiting on all file uploads
router.use(authenticate, requireTenant, uploadLimiter);

// Media Upload (Images, Audio, Video for WhatsApp templates, products, etc.)
router.post('/media', mediaUploader.single('file'), validateUploadedFiles, UploadController.uploadMedia);

// Document & CSV Contact List Import
router.post('/contacts-csv', docUploader.single('file'), validateUploadedFiles, UploadController.parseContactsCsv);

export default router;
