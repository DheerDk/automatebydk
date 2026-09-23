import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(150),
  templateId: z.string().optional().nullable(),
  customMessage: z.string().max(4096).optional().nullable(),
  mediaUrl: z.string().url('Invalid media URL').optional().or(z.literal('')).nullable(),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')).nullable(),
  discountCode: z.string().max(50).optional().nullable(),
  targetAudience: z.any().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  templateId: z.string().optional().nullable(),
  customMessage: z.string().max(4096).optional().nullable(),
  mediaUrl: z.string().url('Invalid media URL').optional().or(z.literal('')).nullable(),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')).nullable(),
  discountCode: z.string().max(50).optional().nullable(),
  targetAudience: z.any().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});
