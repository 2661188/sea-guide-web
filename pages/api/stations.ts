import type { NextApiRequest, NextApiResponse } from 'next';
import { REGIONS, DEFAULT_REGION } from '@/lib/regions';
import { fetchSeaLevels } from '@/lib/marine/providers/openMeteo';
import { mockSeaLevels } from '@/lib/marine/providers/mock';
import { findExtremes, hourIndex, tideTrend } from '@/lib/marine/tides';
import { dayKey, nowLocalMs } from '@/lib/marine/time';
import type { StationsResponse } from '@/lib/marine/types';

// Tide summary for every station in one provider call (the map screen).
// Cached at the edge for 15 minutes like /api/conditions.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const region = REGIONS[DEFAULT_REGION];
  try {
    const pts = region.spots.map((s) => ({ lat: s.lat, lon: s.lon }));
    const series = process.env.MARINE_MOCK ? mockSeaLevels(pts) : await fetchSeaLevels(pts, region.timezone);
    const offset = series[0]?.utcOffsetSeconds ?? 14400;
    const now = nowLocalMs(offset);
    const stations = region.spots.map((s, k) => {
      const { time, level } = series[k] ?? { time: [], level: [] };
      if (!time.length) return { id: s.id, level: null, trend: null, next: [], range: null, series: [] };
      const i = hourIndex(time, now);
      const ext = findExtremes(time, level);
      const today = ext.filter((e) => dayKey(e.at) === dayKey(now));
      const hi = today.filter((e) => e.type === 'high').map((e) => e.height);
      const lo = today.filter((e) => e.type === 'low').map((e) => e.height);
      return {
        id: s.id,
        level: level[i] ?? null,
        trend: tideTrend(level, i),
        next: ext.filter((e) => e.at > now).slice(0, 2),
        range: hi.length && lo.length ? Math.max(...hi) - Math.min(...lo) : null,
        series: level.slice(i, i + 25),
      };
    });
    const body: StationsResponse = { fetchedAt: new Date().toISOString(), utcOffsetSeconds: offset, nowLocal: now, stations };
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    res.status(200).json(body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: e instanceof Error ? e.message : 'Provider unavailable' });
  }
}
