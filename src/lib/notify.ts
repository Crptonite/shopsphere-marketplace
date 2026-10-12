import 'server-only';
import { pool } from '@/lib/db';
import { env, features } from '@/lib/env';
import { del } from '@/lib/redis';

export type NotifyInput = {
  userId: string;
  type: 'message' | 'order' | 'payment' | 'sale' | 'offer' | 'viewing' | 'payout' | 'refund';
  title: string;
  body?: string;
  link?: string;
};

export const badgeKey = (userId: string) => `user:notifications:${userId}`;

/**
 * Records an in-app notification and, when enabled, sends email (Resend) and SMS (Twilio).
 * Delivery failures are logged and never break the calling flow.
 */
export async function notify(n: NotifyInput) {
  try {
    const { rows } = await pool.query<{ email: string; phone: string | null; sms_opt_in: boolean; email_enabled: boolean | null; sms_enabled: boolean | null; in_app_enabled: boolean | null }>(
      `SELECT u.email, u.phone, u.sms_opt_in, p.email_enabled, p.sms_enabled, p.in_app_enabled
       FROM users u LEFT JOIN notification_prefs p ON p.user_id = u.id WHERE u.id = $1`,
      [n.userId],
    );
    const u = rows[0];
    if (!u) return;

    if (u.in_app_enabled !== false) {
      await pool.query('INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5)', [n.userId, n.type, n.title, n.body ?? '', n.link ?? null]);
      await del(badgeKey(n.userId));
    }
    const link = n.link ? new URL(n.link, env.APP_URL).toString() : env.APP_URL;
    // Chat messages are high-volume; only transactional events go out by email/SMS.
    const external = n.type !== 'message';
    if (external && features.email && u.email_enabled !== false) void sendEmail(u.email, n.title, `${n.body ?? ''}\n\n${link}`);
    if (external && features.sms && u.sms_opt_in && u.sms_enabled === true && u.phone) void sendSms(u.phone, `ShopSphere: ${n.title}. ${link}`);
  } catch (e) {
    console.error('notify failed', e);
  }
}

async function sendEmail(to: string, subject: string, text: string) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) console.warn('Resend returned', res.status);
  } catch (e) {
    console.warn('Email send failed', e);
  }
}

async function sendSms(to: string, body: string) {
  try {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: env.TWILIO_FROM_PHONE!, Body: body.slice(0, 300) }),
    });
    if (!res.ok) console.warn('Twilio returned', res.status);
  } catch (e) {
    console.warn('SMS send failed', e);
  }
}
