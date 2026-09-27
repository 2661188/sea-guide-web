// AI context engine: one snapshot of what the app knows right now, built from the
// navigation engine, the boat profile, the saved forecast and the trip store.
// The assistant only ever READS these values; it never calculates its own.
import { load } from '@/lib/storage';
import { defaultSpot, findSpot } from '@/lib/regions';
import type { Conditions } from '@/lib/marine/types';
import { findExtremes, hourIndex, tideTrend } from '@/lib/marine/tides';
import { nowLocalMs, toLocalMs } from '@/lib/marine/time';
import { weatherInfo } from '@/lib/marine/weather';
import { getTracker } from '@/lib/nav/tracker';
import { computeGuidance, getGuide, anchorDriftM } from '@/lib/nav/guide';
import { getNav } from '@/lib/nav/settings';
import { returnInfo } from '@/lib/nav/returnPath';
import { EtaResult, timeToGo } from '@/lib/nav/eta';
import { MIN_COG_KN } from '@/lib/nav/gpsfilter';

export interface NavContext {
  gps: string; // off | searching | ok | weak | lost | denied | unavailable | unsupported
  hasFix: boolean; // a current (not lost) position
  pos: { lat: number; lon: number } | null;
  accuracyM: number | null;
  lastFixAgeS: number | null;
  speedKn: number | null;
  moving: boolean;
  cogDeg: number | null; // course over ground from GPS (not compass heading)
  trip: { active: boolean; name: string; startedAt: number; distanceNm: number; maxKn: number; points: number; start: { lat: number; lon: number } | null } | null;
  returning: boolean;
  toStart: { alongNm: number; directNm: number; bearing: number; eta: EtaResult } | null;
  guide: { kind: 'goto' | 'route'; name: string; target: string; dtwNm: number; bearing: number; eta: EtaResult; remainingNm: number; etaEnd: EtaResult; arrived: boolean } | null;
  anchor: { radiusM: number; driftM: number | null } | null;
}
export interface BoatContext { name: string; type: string; lengthFt: number | null; cruiseKn: number; burnLph: number | null; tankL: number | null }
export interface MarineContext {
  available: boolean;
  spot: { id: string; name: string; ar: string; lat: number; lon: number };
  fetchedAt: string | null;
  ageMin: number | null;
  source: string;
  now: {
    windKn: number | null; windFromDeg: number | null; gustKn: number | null;
    waveM: number | null; wavePeriodS: number | null; seaTempC: number | null; airTempC: number | null;
    weatherKey: string | null; tideTrend: string | null;
    nextTides: { type: 'high' | 'low'; at: number; height: number }[];
  } | null;
}
export interface AiContext { nav: NavContext; boat: BoatContext; marine: MarineContext; at: number }

export function currentSpot() {
  const id = load<string>('spot', '');
  return findSpot(id) ?? defaultSpot();
}

/** The saved forecast for the chosen spot, if it still covers the current hour. */
export function savedConditions(): Conditions | null {
  const { spot } = currentSpot();
  const c = load<Conditions | null>(`cond:${spot.id}`, null);
  if (!c?.hourly?.time?.length) return null;
  const last = toLocalMs(c.hourly.time[c.hourly.time.length - 1]);
  return last > nowLocalMs(c.utcOffsetSeconds) ? c : null;
}

export function navContext(): NavContext {
  const s = getTracker();
  const g = getGuide();
  const lost = s.gps === 'lost';
  const pos = s.pos;
  const hasFix = !!pos && !lost;
  const moving = hasFix && (pos!.speedKn ?? 0) >= MIN_COG_KN && pos!.cog != null;
  const start = s.trip?.start ?? null;
  const ret = returnInfo(pos, start, s.track);
  const gd = g.active && pos ? computeGuidance(g.active, pos, lost) : null;
  return {
    gps: s.gps,
    hasFix,
    pos: pos ? { lat: pos.lat, lon: pos.lon } : null,
    accuracyM: pos ? Math.round(pos.acc) : null,
    lastFixAgeS: s.lastFixAt ? Math.round((Date.now() - s.lastFixAt) / 1000) : null,
    speedKn: hasFix ? pos!.speedKn : null,
    moving,
    cogDeg: moving ? pos!.cog : null,
    trip: s.trip ? { active: true, name: s.trip.name, startedAt: s.trip.startedAt, distanceNm: s.trip.distanceNm, maxKn: s.trip.maxKn, points: s.trip.points, start } : null,
    returning: s.returning,
    toStart: ret ? { alongNm: ret.along, directNm: ret.direct, bearing: ret.brgStart, eta: timeToGo({ distNm: ret.along, pos, lost }) } : null,
    guide: g.active && gd ? {
      kind: g.active.kind, name: g.active.name, target: gd.target.name || '', dtwNm: gd.dtw, bearing: gd.btw,
      eta: gd.eta, remainingNm: gd.remaining, etaEnd: gd.etaEnd, arrived: g.active.arrived,
    } : null,
    anchor: g.anchor ? { radiusM: g.anchor.radiusM, driftM: pos ? anchorDriftM(g.anchor, pos) : null } : null,
  };
}

