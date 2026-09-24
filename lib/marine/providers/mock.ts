// DEVELOPMENT ONLY. Synthetic data for local testing when the real provider is
// unreachable. Enabled only when the MARINE_MOCK env var is set; never in production.
// MARINE_MOCK=1 → plausible data, MARINE_MOCK=error → provider failure,
// MARINE_MOCK=gaps → data with missing values.

import type { Conditions } from '../types';

export function mockConditions(spotId: string, mode: string): Conditions {
  if (mode === 'error') throw new Error('Mock provider failure');
  const offset = 4 * 3600;
  const start = new Date(Date.now() + offset * 1000);
  start.setUTCHours(0, 0, 0, 0);
  const time: string[] = [];
  for (let i = 0; i < 7 * 24; i++) time.push(new Date(start.getTime() + i * 3600e3).toISOString().slice(0, 16));
  const gaps = mode === 'gaps';
  const h = (fn: (i: number) => number) => time.map((_, i) => (gaps && i % 5 === 0 ? null : Math.round(fn(i) * 100) / 100));
  const date = Array.from({ length: 7 }, (_, d) => new Date(start.getTime() + d * 864e5).toISOString().slice(0, 10));
  return {
    spotId,
    fetchedAt: new Date().toISOString(),
    utcOffsetSeconds: offset,
    grid: { lat: 25.1, lon: 55.1 },
    source: { name: 'MOCK DATA (dev only)', url: 'https://open-meteo.com', models: 'synthetic' },
    hourly: {
      time,
      seaLevel: time.map((_, i) => 0.55 * Math.cos(((i - 11) / 12.42) * 2 * Math.PI) + 0.2 * Math.cos(((i - 4) / 24.8) * 2 * Math.PI)).map((v) => Math.round(v * 100) / 100),
      waveHeight: h((i) => 0.3 + 0.25 * Math.sin(i / 9) + (i > 100 && i < 130 ? 1.2 : 0)),
      waveDirection: h(() => 315),
      wavePeriod: h((i) => 3 + Math.sin(i / 10)),
      seaTemp: h(() => 33.6),
      windSpeed: h((i) => 8 + 6 * Math.sin((i - 8) / 3.8) + (i > 100 && i < 130 ? 14 : 0)),
      windDirection: h((i) => 290 + 40 * Math.sin(i / 12)),
      windGusts: h((i) => 12 + 7 * Math.sin((i - 8) / 3.8) + (i > 100 && i < 130 ? 16 : 0)),
      airTemp: h((i) => 32 + 4 * Math.sin(((i % 24) - 9) / 3.82)),
      humidity: h((i) => 60 + 20 * Math.cos(((i % 24) - 4) / 3.82)),
      visibility: h((i) => (i > 50 && i < 58 ? 1800 : 18000)),
      weatherCode: time.map((_, i) => (i > 110 && i < 116 ? 95 : i % 30 < 6 ? 2 : 0)),
      precipProb: h((i) => (i > 108 && i < 118 ? 60 : 0)),
    },
    daily: {
      date,
      sunrise: date.map((d) => `${d}T06:08`),
      sunset: date.map((d) => `${d}T18:13`),
    },
  };
}
