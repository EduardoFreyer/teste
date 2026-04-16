import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(180).toLowerCase(),
  password: z.string().min(10).max(128),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(180).toLowerCase(),
  password: z.string().min(10).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
