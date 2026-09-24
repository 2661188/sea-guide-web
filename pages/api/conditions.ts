import type { NextApiRequest, NextApiResponse } from 'next';
import { findSpot } from '@/lib/regions';
import { fetchOpenMeteo } from '@/lib/marine/providers/openMeteo';
import { mockConditions } from '@/lib/marine/providers/mock';

// One request per spot from the browser; this route fans out to the provider and
// Vercel's CDN caches the merged result for 15 minutes, so thousands of users
// viewing Dubai cost roughly 2 provider calls per 15 minutes.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const found = findSpot(String(req.query.spot || ''));
  if (!found) {
    res.status(400).json({ error: 'Unknown spot' });
    return;
  }
  const { spot, region } = found;
  try {
    const mock = process.env.MARINE_MOCK;
    const data = mock
      ? mockConditions(spot.id, mock)
      : await fetchOpenMeteo(spot.id, spot.lat, spot.lon, region.timezone);
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: e instanceof Error ? e.message : 'Provider unavailable' });
  }
}
