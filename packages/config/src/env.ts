import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  MINIO_ENDPOINT: z.string().min(1)
});

export type AppEnv = z.infer<typeof envSchema>;

export const loadEnv = (): AppEnv => envSchema.parse(process.env);

