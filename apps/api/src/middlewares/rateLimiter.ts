import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Standardized 429 rate limit response helper
const rateLimitHandler = (message: string, retryAfterSeconds?: number) => {
  return (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfterSeconds: retryAfterSeconds || 60,
    });
  };
};

/**
 * 1. Strict Auth Rate Limiter
 * Defends against credential stuffing and brute-force attacks on login/register/password reset.
 * Limit: 20 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.', 900),
});

/**
 * 2. OTP Challenge Rate Limiter
 * Defends against SMS/WhatsApp OTP spamming and toll fraud.
 * Limit: 5 requests per 5 minutes per IP.
 */
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many OTP verification requests. Please wait 5 minutes before requesting again.', 300),
});

/**
 * 3. AI Generation & Sandbox Rate Limiter
 * Protects OpenAI / LLM API quotas and prevents cost drainage / compute exhaustion.
 * Limit: 30 requests per minute per IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('AI rate limit reached. Please wait a moment before sending more queries.', 60),
});

/**
 * 4. File Upload Rate Limiter
 * Prevents storage exhaustion and multipart upload flooding attacks.
 * Limit: 25 uploads per 10 minutes.
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('File upload limit reached. Please wait before uploading more files.', 600),
});

/**
 * 5. Campaign Broadcast Rate Limiter
 * Protects against mass spam triggers and Meta WhatsApp Cloud API rate limits.
 * Limit: 15 broadcasts per hour.
 */
export const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Broadcast campaign launch limit reached. Maximum 15 broadcasts per hour.', 3600),
});

/**
 * 6. High-Throughput Webhook Rate Limiter
 * Allows high-volume WhatsApp messages while protecting against DDoS floods.
 * Limit: 600 requests per minute.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Webhook receiver throughput limit reached.', 30),
});

/**
 * 7. General API Shield Limiter
 * Protects general authenticated endpoints from scraper bots and DoS.
 * Limit: 200 requests per minute per IP.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests. Please slow down.', 60),
});
