import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export class EmailService {
  /**
   * Check whether transactional email provider is configured
   */
  public static isConfigured(): boolean {
    const hasApiKey = Boolean(config.email.apiKey);
    const hasSmtp = Boolean(config.email.smtpHost && config.email.smtpUser && config.email.smtpPass);
    return hasApiKey || hasSmtp;
  }

  /**
   * Deliver an email using Resend / SendGrid / SMTP
   */
  public static async sendEmail({ toEmail, toName, subject, htmlContent, textContent }: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
    if (!this.isConfigured()) {
      logger.warn(`[Email Service] Email provider is not configured. Email to ${toEmail} skipped.`);
      throw new AppError(
        'Email delivery is not configured yet. Please configure EMAIL_PROVIDER_API_KEY (Resend/SendGrid) or SMTP settings in your backend environment variables.',
        503,
        'EMAIL_NOT_CONFIGURED'
      );
    }

    try {
      // 1. Resend API Integration
      if (config.email.apiKey && (config.email.provider === 'resend' || config.email.apiKey.startsWith('re_'))) {
        const response = await axios.post(
          'https://api.resend.com/emails',
          {
            from: `${config.email.fromName} <${config.email.fromEmail}>`,
            to: [toEmail],
            subject,
            html: htmlContent,
            text: textContent || htmlContent.replace(/<[^>]+>/g, ''),
          },
          {
            headers: {
              Authorization: `Bearer ${config.email.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        logger.info(`[Email Service] Email sent successfully via Resend to ${toEmail} (ID: ${response.data.id})`);
        return { success: true, messageId: response.data.id };
      }

      // 2. SendGrid API Integration
      if (config.email.apiKey && (config.email.provider === 'sendgrid' || config.email.apiKey.startsWith('SG.'))) {
        const response = await axios.post(
          'https://api.sendgrid.com/v3/mail/send',
          {
            personalizations: [{ to: [{ email: toEmail, name: toName }] }],
            from: { email: config.email.fromEmail, name: config.email.fromName },
            subject,
            content: [
              { type: 'text/html', value: htmlContent },
              ...(textContent ? [{ type: 'text/plain', value: textContent }] : []),
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${config.email.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        logger.info(`[Email Service] Email sent successfully via SendGrid to ${toEmail}`);
        return { success: true, messageId: response.headers['x-message-id'] || 'sendgrid_ok' };
      }

      throw new Error('Unsupported email provider or missing credentials');
    } catch (err: any) {
      logger.error(`[Email Service] Failed to deliver email to ${toEmail}:`, err.response?.data || err.message);
      throw new AppError('Failed to dispatch email. Please verify email settings and try again.', 500, 'EMAIL_DISPATCH_FAILED');
    }
  }

  /**
   * Dispatch email verification link
   */
  public static async sendVerificationEmail(toEmail: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your AutoMate by DK Account';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #059669; margin-top: 0;">Welcome to AutoMate by DK! 👋</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for creating your account. Please click the button below to verify your email address and activate your WhatsApp Business Automation workspace:</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${verifyUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">This verification link will expire in 24 hours. If you did not create this account, please disregard this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">AutoMate by DK &bull; WhatsApp Business Automation &bull; Automated &bull; Secure</p>
      </div>
    `;

    await this.sendEmail({ toEmail, toName: name, subject, htmlContent });
  }

  /**
   * Dispatch password reset link
   */
  public static async sendPasswordResetEmail(toEmail: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Reset your AutoMate by DK Password';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password for your AutoMate by DK account. Click the button below to set a new password:</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">This reset link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email &mdash; your password will not be changed.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">AutoMate by DK &bull; Security Notification</p>
      </div>
    `;

    await this.sendEmail({ toEmail, toName: name, subject, htmlContent });
  }
}
