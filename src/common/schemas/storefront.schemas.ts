import { z } from 'zod';

export const storefrontQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  categoryId: z.string().optional(),
  q: z.string().trim().max(120).optional(),
});

export type StorefrontQueryInput = z.infer<typeof storefrontQuerySchema>;
