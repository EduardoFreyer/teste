import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3001),
  APP_CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(10),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('10m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('15d'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_COOKIE_MAX_AGE_MS: z.coerce.number().int().positive().default(1296000000),
  JWT_REFRESH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  MELHOR_ENVIO_API_URL: z.string().url().optional(),
  MELHOR_ENVIO_TOKEN: z.string().optional(),
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
}
