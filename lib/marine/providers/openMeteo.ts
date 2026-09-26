// Open-Meteo provider (server-side only — called from /api/conditions).
// Marine API: tide (sea level), waves, sea temperature.
// Forecast API: wind, gusts, air temperature, humidity, visibility, weather, sunrise/sunset.
// Free tier: no key, but non-commercial use only (see README).

import type { Conditions, Num } from '../types';

const MARINE = 'https://marine-api.open-meteo.com/v1/marine';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const DAYS = 7;

async function getJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Bahrna/0.5 (marine companion)' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.reason || `Provider returned ${res.status}`);
  return data;
}

/** Re-index a forecast series onto the marine time axis (they normally match 1:1). */
function align(targetTimes: string[], srcTimes: string[], values: Num[] | undefined): Num[] {
  if (!values) return targetTimes.map(() => null);
  if (srcTimes.length === targetTimes.length && srcTimes[0] === targetTimes[0]) return values;
  const map = new Map(srcTimes.map((t, i) => [t, values[i]]));
  return targetTimes.map((t) => map.get(t) ?? null);
}

export async function fetchOpenMeteo(spotId: string, lat: number, lon: number, timezone: string): Promise<Conditions> {
  const tz = encodeURIComponent(timezone);
  const marineUrl =
    `${MARINE}?latitude=${lat}&longitude=${lon}&timezone=${tz}&forecast_days=${DAYS}` +
    `&hourly=sea_level_height_msl,wave_height,wave_direction,wave_period,sea_surface_temperature`;
  const forecastUrl =
    `${FORECAST}?latitude=${lat}&longitude=${lon}&timezone=${tz}&forecast_days=${DAYS}&wind_speed_unit=kn` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m,visibility,weather_code,precipitation_probability,uv_index` +
    `&daily=sunrise,sunset`;

  const [m, f] = await Promise.all([getJson(marineUrl), getJson(forecastUrl)]);
  const time: string[] = m.hourly?.time ?? [];
  if (!time.length) throw new Error('No marine data for this location');
  const ft: string[] = f.hourly?.time ?? [];

  return {
    spotId,
    fetchedAt: new Date().toISOString(),
    utcOffsetSeconds: m.utc_offset_seconds ?? f.utc_offset_seconds ?? 0,
    grid: { lat: m.latitude, lon: m.longitude },
    source: {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com',
      models: 'Marine (waves, sea level, SST) + Forecast (wind, weather)',
    },
    hourly: {
      time,
      seaLevel: m.hourly.sea_level_height_msl ?? time.map(() => null),
      waveHeight: m.hourly.wave_height ?? time.map(() => null),
      waveDirection: m.hourly.wave_direction ?? time.map(() => null),
      wavePeriod: m.hourly.wave_period ?? time.map(() => null),
      seaTemp: m.hourly.sea_surface_temperature ?? time.map(() => null),
      windSpeed: align(time, ft, f.hourly?.wind_speed_10m),
      windDirection: align(time, ft, f.hourly?.wind_direction_10m),
      windGusts: align(time, ft, f.hourly?.wind_gusts_10m),
      airTemp: align(time, ft, f.hourly?.temperature_2m),
      humidity: align(time, ft, f.hourly?.relative_humidity_2m),
      visibility: align(time, ft, f.hourly?.visibility),
      weatherCode: align(time, ft, f.hourly?.weather_code),
      precipProb: align(time, ft, f.hourly?.precipitation_probability),
      uv: align(time, ft, f.hourly?.uv_index),
    },
    daily: {
      date: f.daily?.time ?? [],
      sunrise: f.daily?.sunrise ?? [],
      sunset: f.daily?.sunset ?? [],
    },
  };
}

/** Sea level for many points in one request (tide stations map). */
export async function fetchSeaLevels(points: { lat: number; lon: number }[], timezone: string) {
  const lat = points.map((p) => p.lat).join(','), lon = points.map((p) => p.lon).join(',');
  const url = `${MARINE}?latitude=${lat}&longitude=${lon}&timezone=${encodeURIComponent(timezone)}&forecast_days=3&hourly=sea_level_height_msl`;
  const data = await getJson(url);
  const list = Array.isArray(data) ? data : [data];
  return list.map((d: { utc_offset_seconds?: number; hourly?: { time?: string[]; sea_level_height_msl?: Num[] } }) => ({
    utcOffsetSeconds: d.utc_offset_seconds ?? 0,
    time: d.hourly?.time ?? [],
    level: d.hourly?.sea_level_height_msl ?? [],
  }));
}
