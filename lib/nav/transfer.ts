// Import and export of waypoints, routes and tracks as GPX files.
import { addPoint, allRoutes, allTrips, allWaypoints, newId, notifyNavData, putRoute, putTrip, putWaypoint, tripPoints, Trip, WpKind } from './db';
import { downloadText, parseGpx, toGpx } from './gpx';
import { distanceNm } from './geo';

const KINDS: WpKind[] = ['mark', 'fish', 'dive', 'marina', 'ramp', 'anchor', 'fuel', 'hazard', 'fav', 'spot'];

export async function importGpxFile(file: File) {
  const data = parseGpx(await file.text());
  const now = Date.now();
  for (const w of data.waypoints) {
    await putWaypoint({
      id: newId(), name: w.name || 'WP', lat: w.lat, lon: w.lon, at: w.time ?? now, notes: w.notes,
      kind: KINDS.includes(w.kind as WpKind) ? (w.kind as WpKind) : 'mark',
    });
  }
  for (const r of data.routes) await putRoute({ id: newId(), name: r.name, points: r.points, createdAt: now, updatedAt: now });
  for (const tr of data.tracks) {
    const pts = tr.points;
    let dist = 0;
    for (let i = 1; i < pts.length; i++) dist += distanceNm(pts[i - 1], pts[i]);
    const trip: Trip = {
      id: newId(), name: tr.name, activity: 'boat', status: 'saved', startedAt: pts[0].t, endedAt: pts[pts.length - 1].t,
      start: { lat: pts[0].lat, lon: pts[0].lon }, end: { lat: pts[pts.length - 1].lat, lon: pts[pts.length - 1].lon },
      distanceNm: dist, maxKn: 0, points: pts.length,
    };
    await putTrip(trip);
    for (const p of pts) await addPoint({ tripId: trip.id, t: p.t, lat: p.lat, lon: p.lon, spd: null, acc: 0 });
  }
  notifyNavData();
  return { waypoints: data.waypoints.length, routes: data.routes.length, tracks: data.tracks.length };
}

export async function exportAllGpx() {
  const [waypoints, routes, trips] = await Promise.all([allWaypoints(), allRoutes(), allTrips()]);
  const tracks = await Promise.all(trips.filter((t) => t.status === 'saved').map(async (trip) => ({ trip, points: await tripPoints(trip.id) })));
  downloadText(`bahrna-${new Date().toISOString().slice(0, 10)}.gpx`, toGpx({ waypoints, routes, tracks }));
  return { waypoints: waypoints.length, routes: routes.length, tracks: tracks.length };
}
