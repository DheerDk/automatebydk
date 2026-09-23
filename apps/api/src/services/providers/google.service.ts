import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface GoogleUserProfile {
  id: string; // Google sub ID
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
}

export class GoogleOAuthService {
  /**
   * Check whether Google OAuth credentials are fully configured
   */
  public static isConfigured(): boolean {
    return Boolean(config.google.clientId && config.google.clientSecret);
  }

  /**
   * Generate official Google OAuth 2.0 / OpenID Connect authorization URL
   */
  public static getAuthorizationUrl(state?: string, redirectUriOverride?: string): string {
    if (!this.isConfigured()) {
      throw new AppError('Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend environment variables.', 503, 'GOOGLE_NOT_CONFIGURED');
    }

    const redirectUri = redirectUriOverride || config.google.redirectUri;
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      ...(state ? { state } : {}),
    });

    return `${rootUrl}?${params.toString()}`;
  }

  /**
   * Exchange OAuth 2.0 authorization code for user info using official Google endpoints
   */
  public static async exchangeCodeForProfile(code: string, redirectUriOverride?: string): Promise<GoogleUserProfile> {
    if (!this.isConfigured()) {
      throw new AppError('Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend environment variables.', 503, 'GOOGLE_NOT_CONFIGURED');
    }

    const redirectUri = redirectUriOverride || config.google.redirectUri;

    try {
      // 1. Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      const { access_token, id_token } = tokenResponse.data;
      if (!access_token && !id_token) {
        throw new Error('No access_token or id_token returned from Google OAuth exchange');
      }

      // 2. Retrieve verified user identity from Google OpenID userinfo
      const userInfoResponse = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        timeout: 10000,
      });

      const data = userInfoResponse.data;
      if (!data.sub || !data.email) {
        throw new Error('Incomplete identity information returned by Google');
      }

      return {
        id: data.sub,
        email: data.email.toLowerCase(),
        emailVerified: Boolean(data.email_verified),
        name: data.name || data.email.split('@')[0],
        avatarUrl: data.picture || undefined,
      };
    } catch (err: any) {
      logger.error('Google OAuth token exchange failed:', err.response?.data || err.message);
      const detail = err.response?.data?.error_description || err.response?.data?.error || err.message;
      throw new AppError(`Google OAuth verification failed: ${detail}`, 400, 'GOOGLE_AUTH_FAILED');
    }
  }

  /**
   * Validate Google ID token (e.g. from Google One-Tap or Google Identity Services SDK)
   */
  public static async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    if (!this.isConfigured()) {
      throw new AppError('Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.', 503, 'GOOGLE_NOT_CONFIGURED');
    }

    try {
      const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
        timeout: 10000,
      });

      const payload = response.data;
      if (!payload || !payload.sub || !payload.email) {
        throw new Error('Invalid token payload from Google');
      }

      if (payload.aud !== config.google.clientId) {
        throw new Error('Google token client ID audience mismatch');
      }

      return {
        id: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
        name: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture || undefined,
      };
    } catch (err: any) {
      logger.error('Google ID token verification failed:', err.response?.data || err.message);
      throw new AppError('Invalid or expired Google authentication token', 401, 'INVALID_GOOGLE_TOKEN');
    }
  }
}
