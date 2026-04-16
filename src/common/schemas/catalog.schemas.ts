import { z } from 'zod';

const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/i, 'ID inválido');
const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'Valor monetário inválido');

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

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
  description: z.string().trim().min(10).max(5000),
  basePrice: decimalSchema,
  categoryId: cuidSchema,
  isActive: z.boolean().optional().default(true),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productStatusSchema = z.object({
  isActive: z.boolean(),
});

export const optionCreateSchema = z.object({
  type: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(140),
  priceDelta: decimalSchema.default('0'),
});

export const optionUpdateSchema = optionCreateSchema.partial();

export const imageCreateSchema = z.object({
  url: z.string().url().max(191),
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
