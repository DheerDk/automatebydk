import { Request, Response, NextFunction } from 'express';

// Dangerous regex patterns for XSS, HTML injection, and script execution
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /onfocus\s*=/gi,
  /\0/g, // Null bytes
];

/**
 * Deep sanitization helper that recursively scrubs strings in an object or array
 */
export function sanitizeValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let sanitized = value.trim();

    // Remove dangerous executable script patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitizedObj[key] = sanitizeValue(value[key]);
    }
    return sanitizedObj;
  }

  return value;
}

/**
 * Express middleware to automatically sanitize incoming requests (body, query, params)
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
};
