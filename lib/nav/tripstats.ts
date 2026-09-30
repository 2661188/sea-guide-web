// Trip analysis from the recorded GPS track: moving time, stops, average moving speed,
// fuel estimate and a plain-language summary. Pure functions — no UI, no network.
import type { TrackPoint, Trip } from './db';
import { distanceNm } from './geo';

export const STOP_KN = 1; // below this between two points = not moving
export const STOP_MIN_MS = 3 * 60e3; // stationary for at least this long = a stop
export const GAP_MS = 10 * 60e3; // no points for longer than this = recording gap (app closed, no GPS)

export interface Stop { start: number; end: number; lat: number; lon: number }
export interface TripAnalysis {
  movingMs: number;
  stoppedMs: number;
  gapMs: number;
  stops: Stop[];
  avgMovingKn: number | null;
  /** Estimated fuel for the moving time at the boat's cruise burn rate. Null when unknown. */
  fuelL: number | null;
}

export function analyseTrack(points: TrackPoint[], burnLph?: number | null): TripAnalysis {
  let movingMs = 0, stoppedMs = 0, gapMs = 0, movingNm = 0;
  const stops: Stop[] = [];
  let runStart: TrackPoint | null = null, runEnd: TrackPoint | null = null;
  const closeRun = () => {
    if (runStart && runEnd && runEnd.t - runStart.t >= STOP_MIN_MS) stops.push({ start: runStart.t, end: runEnd.t, lat: runStart.lat, lon: runStart.lon });
    runStart = runEnd = null;
  };
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k];
    const dt = b.t - a.t;
    if (dt <= 0) continue;
    if (dt > GAP_MS) { gapMs += dt; closeRun(); continue; }
    const d = distanceNm(a, b);
    const kn = d / (dt / 3600e3);
    if (kn >= STOP_KN) { movingMs += dt; movingNm += d; closeRun(); }
    else { stoppedMs += dt; if (!runStart) runStart = a; runEnd = b; }
  }
  closeRun();
  const avgMovingKn = movingMs > 60e3 ? movingNm / (movingMs / 3600e3) : null;
  const fuelL = burnLph && burnLph > 0 && movingMs > 0 ? burnLph * (movingMs / 3600e3) : null;
  return { movingMs, stoppedMs, gapMs, stops, avgMovingKn, fuelL };
}

export type TideStage = 'rising' | 'falling';

/**
 * One or two short sentences, e.g.
 * "You spent 4 h 12 min on the water and travelled 31.4 NM. You stopped 3 times (2 h 05 min), mostly on the rising tide."
 * `tideAt` returns the tide stage at a time when forecast data covers it.
 */
export function tripSummaryText(trip: Trip, an: TripAnalysis | null, lang: 'en' | 'ar', tideAt?: (ms: number) => TideStage | null): string {
  const dur = (trip.endedAt ?? Date.now()) - trip.startedAt;
  const hm = (ms: number) => {
    const m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60), r = m % 60;
    return lang === 'en' ? (h ? `${h} h ${String(r).padStart(2, '0')} min` : `${r} min`) : (h ? `${h} س ${String(r).padStart(2, '0')} د` : `${r} د`);
  };
  const dist = trip.distanceNm.toFixed(1);
  const parts: string[] = [];
  parts.push(lang === 'en' ? `You spent ${hm(dur)} on the water and travelled ${dist} NM.` : `قضيت ${hm(dur)} في البحر وقطعت ${dist} ميل بحري.`);
  if (an && an.stops.length) {
    const stopMs = an.stops.reduce((s, x) => s + (x.end - x.start), 0);
    let tide = '';
    if (tideAt) {
      let rise = 0, fall = 0;
      an.stops.forEach((x) => { const st = tideAt((x.start + x.end) / 2); if (st === 'rising') rise += x.end - x.start; if (st === 'falling') fall += x.end - x.start; });
      if (rise + fall > stopMs * 0.6) {
        const main = rise >= fall ? 'rising' : 'falling';
        tide = lang === 'en' ? `, mostly on the ${main} tide` : `، معظمها أثناء ${main === 'rising' ? 'ارتفاع' : 'انخفاض'} المد`;
      }
    }
    const n = an.stops.length;
    parts.push(lang === 'en'
      ? `You stopped ${n === 1 ? 'once' : `${n} times`} (${hm(stopMs)})${tide}.`
      : `توقفت ${n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتين' : `${n} مرات`} (${hm(stopMs)})${tide}.`);
  }
  if (an?.avgMovingKn) parts.push(lang === 'en' ? `Average moving speed ${an.avgMovingKn.toFixed(1)} kn.` : `متوسط السرعة أثناء الحركة ${an.avgMovingKn.toFixed(1)} عقدة.`);
  return parts.join(' ');
}
