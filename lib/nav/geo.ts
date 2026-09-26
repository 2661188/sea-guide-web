// Small navigation maths. Distances in nautical miles, bearings in degrees true.
const R_NM = 3440.065; // mean Earth radius in NM
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface Fix { lat: number; lon: number }

export function distanceNm(a: Fix, b: Fix): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearing(a: Fix, b: Fix): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export const msToKn = (ms: number) => ms * 1.943844;
export const nmToM = (nm: number) => nm * 1852;

/** Degrees and decimal minutes, the format used on marine radios: 25°04.512′N */
export function ddm(v: number, pos: string, neg: string) {
  const a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60;
  return `${d}°${m.toFixed(3).padStart(6, '0')}′${v >= 0 ? pos : neg}`;
}
export const fmtLat = (lat: number) => ddm(lat, 'N', 'S');
export const fmtLon = (lon: number) => ddm(lon, 'E', 'W');

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export const fmtDist = (nm: number) => (nm < 0.1 ? `${Math.round(nmToM(nm))}` : nm.toFixed(nm < 10 ? 2 : 1));
export const distUnit = (nm: number) => (nm < 0.1 ? 'm' : 'NM');

/** Cross-track distance of p from the great circle a→b, NM. Positive = p is right of the track. */
export function crossTrackNm(a: Fix, b: Fix, p: Fix): number {
  const d13 = distanceNm(a, p) / R_NM;
  const t13 = rad(bearing(a, p)), t12 = rad(bearing(a, b));
  return Math.asin(Math.max(-1, Math.min(1, Math.sin(d13) * Math.sin(t13 - t12)))) * R_NM;
}

/** Distance travelled along a→b to the point abeam p, NM (negative = before a). */
export function alongTrackNm(a: Fix, b: Fix, p: Fix): number {
  const d13 = distanceNm(a, p) / R_NM;
  const xt = crossTrackNm(a, b, p) / R_NM;
  const at = Math.acos(Math.max(-1, Math.min(1, Math.cos(d13) / Math.cos(xt)))) * R_NM;
  return Math.cos(rad(bearing(a, p)) - rad(bearing(a, b))) < 0 ? -at : at;
}

/** Point reached from p after `nm` on bearing `brg`. */
export function destination(p: Fix, brg: number, nm: number): Fix {
  const d = nm / R_NM, t = rad(brg), f1 = rad(p.lat), l1 = rad(p.lon);
  const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
  const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
  return { lat: deg(f2), lon: ((deg(l2) + 540) % 360) - 180 };
}

export const pathNm = (pts: Fix[]) => pts.reduce((s, p, i) => (i ? s + distanceNm(pts[i - 1], p) : 0), 0);

/**
 * Read coordinates typed or pasted in the usual formats:
 * 25.0752, 55.1234 · 25°04.512'N 055°07.404'E · N25 04.512 E55 07.404 · 25°04'30.7"N 55°07'24.2"E
 */
export function parseCoords(input: string): Fix | null {
  const s = input.trim().toUpperCase().replace(/[′’']/g, "'").replace(/[″”"]/g, '"').replace(/,/g, ' ').replace(/\s+/g, ' ');
  const part = String.raw`([NSEW])?\s*(-?\d+(?:\.\d+)?)(?:\s*[°\s]\s*(\d+(?:\.\d+)?)\s*'?)?(?:\s*(\d+(?:\.\d+)?)\s*"?)?\s*([NSEW])?`;
  const m = s.match(new RegExp(`^${part}\\s+${part}$`));
  if (!m) return null;
  const val = (h1?: string, d?: string, mi?: string, se?: string, h2?: string) => {
    if (d == null) return null;
    let v = Math.abs(parseFloat(d)) + (mi ? parseFloat(mi) / 60 : 0) + (se ? parseFloat(se) / 3600 : 0);
    const h = h1 || h2;
    if (d.startsWith('-') || h === 'S' || h === 'W') v = -v;
    return { v, h };
  };
  const a = val(m[1], m[2], m[3], m[4], m[5]), b = val(m[6], m[7], m[8], m[9], m[10]);
  if (!a || !b) return null;
  let lat = a.v, lon = b.v;
  if (a.h === 'E' || a.h === 'W' || b.h === 'N' || b.h === 'S') { lat = b.v; lon = a.v; }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

/** Simplify a line (Douglas–Peucker) to at most roughly `tolNm` deviation. Used to turn a track into a route. */
export function simplify(pts: Fix[], tolNm: number): Fix[] {
  if (pts.length < 3) return pts.slice();
  let idx = -1, max = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(crossTrackNm(a, b, pts[i]));
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tolNm) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), tolNm).slice(0, -1), ...simplify(pts.slice(idx), tolNm)];
}
