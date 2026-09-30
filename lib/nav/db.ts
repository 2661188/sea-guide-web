// On-device storage for trips, GPS points and saved places (IndexedDB).
// Nothing here needs the internet; tracks are never sent to a server.

export interface TrackPoint { tripId: string; t: number; lat: number; lon: number; spd: number | null; acc: number }
export interface Trip {
  id: string;
  name: string;
  activity: string;
  status: 'active' | 'saved';
  startedAt: number;
  endedAt: number | null;
  start: { lat: number; lon: number } | null;
  end: { lat: number; lon: number } | null;
  distanceNm: number;
  maxKn: number;
  points: number;
  // v0.11 (optional; older trips don't have them)
  notes?: string;
  conditions?: TripConditions | null; // forecast snapshot when the trip started
  fuelStartL?: number | null; // fuel on board at start (user-entered level), if tracked
  fuelUsedL?: number | null; // estimate saved at the end
}
/** What the forecast said at the start of a trip (Open-Meteo model data, not measurements). */
export interface TripConditions {
  windKn: number | null; gustKn: number | null; windDir: number | null; waveM: number | null;
  airC: number | null; tide: 'rising' | 'falling' | 'slack' | null; source: string; fetchedAt: string;
}
/** A catch in the private logbook. Location precision is chosen by the user. */
export interface Catch {
  id: string;
  at: number;
  species: string;
  count: number;
  weightKg: number | null;
  lengthCm: number | null;
  bait: string;
  technique: string;
  depthM: number | null;
  notes: string;
  privacy: 'exact' | 'area' | 'hidden';
  lat: number | null; // exact, or rounded to ~5 km for 'area', null for 'hidden'
  lon: number | null;
  photo: Blob | null;
  tripId: string | null;
  conditions: TripConditions | null;
  released: boolean;
}
export type WpKind = 'mark' | 'home' | 'fish' | 'dive' | 'marina' | 'ramp' | 'anchor' | 'fuel' | 'hazard' | 'fav' | 'spot';
export interface Waypoint { id: string; name: string; kind: WpKind; lat: number; lon: number; at: number; notes?: string; depth?: number | null }
export interface RoutePoint { lat: number; lon: number; name?: string; wpId?: string }
export interface Route { id: string; name: string; points: RoutePoint[]; createdAt: number; updatedAt: number; notes?: string }

/** A planned trip (made by the voice assistant or by hand). Stored as data, never just as chat text. */
export interface PlanChecklistItem { id: string; en: string; ar: string; done: boolean }
export interface PlanConditions {
  level: string | null; // sea-state level key (lvl_*), null when data is missing
  windMaxKn: number | null; gustMaxKn: number | null; waveMaxM: number | null;
  tide: { type: 'high' | 'low'; at: number; height: number }[];
  fishingScore: number | null;
  source: string; fetchedAt: string;
}
export interface TripPlan {
  id: string;
  name: string;
  activity: string;
  date: string; // local YYYY-MM-DD
  departure: string; // local HH:MM
  durationH: number;
  start: { lat: number; lon: number; label: string };
  destination: { lat: number; lon: number; name: string; wpId?: string } | null;
  waypoints: RoutePoint[];
  distanceNm: number | null; // round trip, when a destination is known
  fuelL: number | null; // estimate for the running distance at cruise speed
  fuelCarryL: number | null; // with one third in reserve
  fuelPerHourL: number | null;
  conditions: PlanConditions | null; // null = no forecast available for that time
  checklist: PlanChecklistItem[];
  notes: string;
  createdBy: 'ai' | 'user';
  modified: boolean; // changed by the user after creation
  createdAt: number;
  updatedAt: number;
}

const DB = 'bahrna-nav';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 4);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('trips', { keyPath: 'id' });
        const pts = db.createObjectStore('points', { autoIncrement: true });
        pts.createIndex('trip', 'tripId');
        db.createObjectStore('waypoints', { keyPath: 'id' });
      }
      if (e.oldVersion < 2) db.createObjectStore('routes', { keyPath: 'id' });
      if (e.oldVersion < 3) db.createObjectStore('plans', { keyPath: 'id' });
      if (e.oldVersion < 4) db.createObjectStore('catches', { keyPath: 'id' });
    };
    req.onblocked = () => { /* another tab has the old version open; it will close on reload */ };
    req.onsuccess = () => { const db = req.result; db.onversionchange = () => { db.close(); dbp = null; }; resolve(db); };
    req.onerror = () => { dbp = null; reject(req.error); };
  });
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r ? (r.result as T) : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const putTrip = (trip: Trip) => tx<void>('trips', 'readwrite', (s) => { s.put(trip); });
export const getTrip = (id: string) => tx<Trip | undefined>('trips', 'readonly', (s) => s.get(id));
export const allTrips = () => tx<Trip[]>('trips', 'readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => b.startedAt - a.startedAt));
export const addPoint = (p: TrackPoint) => tx<void>('points', 'readwrite', (s) => { s.add(p); });
export const tripPoints = (tripId: string) => tx<TrackPoint[]>('points', 'readonly', (s) => s.index('trip').getAll(tripId)).then((l) => l.sort((a, b) => a.t - b.t));

export async function deleteTrip(id: string) {
  await tx<void>('trips', 'readwrite', (s) => { s.delete(id); });
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction('points', 'readwrite');
    const idx = t.objectStore('points').index('trip');
    const cur = idx.openKeyCursor(IDBKeyRange.only(id));
    cur.onsuccess = () => { const c = cur.result; if (c) { t.objectStore('points').delete(c.primaryKey); c.continue(); } };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export const putWaypoint = (w: Waypoint) => tx<void>('waypoints', 'readwrite', (s) => { s.put(w); });
export const allWaypoints = () => tx<Waypoint[]>('waypoints', 'readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => b.at - a.at));
export const deleteWaypoint = (id: string) => tx<void>('waypoints', 'readwrite', (s) => { s.delete(id); });

export const putRoute = (r: Route) => tx<void>('routes', 'readwrite', (s) => { s.put(r); });
export const getRoute = (id: string) => tx<Route | undefined>('routes', 'readonly', (s) => s.get(id));
export const allRoutes = () => tx<Route[]>('routes', 'readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => b.updatedAt - a.updatedAt));
export const deleteRoute = (id: string) => tx<void>('routes', 'readwrite', (s) => { s.delete(id); });

export const putPlan = (p: TripPlan) => tx<void>('plans', 'readwrite', (s) => { s.put(p); });
export const allPlans = () => tx<TripPlan[]>('plans', 'readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => `${a.date}${a.departure}`.localeCompare(`${b.date}${b.departure}`)));
export const deletePlan = (id: string) => tx<void>('plans', 'readwrite', (s) => { s.delete(id); });

export const putCatch = (c: Catch) => tx<void>('catches', 'readwrite', (st) => { st.put(c); });
export const allCatches = () => tx<Catch[]>('catches', 'readonly', (st) => st.getAll()).then((l) => l.sort((a, b) => b.at - a.at));
export const deleteCatch = (id: string) => tx<void>('catches', 'readwrite', (st) => { st.delete(id); });

/** Tell open screens that saved waypoints/routes/trips changed (e.g. after an import). */
export function notifyNavData() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('bahrna:navdata')); }
export function onNavData(fn: () => void) {
  window.addEventListener('bahrna:navdata', fn);
  return () => window.removeEventListener('bahrna:navdata', fn);
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
