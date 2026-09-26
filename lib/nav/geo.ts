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
