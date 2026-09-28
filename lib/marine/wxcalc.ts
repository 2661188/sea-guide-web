// Plain-language classes for the weather board (wind force, visibility, humidity,
// pressure trend, air quality, UV) and per-day summaries. Pure functions, no UI.
// Thresholds follow published scales: Beaufort (knots), US EPA AQI, WHO UV index.
import type { Conditions, Num } from './types';
import { dayKey, toLocalMs } from './time';

export type Tone = 'good' | 'ok' | 'caution' | 'bad' | 'severe' | 'none';

// ---- Wind: Beaufort force from knots ----
const BF_MAX_KN = [0, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63]; // upper limit of each force, whole knots
export function beaufort(kn: number | null | undefined): number | null {
  if (kn == null || !Number.isFinite(kn)) return null;
  const r = Math.round(kn);
  const i = BF_MAX_KN.findIndex((m) => r <= m);
  return i === -1 ? 12 : i;
}
export const bfTone = (f: number | null): Tone => (f == null ? 'none' : f <= 3 ? 'good' : f === 4 ? 'ok' : f === 5 ? 'caution' : f <= 7 ? 'bad' : 'severe');
export const knToKmh = (kn: number) => kn * 1.852;

// ---- Visibility (metres) ----
export type VisClass = 'excellent' | 'good' | 'moderate' | 'poor' | 'fog';
export function visClass(m: number | null | undefined): VisClass | null {
  if (m == null || !Number.isFinite(m)) return null;
  if (m >= 10000) return 'excellent';
  if (m >= 5000) return 'good';
  if (m >= 2000) return 'moderate';
  if (m >= 1000) return 'poor';
  return 'fog';
}
export const visTone: Record<VisClass, Tone> = { excellent: 'good', good: 'good', moderate: 'caution', poor: 'bad', fog: 'severe' };
/** Visibility as km and nautical miles, capped at the model's useful range. */
export function visText(m: number) {
  const km = m / 1000, nm = m / 1852;
  const f = (v: number) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1));
  return { km: f(Math.min(km, 50)), nm: f(Math.min(nm, 27)) };
}

// ---- Humidity / dew point comfort (°C) ----
export type DewClass = 'dry' | 'comfortable' | 'humid' | 'very_humid' | 'oppressive';
export function dewClass(dp: number | null | undefined): DewClass | null {
  if (dp == null || !Number.isFinite(dp)) return null;
  if (dp < 10) return 'dry';
  if (dp < 16) return 'comfortable';
  if (dp < 21) return 'humid';
  if (dp < 24) return 'very_humid';
  return 'oppressive';
}
export const dewTone: Record<DewClass, Tone> = { dry: 'ok', comfortable: 'good', humid: 'ok', very_humid: 'caution', oppressive: 'bad' };
/** Magnus approximation, used only when the provider did not send a dew point. */
export function dewPointFrom(tC: number, rh: number) {
  const a = 17.62, b = 243.12, g = Math.log(Math.max(1, rh) / 100) + (a * tC) / (b + tC);
  return (b * g) / (a - g);
}

// ---- Pressure trend over the last 3 hours (hPa) ----
export type PressTrend = 'rising_fast' | 'rising' | 'steady' | 'falling' | 'falling_fast';
export function pressureTrend(series: Num[] | undefined, i: number): { trend: PressTrend; change: number } | null {
  if (!series) return null;
  const now = series[i], before = i >= 3 ? series[i - 3] : null;
  if (now == null) return null;
  // Before the first 3 hours of the series, look ahead instead (sign kept as "change to").
  const ref = before ?? (series[i + 3] != null ? now - (series[i + 3]! - now) : null);
  if (ref == null) return null;
  const change = now - ref;
  const trend: PressTrend = change >= 3 ? 'rising_fast' : change >= 1 ? 'rising' : change <= -3 ? 'falling_fast' : change <= -1 ? 'falling' : 'steady';
  return { trend, change };
}
export const pressTone: Record<PressTrend, Tone> = { rising_fast: 'ok', rising: 'good', steady: 'good', falling: 'caution', falling_fast: 'bad' };

