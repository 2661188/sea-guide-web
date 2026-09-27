// GPS tracker. One instance for the whole app, so a trip keeps recording while
// the user switches screens. Works with no internet: GPS fixes come from the
// phone, every fix is filtered (jumps and noise rejected), and every recorded
// point is written straight to IndexedDB so a refresh or crash does not lose it.
import { useEffect, useState } from 'react';
import { load, save } from '@/lib/storage';
import { addPoint, allTrips, getTrip, newId, putTrip, tripPoints, Trip, TrackPoint } from './db';
import { bearing, distanceNm } from './geo';
import { filterFix, newFilter, Position, shouldRecord } from './gpsfilter';
import { isNative } from '@/lib/native/platform';
import { nativeKeepAwake, NativeFix, watchNative } from '@/lib/native/location';

export type { Position } from './gpsfilter';
export type GpsStatus = 'off' | 'searching' | 'ok' | 'weak' | 'lost' | 'denied' | 'unavailable' | 'unsupported';

export interface TrackerState {
  gps: GpsStatus;
  pos: Position | null;
  lastFixAt: number | null; // wall-clock time of the last accepted fix
  trip: Trip | null;
  track: [number, number][]; // [lon, lat] of recorded points
  returning: boolean;
  resumed: boolean;
  storageError: boolean; // IndexedDB write failed: trip is only in memory
  rejected: number; // fixes rejected by the filter (jumps / bad accuracy)
}

export const GOOD_ACC_M = 25; // better than this = "GPS active"
export const REC_ACC_M = 35; // fixes worse than this are shown, not recorded
const LOST_MS = 20e3; // no fix for this long = "signal lost"

let state: TrackerState = { gps: 'off', pos: null, lastFixAt: null, trip: null, track: [], returning: false, resumed: false, storageError: false, rejected: 0 };
const subs = new Set<(s: TrackerState) => void>();
let watchId: number | null = null;
// Android app: native watcher (foreground service while a trip / guidance / anchor alarm is on).
let nativeStop: (() => void) | null = null;
let nativeStarting = false;
let nativeBg = false;
let nativeToken = 0;
const gpsRunning = () => watchId != null || nativeStop != null || nativeStarting;
/** Keep GPS running with the screen off only when something is being recorded or watched. */
const wantBackground = () => !!state.trip || [...holds].some((k) => k !== 'captain');
let watchStarted = 0;
let lostTimer: ReturnType<typeof setInterval> | null = null;
let filter = newFilter();
let lastRec: TrackPoint | null = null;
let lastRecCourse: number | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;
let initDone = false;
const holds = new Set<string>(); // other features that need GPS on (route guidance, anchor alarm)

function emit(patch: Partial<TrackerState>) {
  state = { ...state, ...patch };
  subs.forEach((f) => f(state));
}

async function keepAwake(on: boolean) {
  if (isNative()) { nativeKeepAwake(on); return; }
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (on && nav.wakeLock && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await nav.wakeLock.request('screen');
      (wakeLock as unknown as EventTarget).addEventListener?.('release', () => { wakeLock = null; });
    }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* not supported or refused; tracking still works while the screen is on */ }
}

function storageFailed() { if (!state.storageError) emit({ storageError: true }); }

function onFix(p: GeolocationPosition) {
  const c = p.coords;
  handleFix({ lat: c.latitude, lon: c.longitude, acc: c.accuracy, t: p.timestamp || Date.now(), speed: c.speed, heading: c.heading });
}

function handleFix(raw: NativeFix) {
  const r = filterFix(filter, raw);
  if (!r.ok) {
    // Still hearing from the receiver, but this fix is not trustworthy.
    if (r.reason === 'accuracy') emit({ gps: 'weak', lastFixAt: state.lastFixAt, rejected: filter.rejected });
    else emit({ rejected: filter.rejected });
    return;
  }
  const pos = r.pos;
  emit({ pos, lastFixAt: Date.now(), gps: pos.acc > GOOD_ACC_M ? 'weak' : 'ok', rejected: filter.rejected });
  if (state.trip && pos.acc <= REC_ACC_M) record(pos);
}

function record(pos: Position) {
  const trip = state.trip!;
  if (!shouldRecord(lastRec, lastRecCourse, pos)) {
    if (!trip.start) { const next = { ...trip, start: { lat: pos.lat, lon: pos.lon } }; emit({ trip: next }); putTrip(next).catch(storageFailed); }
    return;
  }
  const pt: TrackPoint = { tripId: trip.id, t: pos.t, lat: pos.lat, lon: pos.lon, spd: pos.speedKn, acc: pos.acc };
  const add = lastRec ? distanceNm(lastRec, pos) : 0;
  if (lastRec) lastRecCourse = bearing(lastRec, pos);
  lastRec = pt;
  const next: Trip = {
    ...trip,
    start: trip.start ?? { lat: pos.lat, lon: pos.lon },
    end: { lat: pos.lat, lon: pos.lon },
    distanceNm: trip.distanceNm + add,
    maxKn: Math.max(trip.maxKn, pos.speedKn ?? 0),
    points: trip.points + 1,
  };
  emit({ trip: next, track: [...state.track, [pos.lon, pos.lat]] });
  addPoint(pt).catch(storageFailed);
  putTrip(next).catch(storageFailed);
}

