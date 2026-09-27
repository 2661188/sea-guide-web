// Instagram handle: accepts "@rak_overlander", "rak_overlander" or a profile link,
// stores the bare username, and builds the profile URL from it.
import { load, save } from '@/lib/storage';

export const DEFAULT_INSTAGRAM = 'rak_overlander';
const KEY = 'instagram';

/** Username rules (Instagram): 1–30 of a-z 0-9 . _ ; no leading/trailing dot, no "..". */
export function normaliseInstagram(input: string | null | undefined): { ok: true; handle: string } | { ok: false; error: 'empty' | 'invalid' } {
  let s = String(input ?? '').trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^(www\.)?instagram\.com\//i, '');
  s = s.split(/[/?#]/)[0].trim();
  s = s.replace(/^@+/, '').toLowerCase();
  if (!s) return { ok: false, error: 'empty' };
  if (!/^[a-z0-9._]{1,30}$/.test(s) || s.startsWith('.') || s.endsWith('.') || s.includes('..')) return { ok: false, error: 'invalid' };
  return { ok: true, handle: s };
}
export const instagramUrl = (handle: string) => `https://instagram.com/${encodeURIComponent(handle)}`;

export function getInstagram(): string {
  const v = normaliseInstagram(load<string>(KEY, DEFAULT_INSTAGRAM));
  return v.ok ? v.handle : DEFAULT_INSTAGRAM;
}
export function setInstagram(input: string): ReturnType<typeof normaliseInstagram> {
  const v = normaliseInstagram(input);
  if (v.ok) save(KEY, v.handle);
  return v;
}
