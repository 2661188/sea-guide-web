// A small, labelled copy of the forecast at a moment (trip start, catch). Model data.
import type { Conditions } from './types';
import type { TripConditions } from '@/lib/nav/db';
import { hourIndex, levelAt, tideTrend } from './tides';
import { toLocalMs } from './time';

export function snapshotAt(c: Conditions | null | undefined, localMs: number): TripConditions | null {
  if (!c || !c.hourly?.time?.length) return null;
  const h = c.hourly;
  const first = toLocalMs(h.time[0]), last = toLocalMs(h.time[h.time.length - 1]);
  if (localMs < first || localMs > last) return null; // outside the forecast: say nothing
  const i = hourIndex(h.time, localMs);
  const tr = tideTrend(h.seaLevel, i);
  return {
    windKn: h.windSpeed[i], gustKn: h.windGusts[i], windDir: h.windDirection[i], waveM: h.waveHeight[i], airC: h.airTemp[i],
    tide: tr === 'Rising' ? 'rising' : tr === 'Falling' ? 'falling' : tr === 'Slack' ? 'slack' : null,
    source: c.source.name, fetchedAt: c.fetchedAt,
  };
}

/** Tide stage at a local time, from the modelled sea level (null outside the forecast). */
export function tideStageAt(c: Conditions | null | undefined, localMs: number): 'rising' | 'falling' | null {
  if (!c) return null;
  const a = levelAt(c.hourly.time, c.hourly.seaLevel, localMs - 30 * 60e3), b = levelAt(c.hourly.time, c.hourly.seaLevel, localMs + 30 * 60e3);
  if (a == null || b == null) return null;
  return b > a ? 'rising' : 'falling';
}
