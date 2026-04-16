import { z } from 'zod';

const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/i, 'ID inválido');

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  isActive: z.boolean().optional().default(true),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const categoryStatusSchema = z.object({
  isActive: z.boolean(),
});

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(5000),
  priceCents: z.coerce.number().int().positive(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().optional().default(true),
  categoryIds: z.array(cuidSchema).min(1).max(20),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  categoryIds: z.array(cuidSchema).min(1).max(20).optional(),
});

export const optionCreateSchema = z.object({
  type: z.enum(['BOW_COLOR', 'FONT', 'SEED_TYPE', 'TAG', 'BAG', 'OTHER']),
  label: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(140),
  priceDelta: z.coerce.number().int().min(-1_000_000).max(1_000_000).default(0),
  isActive: z.boolean().optional().default(true),
});

export const optionUpdateSchema = optionCreateSchema.partial();

export const imageCreateSchema = z.object({
  url: z.string().url(),
  alt: z.string().trim().max(180).optional(),
  position: z.coerce.number().int().min(0).default(0),
});

export const imageUpdateSchema = imageCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type AdminListQueryInput = z.infer<typeof adminListQuerySchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type OptionCreateInput = z.infer<typeof optionCreateSchema>;
export type OptionUpdateInput = z.infer<typeof optionUpdateSchema>;
export type ImageCreateInput = z.infer<typeof imageCreateSchema>;
export type ImageUpdateInput = z.infer<typeof imageUpdateSchema>;
