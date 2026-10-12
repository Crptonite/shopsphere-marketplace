import 'server-only';
import Stripe from 'stripe';
import { env } from '@/lib/env';

// env.ts rejects non-test keys, so this client can only operate in Stripe test mode.
export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export const toCents = (sgd: number) => Math.round(sgd * 100);
export const fromCents = (cents: number) => cents / 100;
