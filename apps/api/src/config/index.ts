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
};
