import dotenv from 'dotenv';
import path from 'path';

// Load .env from root workspace or apps/api
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chatflow?schema=public',

  jwt: {
    secret: process.env.JWT_SECRET || 'chatflow_fallback_jwt_secret_change_in_production!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'chatflow_fallback_refresh_secret_change_in_production!',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  whatsapp: {
    apiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'chatflow_webhook_verify_token_secure_xyz_987',
    metaAppSecret: process.env.META_APP_SECRET || '',
    mock: process.env.MOCK_WHATSAPP === 'true' || !process.env.WHATSAPP_ACCESS_TOKEN,
  },

  ai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    mock: process.env.MOCK_AI === 'true' || !process.env.OPENAI_API_KEY,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    useRedis: process.env.USE_REDIS === 'true',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/callback`,
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio', // twilio, fast2sms, generic
    apiKey: process.env.SMS_PROVIDER_API_KEY || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromPhone: process.env.TWILIO_FROM_PHONE || '',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, resend, sendgrid
    fromEmail: process.env.EMAIL_FROM || 'noreply@automatebydk.com',
    fromName: process.env.EMAIL_FROM_NAME || 'AutoMate by DK',
    apiKey: process.env.EMAIL_PROVIDER_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
  },
};
