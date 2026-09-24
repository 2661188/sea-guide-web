import type { Num } from './types';
import { toLocalMs } from './time';

export interface TideExtreme {
  type: 'high' | 'low';
  at: number; // local ms
  height: number; // m vs mean sea level
}

/**
 * High/low tides from hourly sea level. A parabola through the three samples
 * around each turning point estimates the time and height between samples.
 */
export function findExtremes(time: string[], level: Num[]): TideExtreme[] {
  const out: TideExtreme[] = [];
  for (let i = 1; i < level.length - 1; i++) {
    const a = level[i - 1], b = level[i], c = level[i + 1];
    if (a == null || b == null || c == null) continue;
    const isHigh = b >= a && b > c;
    const isLow = b <= a && b < c;
    if (!isHigh && !isLow) continue;
    const denom = a - 2 * b + c;
    const offset = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
    out.push({
      type: isHigh ? 'high' : 'low',
      at: toLocalMs(time[i]) + Math.round(offset * 60) * 60000,
      height: b - 0.25 * (a - c) * offset,
    });
  }
  return out;
}

/** Index of the hourly sample covering local `now`. */
export function hourIndex(time: string[], nowMs: number): number {
  let idx = 0;
  for (let i = 0; i < time.length; i++) {
    if (toLocalMs(time[i]) <= nowMs) idx = i;
    else break;
  }
  return idx;
}

/** Rate of change (m/h) around hour i, using neighbours. */
export function tideRate(level: Num[], i: number): number | null {
  const prev = level[Math.max(0, i - 1)], next = level[Math.min(level.length - 1, i + 1)];
  if (prev == null || next == null) return null;
  const span = Math.min(level.length - 1, i + 1) - Math.max(0, i - 1) || 1;
  return (next - prev) / span;
}

export type TideTrend = 'Rising' | 'Falling' | 'Slack';

export function tideTrend(level: Num[], i: number): TideTrend | null {
  const r = tideRate(level, i);
  if (r == null) return null;
  if (Math.abs(r) < 0.03) return 'Slack';
  return r > 0 ? 'Rising' : 'Falling';
}

/** Linear interpolation of sea level at local ms. */
export function levelAt(time: string[], level: Num[], ms: number): number | null {
  for (let i = 0; i < time.length - 1; i++) {
    const t0 = toLocalMs(time[i]), t1 = toLocalMs(time[i + 1]);
    if (ms >= t0 && ms <= t1) {
      const a = level[i], b = level[i + 1];
      if (a == null || b == null) return a ?? b ?? null;
      return a + ((b - a) * (ms - t0)) / (t1 - t0);
    }
  }
  return null;
}

/** Translation key for a tide trend. */
export const trendKey = (t: TideTrend) => (`trend_${t}` as const);
