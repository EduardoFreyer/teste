import { z } from 'zod';

const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/i, 'ID inválido');
const textField = z
  .string()
  .trim()
  .max(80)
  .transform((value) => value.replace(/[\u0000-\u001F\u007F]/g, ''));

export const addressCreateSchema = z.object({
  street: z.string().trim().min(2).max(191),
  number: z.string().trim().min(1).max(191),
  complement: z.string().trim().max(191).optional(),
  district: z.string().trim().min(2).max(191),
  city: z.string().trim().min(2).max(191),
  state: z.string().trim().min(2).max(191),
  zipCode: z.string().trim().min(8).max(191),
  isDefault: z.boolean().optional().default(false),
});

export const addressUpdateSchema = addressCreateSchema.partial();

export const checkoutCreateOrderSchema = z.object({
  addressId: cuidSchema,
  shippingMethod: z.string().trim().min(2).max(191),
  paymentMethod: z.string().trim().min(2).max(191),
  items: z
    .array(
      z.object({
        productId: cuidSchema,
        quantity: z.coerce.number().int().min(1).max(100),
        optionIds: z.array(cuidSchema).max(20).optional().default([]),
        personalization: z
          .object({
            personalizedName: textField.optional(),
            customColor: textField.optional(),
            customFont: textField.optional(),
            customSeed: textField.optional(),
            customBow: textField.optional(),
            customBag: textField.optional(),
            customTag: textField.optional(),
          })
          .optional()
          .default({}),
      }),
    )
    .min(1)
    .max(50),
});

export type AddressCreateInput = z.infer<typeof addressCreateSchema>;
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;
export type CheckoutCreateOrderInput = z.infer<typeof checkoutCreateOrderSchema>;
