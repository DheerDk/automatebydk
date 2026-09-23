import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface SendSmsParams {
  toPhone: string;
  message: string;
}

export class SmsService {
  /**
   * Validate and format phone number to E.164 standard (+[country_code][number])
   */
  public static normalizePhoneNumber(rawPhone: string): string {
    let clean = rawPhone.trim().replace(/[\s\-()]/g, '');
    if (!clean.startsWith('+')) {
      // Default to +91 if 10 digits without leading + (or retain standard if leading zero stripped)
      if (/^\d{10}$/.test(clean)) {
        clean = `+91${clean}`;
      } else if (/^0\d{10}$/.test(clean)) {
        clean = `+91${clean.slice(1)}`;
      } else {
        clean = `+${clean}`;
      }
    }

    if (!/^\+[1-9]\d{7,14}$/.test(clean)) {
      throw new AppError('Invalid phone number format. Please provide a valid E.164 phone number with country code (e.g. +919876543210).', 400, 'INVALID_PHONE_FORMAT');
    }

    return clean;
  }

  /**
   * Mask phone number for secure display (e.g. +91 98****3210)
   */
  public static maskPhoneNumber(phone: string): string {
    const clean = phone.trim();
    if (clean.length < 8) return clean;
    const prefix = clean.slice(0, 5);
    const suffix = clean.slice(-4);
    const maskedLength = Math.max(3, clean.length - 9);
    return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
  }

  /**
   * Check whether an SMS gateway is configured
   */
  public static isConfigured(): boolean {
    const hasTwilio = Boolean(config.sms.twilioAccountSid && config.sms.twilioAuthToken && config.sms.twilioFromPhone);
    const hasApiKey = Boolean(config.sms.apiKey);
    return hasTwilio || hasApiKey;
  }

  /**
   * Send SMS message via configured provider
   */
  public static async sendSms({ toPhone, message }: SendSmsParams): Promise<{ success: boolean; messageId?: string }> {
    const normalizedPhone = this.normalizePhoneNumber(toPhone);

    if (!this.isConfigured()) {
      logger.warn(`[SMS Service] SMS provider is not configured. SMS not dispatched to ${this.maskPhoneNumber(normalizedPhone)}`);
      throw new AppError(
        'Phone verification is not configured yet. Please configure SMS provider credentials (Twilio or SMS API key) in your backend environment variables.',
        503,
        'SMS_PROVIDER_NOT_CONFIGURED'
      );
    }

    try {
      // 1. Twilio Gateway
      if (config.sms.twilioAccountSid && config.sms.twilioAuthToken && config.sms.twilioFromPhone) {
        const auth = Buffer.from(`${config.sms.twilioAccountSid}:${config.sms.twilioAuthToken}`).toString('base64');
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.sms.twilioAccountSid}/Messages.json`;

        const response = await axios.post(
          twilioUrl,
          new URLSearchParams({
            To: normalizedPhone,
            From: config.sms.twilioFromPhone,
            Body: message,
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          }
        );

        logger.info(`[SMS Service] SMS sent successfully via Twilio to ${this.maskPhoneNumber(normalizedPhone)} (SID: ${response.data.sid})`);
        return { success: true, messageId: response.data.sid };
      }

      // 2. Generic SMS HTTP Gateway / Fast2SMS
      if (config.sms.apiKey) {
        const response = await axios.post(
          'https://www.fast2sms.com/dev/bulkV2',
          {
            route: 'q',
            message,
            flash: 0,
            numbers: normalizedPhone.replace(/^\+91/, ''),
          },
          {
            headers: {
              authorization: config.sms.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        logger.info(`[SMS Service] SMS sent successfully via SMS gateway to ${this.maskPhoneNumber(normalizedPhone)}`);
        return { success: true, messageId: response.data.request_id };
      }

      throw new Error('No supported SMS transport matched configured settings');
    } catch (err: any) {
      logger.error(`[SMS Service] Failed to deliver SMS to ${this.maskPhoneNumber(normalizedPhone)}:`, err.response?.data || err.message);
      throw new AppError('Failed to send SMS message to the provided phone number. Please try again later.', 500, 'SMS_SEND_FAILED');
    }
  }

  /**
   * Dispatch OTP SMS
   */
  public static async sendOtpSms(phone: string, otp: string, purpose: string = 'login'): Promise<{ success: boolean }> {
    const formattedPhone = this.normalizePhoneNumber(phone);
    const purposeText = purpose === 'REGISTER' ? 'registration' : purpose === 'PASSWORD_RESET' ? 'password reset' : 'verification';
    const message = `Your AutoMate verification code for ${purposeText} is: ${otp}. Valid for 5 minutes. Do NOT share this code with anyone.`;
    return this.sendSms({ toPhone: formattedPhone, message });
  }
}
