// Application tools the assistant can use. Read tools return facts from the app;
// action tools never run directly — they return a proposal that the user must
// confirm, and only executeAction() (called after "Yes") changes anything.
import { allTrips, allWaypoints, newId, notifyNavData, putPlan, putWaypoint, tripPoints, Trip, TripPlan, Waypoint, WpKind } from '@/lib/nav/db';
import { distanceNm, bearing } from '@/lib/nav/geo';
import { endTrip, getTracker, setReturning, startTrip } from '@/lib/nav/tracker';
import { goTo, getGuide } from '@/lib/nav/guide';
import { timeToGo, closingSpeed, EtaResult } from '@/lib/nav/eta';
import { load } from '@/lib/storage';
import { fishingHours, fishingWindows } from '@/lib/marine/assess';
import { nowLocalMs, dayKey } from '@/lib/marine/time';
import { buildContext, currentSpot, savedConditions } from './context';
import { planTrip, PlanRequest } from './planner';

export type Action =
  | { type: 'returnStart' }
  | { type: 'navigateTo'; target: { lat: number; lon: number; name: string; wpId?: string } }
  | { type: 'saveWaypoint'; name: string; kind: WpKind; lat: number; lon: number }
  | { type: 'startTrip' }
  | { type: 'endTrip' }
  | { type: 'savePlan'; plan: TripPlan };

// ---------- read tools ----------
export const getCurrentPosition = () => { const n = buildContext().nav; return { hasFix: n.hasFix, pos: n.pos, accuracyM: n.accuracyM, lastFixAgeS: n.lastFixAgeS, gps: n.gps }; };
export const getGPSStatus = () => { const n = buildContext().nav; return { gps: n.gps, accuracyM: n.accuracyM, lastFixAgeS: n.lastFixAgeS }; };
export const getNavigation = () => buildContext().nav;
export const getBoatProfile = () => buildContext().boat;
export const getCurrentMarineConditions = () => buildContext().marine;
export const getActiveTrip = () => buildContext().nav.trip;

export async function getWaypoints(): Promise<Waypoint[]> { try { return await allWaypoints(); } catch { return []; } }
export async function getTrips(): Promise<Trip[]> { try { return (await allTrips()).filter((t) => t.status === 'saved'); } catch { return []; } }

/** Trips that started on a given local day offset (−1 = yesterday), or the latest trip. */
export async function getTripHistory(dayOffset: number | null) {
  const trips = await getTrips();
  if (dayOffset == null) return trips.slice(0, 1);
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + dayOffset);
  const from = d.getTime(), to = from + 86400e3;
  return trips.filter((t) => t.startedAt >= from && t.startedAt < to);
}
export async function waypointsDuring(t: Trip) {
  const wps = await getWaypoints();
  return wps.filter((w) => w.at >= t.startedAt && w.at <= (t.endedAt ?? Date.now())).length;
}
export const tripPointsCount = (id: string) => tripPoints(id).then((p) => p.length).catch(() => 0);

/** Find a saved waypoint by type ("fishing spot") or name; nearest to the boat first. */
export async function findWaypoint(q: { kind?: string; name?: string }): Promise<Waypoint | null> {
  const wps = await getWaypoints();
  const pos = getTracker().pos;
  const byDist = (l: Waypoint[]) => (pos ? [...l].sort((a, b) => distanceNm(pos, a) - distanceNm(pos, b)) : l);
  if (q.kind) { const l = byDist(wps.filter((w) => w.kind === q.kind)); if (l.length) return l[0]; }
  if (q.name) {
    const n = q.name.toLowerCase().replace(/^(the|my)\s+/, '').trim();
    const hit = byDist(wps.filter((w) => w.name.toLowerCase().includes(n) || n.includes(w.name.toLowerCase())));
    if (hit.length) return hit[0];
  }
  return null;
}

/** Distance, bearing and time to any point, straight from the navigation engine. */
export function toPoint(p: { lat: number; lon: number }): { distNm: number; bearing: number; eta: EtaResult } | null {
  const s = getTracker();
  if (!s.pos) return null;
  const lost = s.gps === 'lost';
  const brg = bearing(s.pos, p);
  const d = distanceNm(s.pos, p);
  return { distNm: d, bearing: brg, eta: timeToGo({ distNm: d, pos: s.pos, lost, closingKn: closingSpeed(s.pos, brg) }) };
}

export function getFishingConditions(dayOffset = 0) {
  const c = savedConditions();
  if (!c) return null;
  const now = nowLocalMs(c.utcOffsetSeconds);
  const day = dayKey(now + dayOffset * 86400e3);
  const hours = fishingHours(c);
  const cur = dayOffset === 0 ? hours.find((h) => h.at <= now && h.at + 3600e3 > now) ?? null : null;
  return { windows: fishingWindows(c, hours, day, now, 2), nowScore: cur?.score ?? null, fetchedAt: c.fetchedAt, utcOffsetSeconds: c.utcOffsetSeconds };
}

export async function createTripPlan(req: PlanRequest & { destinationName?: string }) {
  const s = getTracker();
  const { spot } = currentSpot();
  let dest = req.destination ?? null;
  if (!dest && req.destinationName) dest = await findWaypoint({ name: req.destinationName });
  if (!dest && req.activity === 'fishing') dest = await findWaypoint({ kind: 'fish' });
  const home = await findWaypoint({ kind: 'home' });
  const from = home ? { lat: home.lat, lon: home.lon, label: home.name }
    : s.pos && s.gps !== 'lost' ? { lat: s.pos.lat, lon: s.pos.lon, label: 'Current position' }
    : { lat: spot.lat, lon: spot.lon, label: spot.name };
  return planTrip({ ...req, destination: dest }, savedConditions(), buildContext().boat, from);
}

// ---------- actions (only after the user says yes) ----------
export async function executeAction(a: Action): Promise<{ ok: boolean; trip?: Trip | null; waypoint?: Waypoint }> {
  switch (a.type) {
    case 'returnStart': {
      if (!getTracker().trip?.start) return { ok: false };
      setReturning(true);
      return { ok: true };
    }
    case 'navigateTo': {
      goTo({ lat: a.target.lat, lon: a.target.lon, name: a.target.name, wpId: a.target.wpId });
      return { ok: true };
    }
    case 'saveWaypoint': {
      const w: Waypoint = { id: newId(), name: a.name, kind: a.kind, lat: a.lat, lon: a.lon, at: Date.now(), notes: load<string>('lang', 'en') === 'ar' ? 'أضيفت بالصوت' : 'Added by voice' };
      await putWaypoint(w);
      notifyNavData();
      return { ok: true, waypoint: w };
    }
    case 'startTrip': {
      if (getTracker().trip) return { ok: false };
      await startTrip(load<string>('activity', 'boating') || 'boating', `Trip ${new Date().toLocaleDateString('en-GB')}`);
      return { ok: true };
    }
    case 'endTrip': {
      const t = await endTrip();
      notifyNavData();
      return { ok: !!t, trip: t };
    }
    case 'savePlan': {
      await putPlan(a.plan);
      notifyNavData();
      return { ok: true };
    }
  }
}

export const guideActive = () => getGuide().active;
