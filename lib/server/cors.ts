// Lets the Android app (pages served from https://localhost inside the APK) call the
// public API routes. Only the app's own WebView origins are allowed; the website
// itself is same-origin and needs nothing. Returns true when the request was a
// preflight that has been answered.
import type { NextApiRequest, NextApiResponse } from 'next';

const APP_ORIGINS = new Set(['https://localhost', 'capacitor://localhost']);

export function cors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = String(req.headers.origin ?? '');
  res.setHeader('Vary', 'Origin');
  if (APP_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
