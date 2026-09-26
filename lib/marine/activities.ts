// CALCULATED: how today's forecast suits each water sport.
// Rules of thumb for recreational users — never a safety verdict. Thresholds
// are deliberately conservative and use the worst value in the next few hours.

import type { Conditions, Num } from './types';
import type { Key } from '../i18n/strings';
import type { Msg } from '../i18n/LangContext';
import type { Tone } from './assess';
import { fishingHours } from './assess';
import { tideRate } from './tides';

export type ActivityId = 'boating' | 'fishing' | 'jetski' | 'kayak' | 'sailing' | 'kite' | 'diving' | 'swimming';
export const ACTIVITIES: ActivityId[] = ['boating', 'fishing', 'jetski', 'kayak', 'sailing', 'kite', 'diving', 'swimming'];

export type Rating = 'good' | 'fair' | 'poor' | 'unknown';
export const ratingTone: Record<Rating, Tone> = { good: 'good', fair: 'caution', poor: 'bad', unknown: 'unknown' };
export const ratingKey: Record<Rating, Key> = { good: 'rate_good', fair: 'rate_fair', poor: 'rate_poor', unknown: 'rate_unknown' };
export const ratingLevelKey: Record<Rating, Key> = { good: 'lvl_good', fair: 'lvl_fair', poor: 'lvl_poor', unknown: 'lvl_incomplete' };

export interface ActivityAssessment {
  id: ActivityId;
  rating: Rating;
  reasons: Msg[]; // why it isn't "good" (or what makes it good)
}

const RANK: Record<Rating, number> = { good: 0, fair: 1, poor: 2, unknown: 3 };
const worst = (a: Rating, b: Rating): Rating => (RANK[b] > RANK[a] ? b : a);

/** Higher values are worse: ≤ good → good, ≤ fair → fair, else poor. */
const upTo = (v: number, good: number, fair: number): Rating => (v <= good ? 'good' : v <= fair ? 'fair' : 'poor');
/** A band is best (e.g. sailing wind): inside [gLo,gHi] good, inside [fLo,fHi] fair, else poor. */
const band = (v: number, gLo: number, gHi: number, fLo: number, fHi: number): Rating =>
  v >= gLo && v <= gHi ? 'good' : v >= fLo && v <= fHi ? 'fair' : 'poor';

const nums = (arr: Num[], from: number, to: number) =>
  arr.slice(Math.max(0, from), Math.max(0, to)).filter((v): v is number => v != null);

export function assessActivity(id: ActivityId, c: Conditions, i: number, hours = 6): ActivityAssessment {
  const h = c.hourly;
  const wind = nums(h.windSpeed, i, i + hours);
  const gust = nums(h.windGusts, i, i + hours);
  const wave = nums(h.waveHeight, i, i + hours);
  const vis = nums(h.visibility, i, i + hours);
  const codes = nums(h.weatherCode, i, i + hours);
  if (!wind.length || !wave.length) return { id, rating: 'unknown', reasons: [{ k: 'r_incomplete' }] };

  const wMax = Math.max(...wind), wMin = Math.min(...wind);
  const gMax = gust.length ? Math.max(...gust) : wMax;
  const hMax = Math.max(...wave);
  const storm = codes.some((x) => x >= 95);
  const lowVis = vis.length ? Math.min(...vis) < 2000 : false;
  const flow = Math.abs(tideRate(h.seaLevel, i) ?? 0);

  let rating: Rating = 'good';
  const reasons: Msg[] = [];
  const check = (r: Rating, reason: Msg) => { if (r !== 'good') { rating = worst(rating, r); reasons.push(reason); } };
  const windUp = (g: number, f: number) => check(upTo(wMax, g, f), { k: 'r_wind', v: { v: Math.round(wMax) } });
  const gustUp = (g: number, f: number) => check(upTo(gMax, g, f), { k: 'r_gust', v: { v: Math.round(gMax) } });
  const wavesUp = (g: number, f: number) => check(upTo(hMax, g, f), { k: 'r_waves', v: { v: hMax.toFixed(1) } });

  switch (id) {
    case 'boating': windUp(15, 20); gustUp(22, 28); wavesUp(1.0, 1.5); break;
    case 'jetski': windUp(12, 18); gustUp(18, 25); wavesUp(0.5, 1.0); break;
    case 'kayak': windUp(8, 12); gustUp(12, 16); wavesUp(0.3, 0.6); break;
    case 'swimming': windUp(12, 16); wavesUp(0.3, 0.6); break;
    case 'diving':
      windUp(10, 15); wavesUp(0.4, 0.8);
      check(flow > 0.15 ? 'fair' : 'good', { k: 'r_flow' });
      break;
    case 'sailing': {
      const r = band(wMax, 8, 18, 5, 22);
      check(r, wMax < 8 ? { k: 'r_wind_light', v: { v: Math.round(wMax) } } : { k: 'r_wind', v: { v: Math.round(wMax) } });
      gustUp(24, 30); wavesUp(1.0, 1.5);
      break;
    }
    case 'kite': {
      // Needs steady wind: judge on the lighter end too, and penalise gusty spells.
      const r = worst(band(wMin, 12, 25, 10, 30), band(wMax, 12, 25, 10, 30));
      check(r, wMin < 12 ? { k: 'r_wind_light', v: { v: Math.round(wMin) } } : { k: 'r_wind', v: { v: Math.round(wMax) } });
      check(gMax - wMax > 10 ? 'fair' : 'good', { k: 'r_gusty', v: { lo: Math.round(wMax), hi: Math.round(gMax) } });
      wavesUp(1.2, 1.8);
      break;
    }
    case 'fishing': {
      const score = fishingHours(c)[i]?.score ?? 0;
      check(score >= 60 ? 'good' : score >= 45 ? 'fair' : 'poor', { k: 'r_fish_score', v: { v: score } });
      windUp(18, 25); wavesUp(1.0, 1.5);
      break;
    }
  }
  if (storm) check('poor', { k: 'r_storm' });
  if (lowVis) check(['diving', 'swimming', 'fishing'].includes(id) ? 'fair' : 'poor', { k: 'r_vis' });

  if (rating === 'good') {
    reasons.push(id === 'kite' || id === 'sailing'
      ? { k: 'r_good_wind', v: { v: `${Math.round(wMin)}–${Math.round(wMax)}` } }
      : { k: 'r_calm' });
  }
  return { id, rating, reasons };
}
