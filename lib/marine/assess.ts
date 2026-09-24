// CALCULATED information derived from live forecast data.
// These are rules of thumb to help people read conditions — never a safety
// verdict and never a guarantee of catching fish.
// Text is returned as translation keys (Msg) so every language shares one logic.

import type { Conditions, Num } from './types';
import type { Key } from '../i18n/strings';
import type { Msg } from '../i18n/LangContext';
import { toLocalMs, dayKey } from './time';
import { tideRate, tideTrend, TideTrend } from './tides';
import { moonAt } from './moon';
import { weatherInfo } from './weather';

export type Tone = 'good' | 'ok' | 'caution' | 'bad' | 'unknown';

const vals = (arr: Num[], from: number, to: number) =>
  arr.slice(Math.max(0, from), Math.max(0, to)).filter((v): v is number => v != null);
const max = (a: number[]) => (a.length ? Math.max(...a) : null);
const min = (a: number[]) => (a.length ? Math.min(...a) : null);
const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

// ---------- Sea-state summary ("Today on the water") ----------

export interface SeaSummary {
  level: Key;
  tone: Tone;
  windMin: number | null;
  windMax: number | null;
  gustMax: number | null;
  waveMax: number | null;
  wavePeriod: number | null;
  trend: TideTrend | null;
  reasons: Msg[]; // what drove the level
}

/** Summarises the next `hours` hours from index `i`. Thresholds suit small/medium powerboats. */
export function seaSummary(c: Conditions, i: number, hours = 6): SeaSummary {
  const h = c.hourly;
  const wind = vals(h.windSpeed, i, i + hours);
  const gust = vals(h.windGusts, i, i + hours);
  const wave = vals(h.waveHeight, i, i + hours);
  const vis = vals(h.visibility, i, i + hours);
  const codes = vals(h.weatherCode, i, i + hours);
  const s: SeaSummary = {
    level: 'lvl_incomplete', tone: 'unknown',
    windMin: min(wind), windMax: max(wind), gustMax: max(gust), waveMax: max(wave),
    wavePeriod: h.wavePeriod[i] ?? null, trend: tideTrend(h.seaLevel, i), reasons: [],
  };
  if (s.windMax == null || s.waveMax == null) {
    s.reasons.push({ k: 'r_incomplete' });
    return s;
  }
  const storm = codes.some((c) => c >= 95);
  const lowVis = (min(vis) ?? 99999) < 2000;
  const g = s.gustMax ?? s.windMax;

  if (s.windMax > 20 || g > 28 || s.waveMax > 1.5 || storm) {
    s.level = 'lvl_rough'; s.tone = 'bad';
  } else if (s.windMax > 15 || g > 22 || s.waveMax > 1.0 || lowVis) {
    s.level = 'lvl_challenging'; s.tone = 'caution';
  } else if (s.windMax > 10 || s.waveMax > 0.6) {
    s.level = 'lvl_moderate'; s.tone = 'ok';
  } else {
    s.level = 'lvl_favourable'; s.tone = 'good';
  }
  if (storm) s.reasons.push({ k: 'r_storm' });
  if (s.windMax > 15) s.reasons.push({ k: 'r_wind', v: { v: Math.round(s.windMax) } });
  if (g > 22) s.reasons.push({ k: 'r_gust', v: { v: Math.round(g) } });
  if (s.waveMax > 1.0) s.reasons.push({ k: 'r_waves', v: { v: s.waveMax.toFixed(1) } });
  if (lowVis) s.reasons.push({ k: 'r_vis' });
  if (!s.reasons.length) s.reasons.push({ k: s.tone === 'good' ? 'r_calm' : 'r_some' });
  return s;
}

// ---------- Fishing estimate ----------

export interface FishingParts { tide: number; light: number; moon: number; wind: number; waves: number; weather: number }
export interface FishingHour { i: number; at: number; score: number; parts: FishingParts }

export function fishingLabel(score: number): Key {
  return score >= 75 ? 'fish_excellent' : score >= 60 ? 'fish_good' : score >= 45 ? 'fish_fair' : 'fish_poor';
}
export function fishingTone(score: number): Tone {
  return score >= 75 ? 'good' : score >= 60 ? 'ok' : score >= 45 ? 'caution' : 'bad';
}

/** Scores every hour. Weights: tide 35, light 25, wind 15, waves 10, moon 10, base 5. */
export function fishingHours(c: Conditions): FishingHour[] {
  const h = c.hourly;
  const n = h.time.length;
  const rates = h.time.map((_, i) => Math.abs(tideRate(h.seaLevel, i) ?? 0));
  const sunEvents = [...c.daily.sunrise, ...c.daily.sunset].filter(Boolean).map(toLocalMs);

  return h.time.map((t, i) => {
    const at = toLocalMs(t);
    // Tide flow relative to the strongest flow within ±12 h (moving water scores higher).
    const localMax = Math.max(...rates.slice(Math.max(0, i - 12), Math.min(n, i + 13)), 0.01);
    const tide = h.seaLevel[i] == null ? 0 : Math.round((rates[i] / localMax) * 35);
    // Light: dawn and dusk (measured from the middle of the hour).
    const minsToSun = Math.min(...sunEvents.map((s) => Math.abs(s - (at + 30 * 60000)) / 60000), 9999);
    const light = minsToSun <= 60 ? 25 : minsToSun <= 120 ? 15 : 3;
    // Moon: traditional solunar belief — around new and full moon tends to be better.
    const f = moonAt(at - c.utcOffsetSeconds * 1000).fraction;
    const dist = Math.min(f, Math.abs(f - 0.5), 1 - f); // distance to new or full (0..0.25)
    const moon = dist < 0.07 ? 10 : dist < 0.15 ? 6 : 3;
    const w = h.windSpeed[i];
    const wind = w == null ? 0 : w <= 5 ? 12 : w <= 12 ? 15 : w <= 18 ? 6 : w <= 25 ? -10 : -25;
    const wv = h.waveHeight[i];
    const waves = wv == null ? 0 : wv <= 0.5 ? 10 : wv <= 1 ? 5 : wv <= 1.5 ? -5 : -20;
    const kind = weatherInfo(h.weatherCode[i])?.kind;
    const weather = kind === 'storm' ? -30 : kind === 'rain' ? -5 : 0;
    const score = Math.max(0, Math.min(100, 5 + tide + light + moon + wind + waves + weather));
    return { i, at, score, parts: { tide, light, moon, wind, waves, weather } };
  });
}

