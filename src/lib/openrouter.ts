import 'server-only';
import { env } from '@/lib/env';

export type AiMessage = { role: 'user' | 'assistant'; content: string };

const SYSTEM_PROMPT = `You are the ShopSphere Trade assistant for Singapore-listed stocks.
- Explain stock concepts, ratios, the nine screening criteria, DCA and risk clearly.
- You have no live market data in this app. Never state a current price, news item or financial figure as fact. Say what would need checking.
- This is research education, not personalised financial advice. Say so when someone asks what to buy or sell.
- Keep answers short and plain. Use bullet points only when they help.`;

/** Calls OpenRouter's chat completions API. The key stays on the server. */
export async function askOpenRouter(messages: AiMessage[]): Promise<string> {
  if (!env.OPENROUTER_API_KEY) throw new Error('AI chat is not configured (OPENROUTER_API_KEY).');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.APP_URL,
      'X-Title': 'ShopSphere Trade',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      max_tokens: 600,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`AI service returned ${res.status}.`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not produce an answer.';
}
