import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(100),
  name: z.string().min(1, 'Name is required').max(100).optional(),
  phone: z.string().regex(/^(\+?[0-9]{7,15})?$/, 'Please enter a valid phone number (7-15 digits)').optional().nullable(),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(120).optional(),
  businessCategory: z.string().max(80).optional(),
  planTier: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL', 'YEARLY', 'LIFETIME']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const requestOtpSchema = z.object({
  phoneNumber: z.string().min(7, 'Phone number is too short').max(20, 'Phone number is too long'),
  countryCode: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(7, 'Phone number is too short').max(20, 'Phone number is too long'),
  otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must be at most 8 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long').max(100),
});
