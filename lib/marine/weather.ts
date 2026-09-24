// WMO weather interpretation codes (used by Open-Meteo).
import type { Key } from '../i18n/strings';

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow';

export function weatherInfo(code: number | null | undefined): { key: Key; kind: WeatherKind } | null {
  if (code == null) return null;
  if (code === 0) return { key: 'wx_clear', kind: 'clear' };
  if (code === 1) return { key: 'wx_mostly', kind: 'partly' };
  if (code === 2) return { key: 'wx_partly', kind: 'partly' };
  if (code === 3) return { key: 'wx_overcast', kind: 'cloudy' };
  if (code === 45 || code === 48) return { key: 'wx_fog', kind: 'fog' };
  if (code >= 51 && code <= 57) return { key: 'wx_drizzle', kind: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { key: 'wx_rain', kind: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { key: 'wx_snow', kind: 'snow' };
  if (code >= 95) return { key: 'wx_storm', kind: 'storm' };
  return { key: 'wx_unknown', kind: 'cloudy' };
}

/** Compass key for a bearing (translate with t()); null when unknown. */
export const compassKey = (deg: number | null | undefined): Key | null =>
  deg == null ? null : (['dir_N', 'dir_NE', 'dir_E', 'dir_SE', 'dir_S', 'dir_SW', 'dir_W', 'dir_NW'] as const)[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
