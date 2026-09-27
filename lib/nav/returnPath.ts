// Return to start: follow the recorded track back to the starting point.
// Shared by the Navigate screen and the voice assistant (single source of truth).
import { bearing, distanceNm, Fix } from './geo';

export interface ReturnInfo {
  along: number; // NM back to the start following the recorded track
  direct: number; // NM in a straight line (information only)
  brgStart: number; // bearing to the start, degrees true
  steer: number; // bearing to a point ~0.08 NM back along the track
  path: [number, number][]; // [lon, lat] from the boat back to the start
}

export function returnInfo(pos: Fix | null, start: Fix | null, track: [number, number][]): ReturnInfo | null {
  if (!pos || !start) return null;
  const tr = track;
  let k = 0, best = tr.length ? Infinity : distanceNm(pos, start);
  tr.forEach(([lon, lat], i) => { const d = distanceNm(pos, { lat, lon }); if (d < best) { best = d; k = i; } });
  let along = best;
  for (let i = k; i > 0; i--) along += distanceNm({ lon: tr[i][0], lat: tr[i][1] }, { lon: tr[i - 1][0], lat: tr[i - 1][1] });
  if (tr.length) along += distanceNm({ lon: tr[0][0], lat: tr[0][1] }, start);
  let j = k, acc = best;
  while (j > 0 && acc < 0.08) { acc += distanceNm({ lon: tr[j][0], lat: tr[j][1] }, { lon: tr[j - 1][0], lat: tr[j - 1][1] }); j--; }
  const target = tr.length ? { lon: tr[j][0], lat: tr[j][1] } : start;
  const path: [number, number][] = [[pos.lon, pos.lat], ...tr.slice(0, k + 1).reverse(), [start.lon, start.lat]];
  return { along, direct: distanceNm(pos, start), brgStart: bearing(pos, start), steer: bearing(pos, target), path };
}
