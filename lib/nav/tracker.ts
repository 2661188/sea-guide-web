// GPS tracker. One instance for the whole app, so a trip keeps recording while
// the user switches screens. Works with no internet: GPS fixes come from the
// phone, and every recorded point is written straight to IndexedDB.
import { useEffect, useState } from 'react';
import { addPoint, allTrips, getTrip, newId, putTrip, tripPoints, Trip, TrackPoint } from './db';
import { bearing, distanceNm, msToKn } from './geo';

export type GpsStatus = 'off' | 'searching' | 'ok' | 'weak' | 'denied' | 'unavailable' | 'unsupported';

export interface Position { lat: number; lon: number; acc: number; t: number; speedKn: number | null; cog: number | null }

export interface TrackerState {
  gps: GpsStatus;
  pos: Position | null;
  trip: Trip | null;
  track: [number, number][]; // [lon, lat] of recorded points
  returning: boolean;
  resumed: boolean;
}

const MIN_MOVE_NM = 8 / 1852; // ignore jitter under ~8 m
const MAX_GAP_MS = 30e3; // but record at least every 30 s while moving
const MAX_ACC_M = 50; // fixes worse than this are shown, not recorded

let state: TrackerState = { gps: 'off', pos: null, trip: null, track: [], returning: false, resumed: false };
const subs = new Set<(s: TrackerState) => void>();
let watchId: number | null = null;
let lastRec: TrackPoint | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;
let initDone = false;

function emit(patch: Partial<TrackerState>) {
  state = { ...state, ...patch };
  subs.forEach((f) => f(state));
}

async function keepAwake(on: boolean) {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (on && nav.wakeLock && !wakeLock && document.visibilityState === 'visible') wakeLock = await nav.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* not supported or refused; tracking still works while the screen is on */ }
}

function onFix(p: GeolocationPosition) {
  const { latitude: lat, longitude: lon, accuracy: acc, speed, heading } = p.coords;
  const prev = state.pos;
  let speedKn = speed != null && !Number.isNaN(speed) ? msToKn(speed) : null;
  if (speedKn == null && prev) {
    const dt = (p.timestamp - prev.t) / 3600e3;
    if (dt > 0) speedKn = distanceNm(prev, { lat, lon }) / dt;
  }
  let cog = heading != null && !Number.isNaN(heading) && (speedKn ?? 0) > 0.8 ? heading : null;
  if (cog == null && prev && distanceNm(prev, { lat, lon }) > MIN_MOVE_NM) cog = bearing(prev, { lat, lon });
  if (cog == null && prev?.cog != null && (speedKn ?? 0) > 0.8) cog = prev.cog;
  const pos: Position = { lat, lon, acc, t: p.timestamp, speedKn, cog };
  emit({ pos, gps: acc > MAX_ACC_M ? 'weak' : 'ok' });
  if (state.trip && acc <= MAX_ACC_M) record(pos);
}

function record(pos: Position) {
  const trip = state.trip!;
  const moved = lastRec ? distanceNm(lastRec, pos) : Infinity;
  const gap = lastRec ? pos.t - lastRec.t : Infinity;
  if (lastRec && moved < MIN_MOVE_NM && gap < MAX_GAP_MS) return;
  if (lastRec && moved < MIN_MOVE_NM / 2) return; // stationary: nothing new to draw
  const pt: TrackPoint = { tripId: trip.id, t: pos.t, lat: pos.lat, lon: pos.lon, spd: pos.speedKn, acc: pos.acc };
  const add = lastRec ? moved : 0;
  lastRec = pt;
  const next: Trip = {
    ...trip,
    start: trip.start ?? { lat: pos.lat, lon: pos.lon },
    end: { lat: pos.lat, lon: pos.lon },
    distanceNm: trip.distanceNm + (Number.isFinite(add) ? add : 0),
    maxKn: Math.max(trip.maxKn, pos.speedKn != null && pos.speedKn < 80 ? pos.speedKn : 0),
    points: trip.points + 1,
  };
  emit({ trip: next, track: [...state.track, [pos.lon, pos.lat]] });
  addPoint(pt).catch(() => { /* storage full: keep going in memory */ });
  putTrip(next).catch(() => {});
}

function onError(e: GeolocationPositionError) {
  if (e.code === e.PERMISSION_DENIED) { emit({ gps: 'denied' }); stopWatch(); return; }
  emit({ gps: state.pos ? 'weak' : e.code === e.POSITION_UNAVAILABLE ? 'unavailable' : 'searching' });
}

export function startGps() {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { emit({ gps: 'unsupported' }); return; }
  if (watchId != null) return;
  emit({ gps: state.pos ? state.gps : 'searching' });
  watchId = navigator.geolocation.watchPosition(onFix, onError, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}

function stopWatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** Stop GPS when no trip is running (saves battery when leaving Navigate). */
export function releaseGps() {
  if (!state.trip) { stopWatch(); emit({ gps: 'off' }); }
}

export async function startTrip(activity: string, name: string) {
  const trip: Trip = {
    id: newId(), name, activity, status: 'active', startedAt: Date.now(), endedAt: null,
    start: state.pos && state.pos.acc <= MAX_ACC_M ? { lat: state.pos.lat, lon: state.pos.lon } : null,
    end: null, distanceNm: 0, maxKn: 0, points: 0,
  };
  lastRec = null;
  emit({ trip, track: [], returning: false, resumed: false });
  await putTrip(trip).catch(() => {});
  if (state.pos && state.pos.acc <= MAX_ACC_M) record(state.pos);
  startGps();
  keepAwake(true);
}

export async function endTrip(): Promise<Trip | null> {
  const trip = state.trip;
  if (!trip) return null;
  const done: Trip = { ...trip, endedAt: Date.now(), status: 'saved' };
  await putTrip(done).catch(() => {});
  lastRec = null;
  emit({ trip: null, track: [], returning: false });
  keepAwake(false);
  return done;
}

export const setReturning = (on: boolean) => emit({ returning: on });

/** Resume a trip that was running when the app was closed or the phone restarted. */
async function init() {
  if (initDone || typeof window === 'undefined') return;
  initDone = true;
  document.addEventListener('visibilitychange', () => { if (state.trip) keepAwake(document.visibilityState === 'visible'); });
  try {
    const active = (await allTrips()).find((t) => t.status === 'active');
    if (!active) return;
    const fresh = await getTrip(active.id);
    const pts = await tripPoints(active.id);
    lastRec = pts[pts.length - 1] ?? null;
    emit({ trip: fresh ?? active, track: pts.map((p) => [p.lon, p.lat]), resumed: true });
    startGps();
    keepAwake(true);
  } catch { /* IndexedDB unavailable (private mode) */ }
}

export function useTracker(): TrackerState {
  const [s, setS] = useState(state);
  useEffect(() => {
    init();
    subs.add(setS);
    setS(state);
    return () => { subs.delete(setS); };
  }, []);
  return s;
}