// ---- Air quality: US EPA AQI ----
export type AqiClass = 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
export function aqiClass(v: number | null | undefined): AqiClass | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v <= 50) return 'good';
  if (v <= 100) return 'moderate';
  if (v <= 150) return 'sensitive';
  if (v <= 200) return 'unhealthy';
  if (v <= 300) return 'very_unhealthy';
  return 'hazardous';
}
export const AQI_COLOR: Record<AqiClass, string> = {
  good: '#0E9F6E', moderate: '#D99A0B', sensitive: '#FF6B35', unhealthy: '#D64545', very_unhealthy: '#7C3AED', hazardous: '#7F1D1D',
};
/** Dust above this (µg/m³) is worth mentioning at sea: haze and lower visibility. */
export const DUSTY = 100;

// ---- UV index ----
export type UvClass = 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
export function uvClass(v: number | null | undefined): UvClass | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v < 3) return 'low';
  if (v < 6) return 'moderate';
  if (v < 8) return 'high';
  if (v < 11) return 'very_high';
  return 'extreme';
}
export const UV_COLOR: Record<UvClass, string> = { low: '#0E9F6E', moderate: '#D99A0B', high: '#FF6B35', very_high: '#D64545', extreme: '#7C3AED' };

// ---- Temperature unit ----
export type TempUnit = 'C' | 'F';
export const toUnit = (c: number, u: TempUnit) => (u === 'F' ? c * 9 / 5 + 32 : c);
export const fmtTemp = (c: number | null | undefined, u: TempUnit) => (c == null || !Number.isFinite(c) ? '—' : `${Math.round(toUnit(c, u))}`);

// ---- Per-day summary ----
export interface DaySummary {
  date: string; // YYYY-MM-DD (local)
  ms: number; // local midnight
  hi: number | null;
  lo: number | null;
  code: number | null;
  uvMax: number | null;
  /** Hourly indices belonging to this day. */
  idx: number[];
}

/** Worst weather code of the daylight hours (what you would plan around). */
function dayCode(codes: Num[], idx: number[], time: string[]) {
  const day = idx.filter((k) => { const h = +time[k].slice(11, 13); return h >= 6 && h <= 18; });
  const pick = (day.length ? day : idx).map((k) => codes[k]).filter((c): c is number => c != null);
  if (!pick.length) return null;
  // Rain/storm/fog outrank cloud; otherwise the most common code.
  const severe = pick.filter((c) => c >= 45).sort((a, b) => b - a)[0];
  if (severe != null) return severe;
  const count = new Map<number, number>();
  pick.forEach((c) => count.set(c, (count.get(c) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

export function daySummaries(data: Conditions): DaySummary[] {
  const h = data.hourly, d = data.daily;
  const byDay = new Map<string, number[]>();
  h.time.forEach((t, k) => { const key = t.slice(0, 10); if (!byDay.has(key)) byDay.set(key, []); byDay.get(key)!.push(k); });
  return [...byDay.entries()].map(([date, idx]) => {
    const j = d.date.indexOf(date);
    const temps = idx.map((k) => h.airTemp[k]).filter((v): v is number => v != null);
    const uvs = idx.map((k) => h.uv?.[k]).filter((v): v is number => v != null);
    return {
      date, ms: toLocalMs(`${date}T00:00`), idx,
      hi: d.tMax?.[j] ?? (temps.length ? Math.max(...temps) : null),
      lo: d.tMin?.[j] ?? (temps.length ? Math.min(...temps) : null),
      code: d.code?.[j] ?? dayCode(h.weatherCode, idx, h.time),
      uvMax: d.uvMax?.[j] ?? (uvs.length ? Math.max(...uvs) : null),
    };
  }).filter((s) => s.idx.length >= 12); // skip a partial last day
}

/** Hour of the day's highest UV (local ms), for "peak at 12:00". */
export function uvPeak(data: Conditions, nowMs: number): number | null {
  const today = dayKey(nowMs);
  let best = -1, at: number | null = null;
  data.hourly.time.forEach((t, k) => {
    if (t.slice(0, 10) !== today) return;
    const v = data.hourly.uv?.[k];
    if (v != null && v > best) { best = v; at = toLocalMs(t); }
  });
  return best > 0 ? at : null;
}
