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
}
export type WpKind = 'mark' | 'fish' | 'dive' | 'marina' | 'ramp' | 'anchor' | 'fuel' | 'hazard' | 'fav' | 'spot';
export interface Waypoint { id: string; name: string; kind: WpKind; lat: number; lon: number; at: number; notes?: string; depth?: number | null }
export interface RoutePoint { lat: number; lon: number; name?: string; wpId?: string }
export interface Route { id: string; name: string; points: RoutePoint[]; createdAt: number; updatedAt: number; notes?: string }

const DB = 'bahrna-nav';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('trips', { keyPath: 'id' });
        const pts = db.createObjectStore('points', { autoIncrement: true });
        pts.createIndex('trip', 'tripId');
        db.createObjectStore('waypoints', { keyPath: 'id' });
      }
      if (e.oldVersion < 2) db.createObjectStore('routes', { keyPath: 'id' });
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

/** Tell open screens that saved waypoints/routes/trips changed (e.g. after an import). */
export function notifyNavData() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('bahrna:navdata')); }
export function onNavData(fn: () => void) {
  window.addEventListener('bahrna:navdata', fn);
  return () => window.removeEventListener('bahrna:navdata', fn);
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
