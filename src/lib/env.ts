import 'server-only';
import { z } from 'zod';

// Server-side configuration. Legacy names from earlier projects are normalised here
// so the rest of the app only reads one canonical name per setting.
const pick = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
};

const schema = z.object({
  APP_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('listing-images'),
  ADMIN_EMAILS: z.string().default(''),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().default('shopsphere-trade'),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  SERP_API_KEY: z.string().optional(),
  // Test mode only: live keys are rejected so this build can never take real payments.
  STRIPE_SECRET_KEY: z.string().refine((v) => v.startsWith('sk_test_') || v.startsWith('rk_test_'), 'Only Stripe test-mode keys are allowed.').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_PHONE: z.string().optional(),
  FMP_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const raw = {
    APP_URL: pick('NEXT_PUBLIC_APP_URL', 'APP_URL'),
    DATABASE_URL: pick('DATABASE_URL'),
    SUPABASE_URL: pick('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL'),
    SUPABASE_PUBLISHABLE_KEY: pick('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: pick('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_STORAGE_BUCKET: pick('SUPABASE_STORAGE_BUCKET'),
    ADMIN_EMAILS: pick('ADMIN_EMAILS'),
    REDIS_URL: pick('REDIS_URL'),
    OPENAI_API_KEY: pick('OPENAI_API_KEY'),
    OPENROUTER_API_KEY: pick('OPENROUTER_API_KEY'),
    PINECONE_API_KEY: pick('PINECONE_API_KEY'),
    PINECONE_INDEX: pick('PINECONE_INDEX'),
    OPENROUTER_MODEL: pick('OPENROUTER_MODEL'),
    EMBEDDING_MODEL: pick('EMBEDDING_MODEL'),
    GROQ_API_KEY: pick('GROQ_API_KEY'),
    GROQ_MODEL: pick('GROQ_MODEL'),
    SERP_API_KEY: pick('SERP_API_KEY', 'SERP_API_KEY_TEST'),
    STRIPE_SECRET_KEY: pick('STRIPE_SECRET_KEY', 'STRIPE_API_KEY'),
    STRIPE_WEBHOOK_SECRET: pick('STRIPE_WEBHOOK_SECRET'),
    RESEND_API_KEY: pick('RESEND_API_KEY'),
    EMAIL_FROM: pick('EMAIL_FROM'),
    TWILIO_ACCOUNT_SID: pick('TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: pick('TWILIO_AUTH_TOKEN'),
    TWILIO_FROM_PHONE: pick('TWILIO_FROM_PHONE'),
    FMP_API_KEY: pick('FMP_API_KEY', 'VITE_FMP_KEY'),
    FINNHUB_API_KEY: pick('FINNHUB_API_KEY', 'VITE_FINNHUB_KEY'),
  };
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Report which settings are invalid (never their values) and disable just those.
  const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
  console.warn(`[env] Ignoring invalid settings: ${[...bad].join(', ')}`);
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([k]) => !bad.has(k)));
  return schema.parse(cleaned);
}

export const env = load();

export const features = {
  db: Boolean(env.DATABASE_URL),
  auth: Boolean(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY),
  storage: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  redis: Boolean(env.REDIS_URL),
  embeddings: Boolean(env.OPENAI_API_KEY),
  groq: Boolean(env.GROQ_API_KEY),
  openrouter: Boolean(env.OPENROUTER_API_KEY),
  pinecone: Boolean(env.PINECONE_API_KEY),
  serp: Boolean(env.SERP_API_KEY),
  stripe: Boolean(env.STRIPE_SECRET_KEY),
  email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  sms: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_PHONE),
  quotes: Boolean(env.FMP_API_KEY || env.FINNHUB_API_KEY),
};

export const adminEmails = new Set(env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
