// Route guidance: Go-to a waypoint or follow a route leg by leg, plus the anchor alarm.
// Runs on every GPS fix from the tracker, so it keeps working while you switch screens.
import { useEffect, useState } from 'react';
import { load, save } from '@/lib/storage';
import type { RoutePoint } from './db';
import { alongTrackNm, bearing, crossTrackNm, distanceNm, Fix, nmToM } from './geo';
import { getNav } from './settings';
import { getTracker, holdGps, Position, subscribeTracker } from './tracker';

export interface Active {
  kind: 'goto' | 'route';
  name: string;
  routeId?: string;
  pts: RoutePoint[]; // for goto: [where you were when you pressed Go, target]
  leg: number; // index in pts of the point you are heading to
  startedAt: number;
  arrived: boolean; // reached the final point
}
export interface Anchor { lat: number; lon: number; radiusM: number; setAt: number }
export type AlarmType = 'arrive' | 'end' | 'xte' | 'anchor';
export interface Alarm { type: AlarmType; name?: string; at: number }
export interface GuideState { active: Active | null; anchor: Anchor | null; alarm: Alarm | null }

let state: GuideState = { active: null, anchor: null, alarm: null };
let loaded = false;
let xteAck = false;
let anchorSnoozeUntil = 0;
const subs = new Set<(s: GuideState) => void>();

function persist() { save('guide', { active: state.active, anchor: state.anchor }); }
function emit(patch: Partial<GuideState>) {
  state = { ...state, ...patch };
  if ('active' in patch || 'anchor' in patch) persist();
  subs.forEach((f) => f(state));
  syncGps();
  syncBeeper();
}
function syncGps() {
  holdGps('guide', !!state.active && !state.active.arrived);
  holdGps('anchor', !!state.anchor);
}

// ---------- Alarm sound + vibration ----------
let ctx: AudioContext | null = null;
let beepTimer: ReturnType<typeof setInterval> | null = null;
/** Call from a tap so the browser allows sound later. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    ctx?.resume();
  } catch { /* no audio */ }
}
function beep(urgent: boolean) {
  try { navigator.vibrate?.(urgent ? [400, 150, 400, 150, 400] : [250, 120, 250]); } catch { /* ignore */ }
  if (!ctx || !getNav().sound) return;
  const tones = urgent ? [1400, 900, 1400, 900] : [880, 1320];
  tones.forEach((f, i) => {
    const o = ctx!.createOscillator(), g = ctx!.createGain();
    o.type = 'square'; o.frequency.value = f;
    const t0 = ctx!.currentTime + i * 0.22;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    o.connect(g).connect(ctx!.destination); o.start(t0); o.stop(t0 + 0.2);
  });
}
function syncBeeper() {
  const a = state.alarm;
  if (!a) { if (beepTimer) clearInterval(beepTimer); beepTimer = null; return; }
  if (beepTimer) return;
  const urgent = a.type === 'anchor' || a.type === 'xte';
  beep(urgent);
  // Arrival beeps a few times; safety alarms repeat until acknowledged.
  let n = 0;
  beepTimer = setInterval(() => {
    n++;
    if (!urgent && n >= 2) { clearInterval(beepTimer!); beepTimer = null; return; }
    beep(urgent);
  }, urgent ? 2500 : 3000);
}

// ---------- Guidance maths ----------
export interface Guidance {
  target: RoutePoint;
  from: RoutePoint | null;
  dtw: number; // NM to the next point
  btw: number; // bearing to it, degrees true
  xte: number | null; // NM, + = you are right of the line (steer left)
  ttg: number | null; // hours to the next point at current speed
  remaining: number; // NM to the end of the route through the remaining points
  ttgEnd: number | null;
  vmg: number | null; // knots made good towards the next point
  leg: number;
  legs: number;
}

export function computeGuidance(a: Active, pos: Position | null): Guidance | null {
  const target = a.pts[a.leg];
  if (!target || !pos) return null;
  const from = a.leg > 0 ? a.pts[a.leg - 1] : null;
  const dtw = distanceNm(pos, target);
  const btw = bearing(pos, target);
  const xte = from && distanceNm(from, target) > 0.005 ? crossTrackNm(from, target, pos) : null;
  let remaining = dtw;
  for (let i = a.leg; i < a.pts.length - 1; i++) remaining += distanceNm(a.pts[i], a.pts[i + 1]);
  const spd = pos.speedKn ?? 0;
  const vmg = pos.cog != null && spd > 0.3 ? spd * Math.cos(((pos.cog - btw) * Math.PI) / 180) : null;
  const sog = vmg != null && vmg > 0.5 ? vmg : spd > 0.8 ? spd : null;
  return {
    target, from, dtw, btw, xte, remaining, vmg,
    ttg: sog ? dtw / sog : null, ttgEnd: sog ? remaining / sog : null,
    leg: a.kind === 'goto' ? 1 : a.leg, legs: a.kind === 'goto' ? 1 : a.pts.length - 1,
  };
}

