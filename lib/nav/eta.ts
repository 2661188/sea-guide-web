// Time to go and ETA — the ONE place these are calculated (screens and the voice
// assistant both read from here, so they can never disagree).
//
//   1 NM = 1852 m, 1 knot = 1 NM per hour
//   time to go (h) = remaining distance (NM) / meaningful speed (kn)
//   ETA            = now + time to go
//
// "Meaningful speed" means: a current GPS fix, moving at least MIN_ETA_KN, and
// (when a closing speed is supplied) actually getting closer to the target.
// Anything else returns a status instead of a misleading number such as "0 min".
import type { Position } from './gpsfilter';
import { MIN_COG_KN } from './gpsfilter';

export const MIN_ETA_KN = MIN_COG_KN; // below this the boat is treated as stationary
export const MIN_CLOSING_KN = 0.5; // closing slower than this = not getting closer
export const ARRIVED_NM = 0.02; // ≈ 37 m
export const MAX_ETA_H = 48; // beyond this the estimate is not useful

export type EtaStatus = 'ok' | 'nodest' | 'nofix' | 'lost' | 'stationary' | 'notclosing' | 'arrived' | 'toolong';

export interface EtaResult {
  status: EtaStatus;
  hours: number | null; // time to go
  etaMs: number | null; // arrival time (device clock, epoch ms)
  speedKn: number | null; // the speed used
}

export interface EtaInput {
  distNm: number | null | undefined; // remaining distance; null = no destination
  pos: Position | null; // current filtered fix
  lost?: boolean; // GPS signal lost (position is stale)
  closingKn?: number | null; // optional speed made good towards the target (VMG)
  arrivedNm?: number;
  now?: number;
}

export function timeToGo({ distNm, pos, lost = false, closingKn, arrivedNm = ARRIVED_NM, now = Date.now() }: EtaInput): EtaResult {
  const none = (status: EtaStatus, speedKn: number | null = null): EtaResult => ({ status, hours: null, etaMs: null, speedKn });
  if (distNm == null || !Number.isFinite(distNm)) return none('nodest');
  if (lost) return none('lost');
  if (!pos) return none('nofix');
  if (distNm <= arrivedNm) return none('arrived');
  const sog = pos.speedKn;
  if (sog == null || !Number.isFinite(sog) || sog < MIN_ETA_KN) return none('stationary', sog ?? null);
  let spd = sog;
  if (closingKn !== undefined) {
    if (closingKn == null || !Number.isFinite(closingKn) || closingKn < MIN_CLOSING_KN) return none('notclosing', sog);
    spd = closingKn;
  }
  const hours = distNm / spd;
  if (!Number.isFinite(hours) || hours > MAX_ETA_H) return none('toolong', spd);
  return { status: 'ok', hours, etaMs: now + hours * 3600e3, speedKn: spd };
}

/** Speed made good towards a bearing (knots); null without a reliable course. */
export function closingSpeed(pos: Position | null, bearingToTarget: number): number | null {
  if (!pos || pos.cog == null || pos.speedKn == null) return null;
  return pos.speedKn * Math.cos(((pos.cog - bearingToTarget) * Math.PI) / 180);
}

/** "<1 min", "24 min", "3 h 05" — never "0 min". */
export function fmtTtg(hours: number | null, u = { min: 'min', h: 'h', lt1: '<1 min' }): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return '—';
  const m = Math.round(hours * 60);
  if (m < 1) return u.lt1;
  return m < 60 ? `${m} ${u.min}` : `${Math.floor(m / 60)} ${u.h} ${String(m % 60).padStart(2, '0')}`;
}

/** Arrival clock time on the phone, 24 h. */
export function fmtClock(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Translation key explaining why there is no time estimate. */
export const etaStatusKey = (s: EtaStatus) => (`eta_${s}` as const);
