/**
 * Baharna data service — Open-Meteo (free, no API key).
 * Marine API: sea level (tide), waves, sea surface temperature.
 * Forecast API: wind (knots), sunrise / sunset.
 * All times are returned in Asia/Dubai local time (UTC+4, no DST).
 */

const MARINE = 'https://marine-api.open-meteo.com/v1/marine';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const TZ = 'Asia%2FDubai';

export interface MarineData {
  time: string[];
  seaLevel: number[];
  waveHeight: number[];
  waveDirection: number[];
  seaTemp: number[];
  windSpeed: number[];
  windDirection: number[];
  windGusts: number[];
  sunrise: string[];
  sunset: string[];
}

async function getJson(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.reason || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchMarineData(lat: number, lon: number): Promise<MarineData> {
  const marineUrl =
    `${MARINE}?latitude=${lat}&longitude=${lon}` +
    `&hourly=sea_level_height_msl,wave_height,wave_direction,sea_surface_temperature` +
    `&timezone=${TZ}&forecast_days=7`;
  const weatherUrl =
    `${FORECAST}?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn` +
    `&daily=sunrise,sunset&timezone=${TZ}&forecast_days=7`;

  const [m, w] = await Promise.all([getJson(marineUrl), getJson(weatherUrl)]);

  return {
    time: m.hourly.time,
    seaLevel: m.hourly.sea_level_height_msl,
    waveHeight: m.hourly.wave_height,
    waveDirection: m.hourly.wave_direction,
    seaTemp: m.hourly.sea_surface_temperature,
    windSpeed: w.hourly.wind_speed_10m,
    windDirection: w.hourly.wind_direction_10m,
    windGusts: w.hourly.wind_gusts_10m,
    sunrise: w.daily.sunrise,
    sunset: w.daily.sunset,
  };
}
