// "Coming up" — plain-language changes in the next hours from the forecast model.
// Wording is deliberately descriptive ("wind rising to 18 kn around 15:00"), never
// "safe" / "unsafe": it is model data, not a guarantee.
import type { Msg } from '@/lib/i18n/LangContext';
import type { Conditions } from './types';

const hhmm = (s: string) => s.slice(11, 16);

export function outlook(c: Conditions, i: number, hours = 12): Msg[] {
  const h = c.hourly, out: Msg[] = [];
  const end = Math.min(h.time.length - 1, i + hours);
  const w0 = h.windSpeed[i];
  const first = (pred: (k: number) => boolean) => { for (let k = i + 1; k <= end; k++) if (pred(k)) return k; return -1; };
  const maxOf = (arr: (number | null)[], from: number) => { let m = -1, at = -1; for (let k = from; k <= end; k++) { const v = arr[k]; if (v != null && v > m) { m = v; at = k; } } return { m, at }; };

  if (w0 != null) {
    if (w0 < 15) {
      const k = first((k) => (h.windSpeed[k] ?? 0) >= 15);
      if (k >= 0) { const { m } = maxOf(h.windSpeed, k); out.push({ k: m >= 20 ? 'ol_wind_strong' : 'ol_wind_up', v: { kn: Math.round(m), t: hhmm(h.time[k]) } }); }
    } else {
      const k = first((k) => h.windSpeed[k] != null && h.windSpeed[k]! < 10);
      out.push(k >= 0 ? { k: 'ol_wind_down', v: { t: hhmm(h.time[k]) } } : { k: 'ol_wind_stays', v: { kn: Math.round(w0) } });
    }
  }
  const g = maxOf(h.windGusts, i);
  if (g.m >= 25) out.push({ k: 'ol_gusts', v: { kn: Math.round(g.m), t: hhmm(h.time[g.at]) } });
  const wv0 = h.waveHeight[i];
  const wv = maxOf(h.waveHeight, i + 1);
  if (wv.m >= 1.2 && (wv0 == null || wv.m - wv0 >= 0.3)) out.push({ k: 'ol_waves_up', v: { m: wv.m.toFixed(1), t: hhmm(h.time[wv.at]) } });
  const fog = first((k) => h.visibility[k] != null && h.visibility[k]! < 2000);
  if (fog >= 0 && (h.visibility[i] ?? 99999) >= 2000) out.push({ k: 'ol_vis', v: { t: hhmm(h.time[fog]) } });
  const storm = first((k) => (h.weatherCode[k] ?? 0) >= 95);
  if (storm >= 0) out.push({ k: 'ol_storm', v: { t: hhmm(h.time[storm]) } });
  else { const rain = first((k) => (h.precipProb[k] ?? 0) >= 50); if (rain >= 0) out.push({ k: 'ol_rain', v: { t: hhmm(h.time[rain]) } }); }
  const p = h.pressure;
  if (p && p[i] != null && p[Math.min(end, i + 6)] != null && p[Math.min(end, i + 6)]! - p[i]! <= -3) out.push({ k: 'ol_pressure' });
  if (!out.length || (out.length === 1 && out[0].k === 'ol_wind_stays')) out.push({ k: 'ol_steady', v: { h: hours } });
  return out;
}
