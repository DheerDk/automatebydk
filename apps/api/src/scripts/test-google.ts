import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { config } from '../config/index.js';
import { GoogleOAuthService } from '../services/providers/google.service.js';

console.log('Google Client ID exists:', Boolean(config.google.clientId), config.google.clientId ? `(Length: ${config.google.clientId.length})` : '');
console.log('Google Client Secret exists:', Boolean(config.google.clientSecret), config.google.clientSecret ? `(Length: ${config.google.clientSecret.length})` : '');
console.log('Google Redirect URI:', config.google.redirectUri);
console.log('Is Google configured:', GoogleOAuthService.isConfigured());

if (GoogleOAuthService.isConfigured()) {
  console.log('Sample Auth URL:', GoogleOAuthService.getAuthorizationUrl());
}