export function boatContext(): BoatContext {
  const n = getNav();
  return { name: n.boatName, type: n.boatType, lengthFt: n.lengthFt, cruiseKn: n.cruiseKn, burnLph: n.burnLph, tankL: n.tankL };
}

export function marineContext(): MarineContext {
  const { spot } = currentSpot();
  const c = savedConditions();
  const base = { spot: { id: spot.id, name: spot.name, ar: spot.ar, lat: spot.lat, lon: spot.lon }, source: 'Open-Meteo' };
  if (!c) return { ...base, available: false, fetchedAt: null, ageMin: null, now: null };
  const now = nowLocalMs(c.utcOffsetSeconds);
  const i = hourIndex(c.hourly.time, now);
  const h = c.hourly;
  return {
    ...base,
    available: true,
    fetchedAt: c.fetchedAt,
    ageMin: Math.round((Date.now() - Date.parse(c.fetchedAt)) / 60000),
    now: {
      windKn: h.windSpeed[i], windFromDeg: h.windDirection[i], gustKn: h.windGusts[i],
      waveM: h.waveHeight[i], wavePeriodS: h.wavePeriod[i], seaTempC: h.seaTemp[i], airTempC: h.airTemp[i],
      weatherKey: weatherInfo(h.weatherCode[i])?.key ?? null,
      tideTrend: tideTrend(h.seaLevel, i),
      nextTides: findExtremes(h.time, h.seaLevel).filter((e) => e.at > now).slice(0, 2)
        .map((e) => ({ type: e.type, at: e.at - c.utcOffsetSeconds * 1000, height: e.height })), // → real epoch ms
    },
  };
}

export function buildContext(): AiContext {
  return { nav: navContext(), boat: boatContext(), marine: marineContext(), at: Date.now() };
}

/** Compact, relevant-only JSON for the language model (no track points, no history dumps). */
export function contextForModel(ctx: AiContext) {
  const r = (v: number | null | undefined, d = 1) => (v == null ? null : Number(v.toFixed(d)));
  const eta = (e: EtaResult) => (e.status === 'ok' ? { status: 'ok', timeToGoMin: Math.round(e.hours! * 60), etaLocal: new Date(e.etaMs!).toTimeString().slice(0, 5) } : { status: e.status });
  const n = ctx.nav;
  return {
    nav: {
      gps: n.gps, hasFix: n.hasFix, accuracyM: n.accuracyM, lastFixAgeS: n.lastFixAgeS,
      position: n.pos ? { lat: r(n.pos.lat, 5), lon: r(n.pos.lon, 5) } : null,
      speedKn: r(n.speedKn), moving: n.moving, cogDeg: n.cogDeg == null ? null : Math.round(n.cogDeg),
      trip: n.trip ? { active: true, distanceNm: r(n.trip.distanceNm, 2), maxKn: r(n.trip.maxKn), startedMinAgo: Math.round((ctx.at - n.trip.startedAt) / 60000), hasStartPoint: !!n.trip.start } : null,
      returning: n.returning,
      toStart: n.toStart ? { alongTrackNm: r(n.toStart.alongNm, 2), directNm: r(n.toStart.directNm, 2), bearingDeg: Math.round(n.toStart.bearing), ...eta(n.toStart.eta) } : null,
      guidance: n.guide ? { kind: n.guide.kind, target: n.guide.target || n.guide.name, distanceNm: r(n.guide.dtwNm, 2), bearingDeg: Math.round(n.guide.bearing), arrived: n.guide.arrived, ...eta(n.guide.eta) } : null,
      anchor: n.anchor ? { radiusM: n.anchor.radiusM, driftM: n.anchor.driftM == null ? null : Math.round(n.anchor.driftM) } : null,
    },
    boat: ctx.boat,
    marine: ctx.marine.available ? { spot: ctx.marine.spot.name, dataAgeMin: ctx.marine.ageMin, source: ctx.marine.source, now: ctx.marine.now } : { available: false },
  };
}
