import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';

// Allowed MIME types and extensions
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/3gpp', 'video/quicktime'];

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOC_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_VIDEO_TYPES,
];

// Memory storage keeps file buffers in memory for magic bytes inspection
const memoryStorage = multer.memoryStorage();

// File filter to block disallowed extensions and MIME types early
const fileFilter = (allowedTypes: string[]) => {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 1. Sanitize file name & check for null byte injection / path traversal
    if (/[\0\/\\]|\.\./.test(file.originalname)) {
      return cb(new Error('Invalid filename containing malicious characters or directory traversal.'));
    }

    // 2. Validate MIME type
    if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
      return cb(
        new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`)
      );
    }

    cb(null, true);
  };
};

// 1. Media & Image Upload (Strict 5MB limit to prevent DDoS & storage exhaustion)
export const mediaUploader = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: fileFilter([...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES]),
});

// 2. Document & CSV Upload (Up to 15MB)
export const docUploader = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1,
  },
  fileFilter: fileFilter(ALLOWED_DOC_TYPES),
});

// 3. Generic Secure Uploader (Up to 15MB)
export const secureUploader = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 5,
  },
  fileFilter: fileFilter(ALL_ALLOWED_TYPES),
});

/**
 * Validates magic number signatures of uploaded buffer to defeat file extension spoofing
 */
export function verifyBufferMagicBytes(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const hexHeader = buffer.subarray(0, 12).toString('hex').toLowerCase();

  // JPEG: starts with ffd8ff
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    return hexHeader.startsWith('ffd8ff');
  }

  // PNG: starts with 89504e47 (‰PNG)
  if (mimetype === 'image/png') {
    return hexHeader.startsWith('89504e47');
  }

  // GIF: starts with 47494638 (GIF8)
  if (mimetype === 'image/gif') {
    return hexHeader.startsWith('47494638');
  }

  // WEBP: starts with 52494646 (RIFF) and contains 57454250 (WEBP)
  if (mimetype === 'image/webp') {
    return hexHeader.startsWith('52494646') && buffer.subarray(8, 12).toString('utf-8') === 'WEBP';
  }

  // PDF: starts with 25504446 (%PDF)
  if (mimetype === 'application/pdf') {
    return hexHeader.startsWith('25504446');
  }

  // ZIP / DOCX / XLSX: starts with 504b0304 (PK..)
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/zip'
  ) {
    return hexHeader.startsWith('504b0304');
  }

  // OGG: starts with 4f676753 (OggS)
  if (mimetype === 'audio/ogg') {
    return hexHeader.startsWith('4f676753');
  }

  // MP3: starts with 494433 (ID3) or fffb / fff3 / fff2
  if (mimetype === 'audio/mpeg' || mimetype === 'audio/mp3') {
    return hexHeader.startsWith('494433') || hexHeader.startsWith('fffb') || hexHeader.startsWith('fff3') || hexHeader.startsWith('fff2');
  }

  // MP4 / MOV / 3GP: ftyp at offset 4
  if (mimetype === 'video/mp4' || mimetype === 'video/quicktime' || mimetype === 'video/3gpp' || mimetype === 'audio/mp4') {
    const ftyp = buffer.subarray(4, 8).toString('utf-8');
    return ftyp === 'ftyp' || ftyp === 'moov';
  }

  // Plain Text / CSV: Verify ASCII / UTF-8 printable strings without null bytes or binary garbage
  if (mimetype === 'text/plain' || mimetype === 'text/csv') {
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
      if (buffer[i] === 0) return false; // Null byte in text
    }
    return true;
  }

  return true;
}

/**
 * Middleware that strictly verifies buffer magic bytes after multer parsing
 */
export const validateUploadedFiles = (req: Request, res: Response, next: NextFunction) => {
  const files: Express.Multer.File[] = [];

  if (req.file) {
    files.push(req.file);
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      Object.values(req.files).forEach((group) => files.push(...group));
    }
  }

  for (const file of files) {
    if (file.buffer) {
      const isValid = verifyBufferMagicBytes(file.buffer, file.mimetype);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE_SIGNATURE',
          message: `Security validation failed: File "${file.originalname}" content does not match claimed MIME type ${file.mimetype}. Spoofed files are rejected.`,
        });
      }
    }
  }

  next();
};

/**
 * Generates an unpredictable, cryptographically safe filename
 */
export function generateSafeFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const uniqueId = crypto.randomUUID();
  return `${uniqueId}${ext}`;
}
