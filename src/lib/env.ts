import { z } from 'zod';

const envSchema = z.object({
  // Auth
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url().optional(),

  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),

  // Baserow
  BASEROW_API_URL: z.string().url().default('https://api.baserow.io/api'),
  BASEROW_API_TOKEN: z.string().min(1, 'BASEROW_API_TOKEN is required'),
  BASEROW_TABLE_ID: z.string().min(1, 'BASEROW_TABLE_ID is required'),

  // Default Provider
  DEFAULT_AI_PROVIDER: z.enum(['openai', 'gemini', 'groq']).default('openai'),
});

export type Env = z.infer<typeof envSchema>;

function getEnv() {
  // Only validate on server side
  if (typeof window !== 'undefined') {
    return {} as Env;
  }

  const env = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    BASEROW_API_URL: process.env.BASEROW_API_URL || 'https://api.baserow.io/api',
    BASEROW_API_TOKEN: process.env.BASEROW_API_TOKEN,
    BASEROW_TABLE_ID: process.env.BASEROW_TABLE_ID,
    DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER || 'openai',
  };

  // Skip validation during build
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
    return env as Env;
  }

  return envSchema.parse(env);
}

export const env = getEnv();
