// Bahrna voice captain — server side. A thin, locked-down proxy to Claude:
// the API key stays on the server (Vercel environment variable ANTHROPIC_API_KEY),
// the tools themselves run on the user's phone (see lib/ai/llm.ts).
import type { NextApiRequest, NextApiResponse } from 'next';
import { AI_TOOLS, SYSTEM_PROMPT } from '@/lib/ai/schema';

export const config = { api: { bodyParser: { sizeLimit: '64kb' } } };

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const hits = new Map<string, number[]>(); // simple per-instance rate limit

function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 40; // tool rounds count too
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ enabled: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!key) return res.status(503).json({ error: 'not_configured' });

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  const { messages, lang } = (req.body ?? {}) as { messages?: unknown; lang?: string };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 24) return res.status(400).json({ error: 'bad_request' });
  const ok = messages.every((m) => m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && (typeof m.content === 'string' || Array.isArray(m.content)));
  if (!ok) return res.status(400).json({ error: 'bad_request' });

  const today = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: `${SYSTEM_PROMPT}\nNow (UAE time): ${today}. Preferred reply language: ${lang === 'ar' ? 'Arabic (Gulf)' : 'English'} unless the user clearly used the other.`,
        tools: AI_TOOLS,
        messages,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status });
    const data = await r.json() as { content: unknown[]; stop_reason: string };
    return res.status(200).json({ content: data.content, stop_reason: data.stop_reason });
  } catch {
    return res.status(502).json({ error: 'upstream' });
  }
}
