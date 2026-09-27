// GPS fix filtering. Pure functions so they can be tested without a device.
// Goal: never record impossible movement (jumps, spikes), never show a misleading
// course when stationary, and still accept a genuine relocation (e.g. after the
// app was paused for a while) once several fixes agree on it.
import { bearing, distanceNm, msToKn } from './geo';

export interface RawFix { lat: number; lon: number; acc: number; t: number; speed: number | null; heading: number | null }
export interface Position { lat: number; lon: number; acc: number; t: number; speedKn: number | null; cog: number | null }

export const MAX_KN = 60; // faster than any leisure boat → treat as a GPS jump
export const MAX_ACC_M = 200; // fixes worse than this are ignored for position
export const MIN_COG_KN = 1.5; // below this, course over ground is noise

export interface FilterState { last: Position | null; pending: RawFix[]; ema: number | null; rejected: number }
export const newFilter = (): FilterState => ({ last: null, pending: [], ema: null, rejected: 0 });

export type FilterResult = { ok: true; pos: Position } | { ok: false; reason: 'accuracy' | 'time' | 'jump' };

function impliedKn(a: { lat: number; lon: number; t: number }, b: { lat: number; lon: number; t: number }) {
  const dt = (b.t - a.t) / 3600e3;
  return dt > 0 ? distanceNm(a, b) / dt : Infinity;
}

export function filterFix(st: FilterState, f: RawFix): FilterResult {
  if (!Number.isFinite(f.lat) || !Number.isFinite(f.lon) || !Number.isFinite(f.acc) || f.acc > MAX_ACC_M) {
    st.rejected++;
    return { ok: false, reason: 'accuracy' };
  }
  const last = st.last;
  if (last && f.t <= last.t) return { ok: false, reason: 'time' };

  if (last) {
    const dm = distanceNm(last, f) * 1852;
    const noise = f.acc + last.acc;
    const kn = impliedKn(last, f);
    if (dm > noise && kn > MAX_KN) {
      // Possible jump. Accept only if the next fixes agree with each other (a real relocation).
      st.pending.push(f);
      if (st.pending.length > 3) st.pending.shift();
      const p = st.pending;
      const consistent = p.length >= 3 && p.every((q, i) => i === 0 || impliedKn(p[i - 1], q) <= MAX_KN || distanceNm(p[i - 1], q) * 1852 <= q.acc + p[i - 1].acc);
      if (!consistent) { st.rejected++; return { ok: false, reason: 'jump' }; }
      st.pending = [];
      st.ema = null; // speed history no longer valid
      st.last = null;
      return filterFix(st, f); // treat as a fresh start at the new place
    }
  }
  st.pending = [];

  // Speed: prefer the receiver's Doppler speed; otherwise derive from movement beyond noise.
  let sp: number | null = null;
  if (f.speed != null && Number.isFinite(f.speed) && f.speed >= 0 && msToKn(f.speed) <= MAX_KN) sp = msToKn(f.speed);
  else if (last) {
    const dt = (f.t - last.t) / 1000;
    const dm = distanceNm(last, f) * 1852;
    if (dt >= 0.5) sp = dm > Math.max(f.acc, 5) ? Math.min(MAX_KN, (dm / 1852) / (dt / 3600)) : 0;
  }
  if (sp != null) st.ema = st.ema == null ? sp : st.ema * 0.5 + sp * 0.5;
  const speedKn = st.ema == null ? null : st.ema < 0.3 ? 0 : st.ema;

  // Course over ground: only when actually moving.
  let cog: number | null = null;
  if (speedKn != null && speedKn >= MIN_COG_KN) {
    if (f.heading != null && Number.isFinite(f.heading) && f.heading >= 0) cog = f.heading;
    else if (last && distanceNm(last, f) * 1852 > Math.max(8, f.acc)) cog = bearing(last, f);
    else cog = last?.cog ?? null;
  }
  const pos: Position = { lat: f.lat, lon: f.lon, acc: f.acc, t: f.t, speedKn, cog };
  st.last = pos;
  return { ok: true, pos };
}

// ---------- Track sampling ----------
export interface Sample { lat: number; lon: number; t: number }
/** Should this accepted fix be written to the track? Balances detail, battery and storage. */
export function shouldRecord(lastRec: Sample | null, lastCourse: number | null, pos: Position): boolean {
  if (!lastRec) return true;
  const dm = distanceNm(lastRec, pos) * 1852;
  const gap = pos.t - lastRec.t;
  const mps = ((pos.speedKn ?? 0) * 1852) / 3600;
  const minDist = Math.min(60, Math.max(10, mps * 4)); // ~every 4 s of travel, 10–60 m
  if (dm < Math.max(4, pos.acc * 0.5)) return false; // inside the noise: nothing new
  if (dm >= minDist) return true;
  if (lastCourse != null && pos.cog != null && dm >= 10) {
    const turn = Math.abs(((pos.cog - lastCourse + 540) % 360) - 180);
    if (turn >= 20) return true; // keep corners
  }
  return gap >= 30e3 && dm >= 5; // slow drift: at least every 30 s
}
