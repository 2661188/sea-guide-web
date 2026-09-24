// Tide + conditions helpers. Times are "YYYY-MM-DDTHH:mm" strings in UAE local time.
// Internally we convert them to "local minutes" (Date.UTC of the local wall-clock),
// so no browser timezone can shift them.

export interface TideExtreme {
  type: 'high' | 'low';
  at: number; // local-epoch ms
  height: number; // metres relative to mean sea level
}

export const toLocalMs = (s: string) =>
  Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16));

/** "Now" in UAE wall-clock, as local-epoch ms (UAE is UTC+4 all year). */
export const nowLocalMs = () => Date.now() + 4 * 3600 * 1000;

export const fmtTime = (ms: number) => new Date(ms).toISOString().slice(11, 16);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (ms: number) => {
  const d = new Date(ms);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Find high and low tides from hourly sea-level data.
 * Uses a parabola through the 3 points around each turning point to estimate
 * the time and height between the hourly samples.
 */
export function findExtremes(time: string[], level: (number | null)[]): TideExtreme[] {
  const out: TideExtreme[] = [];
  for (let i = 1; i < level.length - 1; i++) {
    const a = level[i - 1], b = level[i], c = level[i + 1];
    if (a == null || b == null || c == null) continue;
    const isHigh = b >= a && b > c;
    const isLow = b <= a && b < c;
    if (!isHigh && !isLow) continue;
    const denom = a - 2 * b + c;
    const offset = denom !== 0 ? (0.5 * (a - c)) / denom : 0; // hours, between -0.5 and 0.5
    const height = b - 0.25 * (a - c) * offset;
    out.push({
      type: isHigh ? 'high' : 'low',
      at: toLocalMs(time[i]) + Math.round(offset * 60) * 60 * 1000,
      height,
    });
  }
  return out;
}

/** Index of the hourly sample for the current hour. */
export function currentIndex(time: string[]): number {
  const now = nowLocalMs();
  let idx = 0;
  for (let i = 0; i < time.length; i++) {
    if (toLocalMs(time[i]) <= now) idx = i;
    else break;
  }
  return idx;
}

export const compass = (deg: number) =>
  ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) / 45)) % 8];

export interface Rating {
  label: string;
  tone: 'good' | 'ok' | 'caution' | 'bad';
}

export function seaState(windKn: number, gustKn: number, waveM: number): Rating {
  if (windKn > 20 || gustKn > 28 || waveM > 1.5) return { label: 'Rough — stay in port', tone: 'bad' };
  if (windKn > 15 || gustKn > 22 || waveM > 1.0) return { label: 'Choppy — take care', tone: 'caution' };
  if (windKn > 10 || waveM > 0.6) return { label: 'Moderate', tone: 'ok' };
  return { label: 'Calm — good to go', tone: 'good' };
}

/**
 * Fishing outlook (0–100). A simple rule of thumb, not a guarantee:
 * moving water, light wind, low swell, and dawn/dusk light score higher.
 */
export function fishingScore(opts: {
  windKn: number;
  waveM: number;
  tideRateMPerHr: number;
  minutesToSunEvent: number;
}): number {
  let s = 50;
  const { windKn, waveM, tideRateMPerHr, minutesToSunEvent } = opts;
  if (windKn <= 10) s += 15; else if (windKn <= 15) s += 5; else if (windKn > 20) s -= 25; else s -= 10;
  if (waveM <= 0.5) s += 10; else if (waveM <= 1) s += 0; else s -= 20;
  const rate = Math.abs(tideRateMPerHr);
  if (rate >= 0.12) s += 15; else if (rate >= 0.06) s += 8; else s -= 5;
  if (minutesToSunEvent <= 90) s += 10;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export const scoreLabel = (s: number) =>
  s >= 75 ? 'Excellent' : s >= 55 ? 'Good' : s >= 35 ? 'Fair' : 'Poor';