function onError(e: GeolocationPositionError) {
  if (e.code === e.PERMISSION_DENIED) { emit({ gps: 'denied' }); stopWatch(); return; }
  if (state.pos) return; // keep last position; the lost-timer decides when to say "lost"
  emit({ gps: e.code === e.POSITION_UNAVAILABLE ? 'unavailable' : 'searching' });
}

function checkLost() {
  if (!gpsRunning()) return;
  const now = Date.now();
  if (state.lastFixAt && now - state.lastFixAt > LOST_MS) { if (state.gps !== 'lost') emit({ gps: 'lost' }); }
  else if (!state.lastFixAt && now - watchStarted > LOST_MS && state.gps === 'searching') emit({ gps: 'searching' });
}

export function startGps() {
  if (typeof window === 'undefined') return;
  if (gpsRunning()) return;
  if (!isNative() && !('geolocation' in navigator)) { emit({ gps: 'unsupported' }); return; }
  watchStarted = Date.now();
  emit({ gps: state.pos ? state.gps : 'searching' });
  if (isNative()) startNative();
  else watchId = navigator.geolocation.watchPosition(onFix, onError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
  if (!lostTimer) lostTimer = setInterval(checkLost, 3000);
}

function startNative() {
  const token = ++nativeToken;
  nativeStarting = true;
  nativeBg = wantBackground();
  const lang = load<string>('lang', 'en') === 'ar' ? 'ar' : 'en';
  watchNative(nativeBg, lang, (f) => { if (token === nativeToken) handleFix(f); }, (e) => {
    if (token !== nativeToken) return;
    if (e === 'denied') { emit({ gps: 'denied' }); stopWatch(); return; }
    if (!state.pos) emit({ gps: 'unavailable' });
  })
    .then((stop) => { if (token !== nativeToken) { stop(); return; } nativeStarting = false; nativeStop = stop; })
    .catch(() => { if (token !== nativeToken) return; nativeStarting = false; emit({ gps: 'unavailable' }); });
}

/** Android app: switch between "only while open" and "keep going with the screen off" when a trip starts or ends. */
function refreshNativeMode() {
  if (!isNative() || !gpsRunning() || wantBackground() === nativeBg) return;
  stopWatch();
  startGps();
}

function stopWatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  nativeToken++;
  nativeStarting = false;
  if (nativeStop) { nativeStop(); nativeStop = null; }
  if (lostTimer) { clearInterval(lostTimer); lostTimer = null; }
}

/** Stop GPS when nothing needs it (saves battery when leaving Navigate). */
export function releaseGps() {
  if (!state.trip && holds.size === 0) { stopWatch(); emit({ gps: 'off' }); }
}

/** Keep GPS (and the screen) on for a feature such as route guidance or the anchor alarm. */
export function holdGps(key: string, on: boolean) {
  if (on) { holds.add(key); startGps(); refreshNativeMode(); keepAwake(true); return; }
  holds.delete(key);
  refreshNativeMode();
  if (!state.trip && holds.size === 0) keepAwake(false);
}

export const getTracker = () => state;
export function subscribeTracker(fn: (s: TrackerState) => void) { subs.add(fn); return () => { subs.delete(fn); }; }

export async function startTrip(activity: string, name: string) {
  const good = state.pos && state.pos.acc <= REC_ACC_M && state.gps !== 'lost';
  const trip: Trip = {
    id: newId(), name, activity, status: 'active', startedAt: Date.now(), endedAt: null,
    start: good ? { lat: state.pos!.lat, lon: state.pos!.lon } : null,
    end: null, distanceNm: 0, maxKn: 0, points: 0,
  };
  lastRec = null; lastRecCourse = null;
  save('returning', false);
  emit({ trip, track: [], returning: false, resumed: false, storageError: false });
  await putTrip(trip).catch(storageFailed);
  if (good) record(state.pos!);
  startGps();
  refreshNativeMode();
  keepAwake(true);
}

export async function endTrip(): Promise<Trip | null> {
  const trip = state.trip;
  if (!trip) return null;
  const done: Trip = { ...trip, endedAt: Date.now(), status: 'saved' };
  await putTrip(done).catch(storageFailed);
  lastRec = null; lastRecCourse = null;
  save('returning', false);
  emit({ trip: null, track: [], returning: false });
  refreshNativeMode();
  if (holds.size === 0) keepAwake(false);
  return done;
}

export const setReturning = (on: boolean) => { save('returning', on); emit({ returning: on }); };

/** Resume a trip that was running when the app was closed, refreshed or crashed. */
async function init() {
  if (initDone || typeof window === 'undefined') return;
  initDone = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (state.trip || holds.size) keepAwake(true);
    // Some browsers silently stop a watch while hidden: restart it on return.
    if (watchId != null && !isNative()) { stopWatch(); startGps(); }
  });
  try {
    const active = (await allTrips()).find((t) => t.status === 'active');
    if (!active) return;
    const fresh = (await getTrip(active.id)) ?? active;
    const pts = await tripPoints(active.id);
    lastRec = pts[pts.length - 1] ?? null;
    lastRecCourse = pts.length > 1 ? bearing(pts[pts.length - 2], pts[pts.length - 1]) : null;
    emit({ trip: fresh, track: pts.map((p) => [p.lon, p.lat]), resumed: true, returning: load('returning', false) });
    startGps();
    refreshNativeMode();
    keepAwake(true);
  } catch { storageFailed(); }
}
export const initTracker = () => { init(); };

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
