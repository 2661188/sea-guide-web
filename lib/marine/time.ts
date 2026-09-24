import type { Msg } from '../i18n/LangContext';

// Times from the provider are local wall-clock strings ("YYYY-MM-DDTHH:mm").
// We treat them as "local ms" (Date.UTC of the wall clock) so the phone's own
// timezone can never shift them. `now` is converted the same way using the
// spot's UTC offset returned by the provider.

export const toLocalMs = (s: string) =>
  Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13) || 0, +s.slice(14, 16) || 0);

export const nowLocalMs = (utcOffsetSeconds: number) => Date.now() + utcOffsetSeconds * 1000;

export const fmtTime = (ms: number) => new Date(ms).toISOString().slice(11, 16);

export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** "in 2 h 10 min" as a translatable message, for a local-ms time relative to local now. */
export function untilMsg(targetMs: number, nowMs: number): Msg {
  const mins = Math.round((targetMs - nowMs) / 60000);
  if (mins <= 0) return { k: 'until_now' };
  if (mins < 60) return { k: 'until_min', v: { m: mins } };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? { k: 'until_hm', v: { h, m } } : { k: 'until_h', v: { h } };
}