function onPos(pos: Position | null) {
  if (!pos) return;
  const set = getNav();
  const a = state.active;
  if (a && !a.arrived) {
    const target = a.pts[a.leg];
    const from = a.leg > 0 ? a.pts[a.leg - 1] : null;
    const d = distanceNm(pos, target);
    // Arrived: inside the radius, or (on a route) passed abeam of the point while close to it.
    const passed = a.kind === 'route' && from && a.leg < a.pts.length - 1 && d < Math.max(0.25, set.arriveNm * 3)
      && alongTrackNm(from, target, pos) >= distanceNm(from, target);
    if (d <= set.arriveNm || passed) {
      xteAck = false;
      if (a.leg < a.pts.length - 1) {
        emit({ active: { ...a, leg: a.leg + 1 }, alarm: { type: 'arrive', name: target.name, at: Date.now() } });
      } else {
        emit({ active: { ...a, arrived: true }, alarm: { type: 'end', name: target.name, at: Date.now() } });
      }
      return;
    }
    if (from && distanceNm(from, target) > 0.005) {
      const x = Math.abs(crossTrackNm(from, target, pos));
      if (x > set.xteNm && !xteAck && state.alarm?.type !== 'xte') emit({ alarm: { type: 'xte', at: Date.now() } });
      if (x <= set.xteNm * 0.8) {
        xteAck = false;
        if (state.alarm?.type === 'xte') emit({ alarm: null });
      }
    }
  }
  const an = state.anchor;
  if (an && pos.acc <= 60) {
    const driftM = nmToM(distanceNm(an, pos));
    if (driftM > an.radiusM && Date.now() > anchorSnoozeUntil && state.alarm?.type !== 'anchor') emit({ alarm: { type: 'anchor', at: Date.now() } });
  }
}

function init() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  const saved = load<{ active: Active | null; anchor: Anchor | null }>('guide', { active: null, anchor: null });
  state = { ...state, active: saved.active ?? null, anchor: saved.anchor ?? null };
  let last: Position | null = null;
  subscribeTracker((t) => { if (t.pos && t.pos !== last) { last = t.pos; onPos(t.pos); } });
  syncGps();
}

// ---------- Public actions ----------
export function goTo(target: RoutePoint) {
  unlockAudio();
  const p = getTracker().pos;
  const origin: RoutePoint = p ? { lat: p.lat, lon: p.lon } : target;
  xteAck = false;
  emit({ active: { kind: 'goto', name: target.name ?? '', pts: [origin, target], leg: 1, startedAt: Date.now(), arrived: false }, alarm: null });
}

/** Follow a route. Starts at the nearest leg ahead of you instead of always at point 1. */
export function followRoute(routeId: string, name: string, pts: RoutePoint[]) {
  if (pts.length < 2) return;
  unlockAudio();
  const p = getTracker().pos;
  let leg = 1;
  if (p) {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const at = alongTrackNm(pts[i - 1], pts[i], p), len = distanceNm(pts[i - 1], pts[i]);
      const off = at < 0 ? distanceNm(p, pts[i - 1]) : at > len ? distanceNm(p, pts[i]) : Math.abs(crossTrackNm(pts[i - 1], pts[i], p));
      if (off < best - 1e-6) { best = off; leg = i; }
    }
    // Away from the route: go to its first point first, measured from where you are now.
    if (best > 0.3) { pts = [{ lat: p.lat, lon: p.lon }, ...pts]; leg = 1; }
  }
  xteAck = false;
  emit({ active: { kind: 'route', name, routeId, pts, leg, startedAt: Date.now(), arrived: false }, alarm: null });
}

export function skipPoint() {
  const a = state.active;
  if (!a || a.kind !== 'route') return;
  if (a.leg < a.pts.length - 1) emit({ active: { ...a, leg: a.leg + 1 }, alarm: null });
}
export function previousPoint() {
  const a = state.active;
  if (!a || a.kind !== 'route' || a.leg <= 1) return;
  emit({ active: { ...a, leg: a.leg - 1, arrived: false }, alarm: null });
}
export function stopGuide() { emit({ active: null, alarm: state.alarm?.type === 'anchor' ? state.alarm : null }); }

export function setAnchor(radiusM: number) {
  const p = getTracker().pos;
  if (!p) return false;
  unlockAudio();
  anchorSnoozeUntil = 0;
  emit({ anchor: { lat: p.lat, lon: p.lon, radiusM, setAt: Date.now() } });
  return true;
}
export function setAnchorRadius(radiusM: number) { if (state.anchor) emit({ anchor: { ...state.anchor, radiusM } }); }
export function clearAnchor() { emit({ anchor: null, alarm: state.alarm?.type === 'anchor' ? null : state.alarm }); }

export function ackAlarm() {
  const a = state.alarm;
  if (!a) return;
  if (a.type === 'xte') xteAck = true;
  if (a.type === 'anchor') anchorSnoozeUntil = Date.now() + 60e3; // re-alarm after a minute if still outside
  emit({ alarm: null });
}

export const getGuide = () => { init(); return state; };

export function useGuide(): GuideState {
  const [s, setS] = useState<GuideState>(state);
  useEffect(() => {
    init();
    subs.add(setS);
    setS(state);
    return () => { subs.delete(setS); };
  }, []);
  return s;
}

export const anchorDriftM = (an: Anchor, p: Fix) => nmToM(distanceNm(an, p));