/** A factor is one or more messages shown together, e.g. "Rising tide (strong flow)". */
export interface Factor { parts: Msg[]; effect: 'plus' | 'neutral' | 'minus' }

export interface FishingWindow {
  start: number; end: number; // local ms
  score: number; label: Key; tone: Tone;
  factors: Factor[];
}

function windowFactors(c: Conditions, hrs: FishingHour[]): Factor[] {
  const h = c.hourly;
  const idx = hrs.map((x) => x.i);
  const out: Factor[] = [];
  const tAvg = avg(hrs.map((x) => x.parts.tide)) ?? 0;
  const trend = tideTrend(h.seaLevel, idx[Math.floor(idx.length / 2)]);
  const flow: Key = tAvg >= 24 ? 'flow_strong' : tAvg >= 12 ? 'flow_moderate' : 'flow_weak';
  out.push({
    parts: trend === 'Rising' ? [{ k: 'f_rising' }, { k: flow }] : trend === 'Falling' ? [{ k: 'f_falling' }, { k: flow }] : [{ k: 'f_slack' }],
    effect: tAvg >= 20 ? 'plus' : tAvg >= 10 ? 'neutral' : 'minus',
  });
  const start = hrs[0].at, end = hrs[hrs.length - 1].at + 3600e3;
  const near = (list: string[]) => list.some((s) => { const t = toLocalMs(s); return t >= start - 90 * 60000 && t <= end + 90 * 60000; });
  if (near(c.daily.sunrise)) out.push({ parts: [{ k: 'f_sunrise' }], effect: 'plus' });
  else if (near(c.daily.sunset)) out.push({ parts: [{ k: 'f_sunset' }], effect: 'plus' });
  const moon = moonAt(start - c.utcOffsetSeconds * 1000);
  out.push({ parts: [{ k: moon.name }], effect: hrs[0].parts.moon >= 10 ? 'plus' : 'neutral' });
  const winds = vals(h.windSpeed, idx[0], idx[idx.length - 1] + 1);
  if (winds.length) {
    const lo = Math.round(min(winds)!), hi = Math.round(max(winds)!);
    out.push({ parts: [{ k: 'f_wind', v: { v: lo === hi ? lo : `${lo}–${hi}` } }], effect: hi <= 12 ? 'plus' : hi <= 18 ? 'neutral' : 'minus' });
  }
  const waves = vals(h.waveHeight, idx[0], idx[idx.length - 1] + 1);
  if (waves.length) {
    const wm = max(waves)!;
    out.push({ parts: [{ k: 'f_waves', v: { v: wm.toFixed(1) } }], effect: wm <= 0.5 ? 'plus' : wm <= 1 ? 'neutral' : 'minus' });
  }
  const kinds = idx.map((i) => weatherInfo(h.weatherCode[i])).filter(Boolean);
  const worst = kinds.find((k) => k!.kind === 'storm') || kinds.find((k) => k!.kind === 'rain') || kinds[0];
  if (worst) out.push({ parts: [{ k: worst.key }], effect: worst.kind === 'storm' || worst.kind === 'rain' ? 'minus' : 'neutral' });
  return out;
}

/** Best fishing windows for a local day ("YYYY-MM-DD"), at most 3 hours each. Past windows are dropped. */
export function fishingWindows(c: Conditions, hours: FishingHour[], day: string, nowMs: number, limit = 2): FishingWindow[] {
  const dayHours = hours.filter((x) => dayKey(x.at) === day);
  if (!dayHours.length) return [];
  const best = Math.max(...dayHours.map((x) => x.score));
  const threshold = Math.max(50, best - 12);
  const groups: FishingHour[][] = [];
  let cur: FishingHour[] = [];
  for (const x of dayHours) {
    if (x.score >= threshold) cur.push(x);
    else if (cur.length) { groups.push(cur); cur = []; }
  }
  if (cur.length) groups.push(cur);
  // A long run is less useful to plan around: keep its best 3-hour stretch.
  const MAX_HOURS = 3;
  const trimmed = groups.map((g) => {
    if (g.length <= MAX_HOURS) return g;
    let bestAt = 0, bestSum = -1;
    for (let k = 0; k + MAX_HOURS <= g.length; k++) {
      const sum = g.slice(k, k + MAX_HOURS).reduce((a, x) => a + x.score, 0);
      if (sum > bestSum) { bestSum = sum; bestAt = k; }
    }
    return g.slice(bestAt, bestAt + MAX_HOURS);
  });
  return trimmed
    .map((g) => {
      const score = Math.round(avg(g.map((x) => x.score))!);
      return { start: g[0].at, end: g[g.length - 1].at + 3600e3, score, label: fishingLabel(score), tone: fishingTone(score), factors: windowFactors(c, g) };
    })
    .filter((w) => w.end > nowMs)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .sort((a, b) => a.start - b.start);
}

export function dayKeys(c: Conditions): string[] {
  return Array.from(new Set(c.hourly.time.map((t) => t.slice(0, 10))));
}
