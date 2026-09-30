import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Anchor, Check, Crosshair, Keyboard, Download, Flag, House, Layers, LifeBuoy, LocateFixed, MapPin, MapPinPlus, Minus, Navigation, Navigation2,
  Pencil, Play, Plus, RefreshCw, Route as RouteIcon, Satellite, Square, Trash2, TriangleAlert, Undo2, Upload, WifiOff, Wrench, X,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ChartHandle, ChartView, CView, mPerPx } from '@/components/ChartView';
import { AnchorCircle, BearingLine, BoatMarker, DashLine, RouteLine, SelectedMarker, StartMarker, TrackLine, WaypointMarkers } from '@/components/nav/ChartLayers';
import { AnchorCard, GuidanceCard } from '@/components/nav/Guidance';
import { LegsTable, RouteDetail, RouteTotals } from '@/components/nav/RouteLegs';
import { WaypointSheet } from '@/components/nav/WaypointSheet';
import { MiniChart } from '@/components/nav/MiniChart';
import { kindOf } from '@/components/nav/kinds';
import { EmergencySheet } from '@/components/EmergencySheet';
import { CaptainPanel, MicButton } from '@/components/ai/CaptainPanel';
import { CaptainSheet } from '@/components/CaptainSheet';
import { useCaptain } from '@/lib/ai/captain';
import { TripStats } from '@/components/TripSummary';
import { TripBriefing } from '@/components/nav/TripBriefing';
import { TripExtras, useTripAnalysis } from '@/components/nav/TripExtras';
import { CatchLog } from '@/components/CatchLog';
import { requestNotifyPermission } from '@/lib/native/notify';
import { snapshotAt } from '@/lib/marine/snapshot';
import { nowLocalMs } from '@/lib/marine/time';
import { useConditions } from '@/lib/useConditions';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { useSpot } from '@/lib/SpotContext';
import { endTrip, releaseGps, setReturning, startGps, startTrip, TrackerState, useTracker } from '@/lib/nav/tracker';
import { allRoutes, allWaypoints, deleteTrip, deleteWaypoint, newId, notifyNavData, onNavData, putRoute, putTrip, putWaypoint, Route, RoutePoint, Trip, Waypoint } from '@/lib/nav/db';
import { bearing, distanceNm, distUnit, fmtDist, fmtDuration, fmtLat, fmtLon, pathNm } from '@/lib/nav/geo';
import { MIN_COG_KN } from '@/lib/nav/gpsfilter';
import { anchorDriftM, computeGuidance, followRoute, goTo, setAnchor, useGuide } from '@/lib/nav/guide';
import { timeToGo } from '@/lib/nav/eta';
import { returnInfo } from '@/lib/nav/returnPath';
import { useEtaText } from '@/components/nav/Guidance';
import { MapLayer, useNavSettings } from '@/lib/nav/settings';
import { exportAllGpx, importGpxFile } from '@/lib/nav/transfer';
import { load, save } from '@/lib/storage';

type Mode = 'view' | 'addwp' | 'plan';
type Tab = 'nav' | 'marks' | 'routes' | 'tools';
interface Plan { id?: string; name: string; pts: RoutePoint[] }
type LL = { lat: number; lon: number };

const pad3 = (n: number) => String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0');
const ago = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`; };

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const f = () => setOn(navigator.onLine);
    f();
    window.addEventListener('online', f); window.addEventListener('offline', f);
    return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f); };
  }, []);
  return on;
}

export default function Navigate() {
  const { t } = useT();
  const router = useRouter();
  const { activity, spot } = useSpot();
  const s = useTracker();
  const guide = useGuide();
  const cond = useConditions(spot.id);
  const [briefing, setBriefing] = useState(false);
  const [nav, setNav] = useNavSettings();
  const online = useOnline();
  const cap = useCaptain();
  const chart = useRef<ChartHandle>(null);
  const viewRef = useRef<CView | null>(null);

  const [asked, setAsked] = useState(false);
  const [follow, setFollow] = useState(true);
  const [mode, setMode] = useState<Mode>('view');
  const [tab, setTab] = useState<Tab>('nav');
  const [wps, setWps] = useState<Waypoint[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editWp, setEditWp] = useState<Waypoint | null>(null);
  const [sel, setSel] = useState<LL | null>(null); // tapped location
  const [selWp, setSelWp] = useState<Waypoint | null>(null); // tapped waypoint
  const [confirmDelWp, setConfirmDelWp] = useState(false);
  const [selRoute, setSelRoute] = useState<Route | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [sos, setSos] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [endAsk, setEndAsk] = useState(false);
  const [done, setDone] = useState<{ trip: Trip; track: [number, number][] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, tick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstFix = useRef(true);
  const rotRef = useRef(0);

  // Same view on the server and the first client render (avoids a hydration mismatch);
  // the last-used view is restored right after mounting.
  const initialView = useMemo<CView>(() => ({ lon: spot.lon, lat: spot.lat, z: 11 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const v = load<CView | null>('navView', null); if (v && firstFix.current) chart.current?.setView(v); }, []);

  const reload = useCallback(() => {
    Promise.all([allWaypoints().then(setWps), allRoutes().then(setRoutes)]).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => { setAsked(load('gpsAsked', false)); reload(); return onNavData(reload); }, [reload]);
  useEffect(() => { if (asked) startGps(); return () => releaseGps(); }, [asked]);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2600); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    const id = setInterval(() => { if (viewRef.current) save('navView', viewRef.current); }, 4000);
    return () => { clearInterval(id); if (viewRef.current) save('navView', viewRef.current); };
  }, []);

  const pos = s.pos;
  const fixOk = !!pos && s.gps !== 'lost';
  const trip = s.trip;
  const start = trip?.start ?? null;
  const moving = fixOk && (pos!.speedKn ?? 0) >= MIN_COG_KN && pos!.cog != null;

  // Keep the boat in view while following.
  useEffect(() => {
    if (!pos || !follow) return;
    if (firstFix.current) { firstFix.current = false; chart.current?.setView({ lon: pos.lon, lat: pos.lat, z: Math.max(13, viewRef.current?.z ?? 13) }); return; }
    chart.current?.setView({ lon: pos.lon, lat: pos.lat });
  }, [pos, follow]);

  // Course-up: rotate only from a reliable GPS course while moving; otherwise hold the last angle.
  if (nav.orient === 'course' && moving) {
    const prev = rotRef.current;
    rotRef.current = prev + ((((pos!.cog! - prev) % 360) + 540) % 360) - 180;
  }
  const rotation = nav.orient === 'course' ? rotRef.current : null;

  // Deep links: /navigate?goto=<wp> · ?wp=<wp> · ?route=<id> · ?edit=<routeId> · ?plan=1
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current || !router.isReady || !loaded) return;
    handled.current = true;
    const q = router.query;
    if (q.sos) setSos(true);
    if (!q.goto && !q.route && !q.wp && !q.edit && !q.plan) { if (q.sos) router.replace('/navigate', undefined, { shallow: true }); return; }
    const w = wps.find((x) => x.id === (q.goto || q.wp));
    if (w && q.goto) startGoto({ lat: w.lat, lon: w.lon, name: w.name, wpId: w.id });
    if (w && q.wp) { setSelWp(w); setFollow(false); chart.current?.setView({ lon: w.lon, lat: w.lat, z: 14 }); }
    const r = routes.find((x) => x.id === (q.route || q.edit));
    if (r && q.route) navigateRoute(r, r.points);
    if (r && q.edit) startPlan(r);
    if (q.plan) startPlan();
    router.replace('/navigate', undefined, { shallow: true });
  }, [router, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const allow = () => { save('gpsAsked', true); setAsked(true); startGps(); };

  // ---------- Return to start: follow the recorded track back ----------
  const ret = useMemo(() => (s.returning ? returnInfo(pos, start, s.track) : null), [s.returning, pos, start, s.track]);
  // Time to go / ETA always come from the navigation engine (lib/nav/eta.ts).
  const et = useEtaText();
  const retEta = timeToGo({ distNm: ret?.along ?? null, pos, lost: s.gps === 'lost' });

  // ---------- Waypoints ----------
  const draftWp = (lat: number, lon: number): Waypoint => ({ id: '', name: t('wp_default', { n: wps.length + 1 }), kind: 'mark', lat, lon, at: 0 });
  const center = () => chart.current?.getView() ?? viewRef.current ?? initialView;
  const hitWp = (lon: number, lat: number) => {
    const v = chart.current?.getView();
    if (!v) return null;
    const m = mPerPx(v);
    let best: Waypoint | null = null, bd = 30;
    for (const w of wps) { const px = (distanceNm({ lat, lon }, w) * 1852) / m; if (px < bd) { bd = px; best = w; } }
    return best;
  };
  const markHere = async () => {
    if (!fixOk) { setToast(t('em_no_fix')); return; }
    const w: Waypoint = { ...draftWp(pos!.lat, pos!.lon), id: newId(), at: Date.now() };
    await putWaypoint(w).catch(() => {});
    notifyNavData();
    setToast(t('point_saved'));
  };
  function startGoto(target: RoutePoint) {
    if (!asked) allow();
    goTo(target);
    setTab('nav'); setMode('view'); setSel(null); setSelWp(null);
    const p = s.pos;
    setFollow(false);
    chart.current?.fit(p ? [[target.lon, target.lat], [p.lon, p.lat]] : [[target.lon, target.lat]], 15);
  }
  const saveHome = async (p: LL) => {
    const old = wps.find((w) => w.kind === 'home');
    const w: Waypoint = old ? { ...old, lat: p.lat, lon: p.lon } : { id: newId(), name: t('wk_home'), kind: 'home', lat: p.lat, lon: p.lon, at: Date.now() };
    await putWaypoint(w).catch(() => {});
    notifyNavData();
    setSel(null);
    setToast(t('home_saved'));
  };
  const delWp = async (w: Waypoint) => {
    if (!confirmDelWp) { setConfirmDelWp(true); setTimeout(() => setConfirmDelWp(false), 3500); return; }
    await deleteWaypoint(w.id).catch(() => {});
    notifyNavData();
    setSelWp(null); setConfirmDelWp(false);
  };

  // ---------- Route planning ----------
  function startPlan(r?: Route) {
    setPlan(r ? { id: r.id, name: r.name, pts: r.points } : { name: t('route_default', { n: routes.length + 1 }), pts: [] });
    setMode('plan'); setTab('routes'); setSelRoute(null); setSel(null); setSelWp(null); setFollow(false);
    if (r) chart.current?.fit(r.points.map((p) => [p.lon, p.lat]));
    setToast(t('plan_hint'));
  }
  const addPlanPoint = (lat: number, lon: number) => {
    if (!plan) return;
    const w = hitWp(lon, lat);
    const pt: RoutePoint = w ? { lat: w.lat, lon: w.lon, name: w.name, wpId: w.id } : { lat, lon };
    const last = plan.pts[plan.pts.length - 1];
    if (last && distanceNm(last, pt) < 0.003) return;
    setPlan({ ...plan, pts: [...plan.pts, pt] });
  };
  const savePlan = async () => {
    if (!plan || plan.pts.length < 2) { setToast(t('plan_need2')); return; }
    const now = Date.now();
    const old = plan.id ? routes.find((r) => r.id === plan.id) : null;
    const r: Route = { id: plan.id ?? newId(), name: plan.name.trim() || t('route_default', { n: routes.length + 1 }), points: plan.pts, createdAt: old?.createdAt ?? now, updatedAt: now };
    await putRoute(r).catch(() => {});
    notifyNavData();
    setPlan(null); setMode('view'); setSelRoute(r); setToast(t('route_saved'));
  };
  const cancelPlan = () => { setPlan(null); setMode('view'); };
  function navigateRoute(r: Route, pts: RoutePoint[]) {
    if (!asked) allow();
    followRoute(r.id, r.name, pts);
    setSelRoute(null); setTab('nav'); setMode('view'); setFollow(false);
    const p = s.pos;
    chart.current?.fit([...pts.map((q) => [q.lon, q.lat] as [number, number]), ...(p ? [[p.lon, p.lat] as [number, number]] : [])]);
  }

  // ---------- Map events ----------
  const onTap = (lon: number, lat: number) => {
    if (mode === 'plan') { addPlanPoint(lat, lon); return; }
    if (mode === 'addwp') return;
    const w = hitWp(lon, lat);
    setConfirmDelWp(false);
    if (w) { setSelWp(w); setSel(null); return; }
    if (sel || selWp) { setSel(null); setSelWp(null); return; } // a tap elsewhere just closes the panel
    setSel({ lat, lon });
  };
  const onLong = (lon: number, lat: number) => {
    if (mode === 'plan') { addPlanPoint(lat, lon); return; }
    setSelWp(null); setSel({ lat, lon });
  };

  // ---------- Trip ----------
  // START shows the briefing first; the briefing's big button actually starts recording.
  const onStart = () => setBriefing(true);
  const reallyStart = () => {
    setBriefing(false);
    if (!asked) allow();
    requestNotifyPermission();
    const conditions = cond.data ? snapshotAt(cond.data, nowLocalMs(cond.data.utcOffsetSeconds)) : null;
    startTrip(activity, t('trip_default', { activity: t(`act_${activity}`) }), { conditions, fuelStartL: nav.fuelL });
  };
  const doEnd = async () => {
    setEndAsk(false);
    const track = s.track.slice();
    const tr = await endTrip();
    if (tr) setDone({ trip: tr, track });
  };
  const toggleReturn = () => {
    if (!start) { setToast(t('return_no_start')); return; }
    const on = !s.returning;
    setReturning(on);
    if (on) { setFollow(true); setTab('nav'); }
  };
  const dropAnchor = (r: number) => {
    const res = setAnchor(r);
    if (res === 'nofix') setToast(t('em_no_fix'));
    else if (res === 'poor') setToast(t('anchor_poor', { m: Math.round(pos?.acc ?? 0) }));
    else setToast(t('anchor_on'));
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await importGpxFile(f);
      setToast(t('imported', { w: r.waypoints, r: r.routes, t: r.tracks }));
    } catch { setToast(t('import_bad')); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const elapsed = trip ? Date.now() - trip.startedAt : 0;
  const a = guide.active;
  const activeTarget = a && !a.arrived ? a.pts[a.leg] : null;
  const gotoEta = a && pos ? computeGuidance(a, pos, s.gps === 'lost')?.eta ?? null : null;
  const shownRoute = plan ? null : selRoute;
  const wpsByDist = useMemo(() => (pos ? [...wps].sort((x, y) => distanceNm(pos, x) - distanceNm(pos, y)) : wps), [wps, pos]);
  const fromYou = (p: LL) => (fixOk ? t('from_you', { d: `${fmtDist(distanceNm(pos!, p))} ${distUnit(distanceNm(pos!, p))}`, b: pad3(bearing(pos!, p)) }) : null);

  const mapBtn = 'tap grid h-12 w-12 place-items-center rounded-xl bg-white text-ink shadow-md ring-1 ring-black/5 dark:bg-[#0A2B40] dark:text-white';
  const showTripBar = mode === 'view';

  return (
    <AppShell title={t('nav_navigate')} showSpot={false} hideCaptain>
      <div className="-mx-4 md:mx-0 lg:grid lg:grid-cols-12 lg:gap-4">
        {/* ================= CHART ================= */}
        <div className="relative lg:sticky lg:top-4 lg:col-span-8 lg:self-start">
          <ChartView ref={chart} layer={nav.layer} seamarks={nav.seamarks} initial={initialView} label={t('chart')} rotation={rotation}
            className="h-[64vh] min-h-[380px] w-full md:rounded-3xl lg:h-[calc(100vh-8rem)]"
            onTap={onTap} onLongPress={onLong} onUserMove={() => setFollow(false)} doubleTapZoom={mode !== 'plan'}
            onViewChange={(v) => { viewRef.current = v; }}
            overlay={
              <>
                {/* Status */}
                <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col items-start gap-1.5">
                    <GpsBadge s={s} asked={asked} />
                    {trip && <span className="inline-flex items-center gap-1.5 rounded-full bg-bad px-2.5 py-1 text-xs font-bold text-white shadow"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />{t('tracking')} · {fmtDuration(elapsed)}</span>}
                    {!online && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-bold text-white shadow"><WifiOff size={13} /> {t('offline_mode')}</span>}
                    {guide.anchor && <span className="inline-flex items-center gap-1.5 rounded-full bg-abyss px-2.5 py-1 text-xs font-bold text-white shadow"><Anchor size={12} /> {pos ? `${Math.round(anchorDriftM(guide.anchor, pos))} m` : '—'} / {guide.anchor.radiusM} m</span>}
                  </div>
                  <button data-chart-ui onClick={() => setSos(true)} className="tap pointer-events-auto flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-bad px-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg ring-2 ring-white">
                    <LifeBuoy size={18} /> {t('sos')}
                  </button>
                </div>

                {/* Guidance strip: return to start / go-to / route */}
                {mode === 'view' && ret && (
                  <button data-chart-ui onClick={() => setTab('nav')} className="absolute inset-x-3 top-[6.5rem] flex items-center gap-3 rounded-2xl bg-buoy px-3 py-2 text-start text-white shadow-lg">
                    <Navigation2 size={28} fill="#fff" className="shrink-0" style={{ transform: `rotate(${ret.steer - (rotation ?? 0)}deg)` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-white/85"><House size={12} className="me-1 inline" />{t('return_title')}</span>
                      <span dir="ltr" className="block text-start font-display text-xl font-semibold leading-tight tabular-nums rtl:text-end">{fmtDist(ret.along)} {distUnit(ret.along)} · {pad3(ret.brgStart)}° · {et.ttg(retEta)}</span>
                    </span>
                  </button>
                )}
                {mode === 'view' && !ret && a && activeTarget && fixOk && (
                  <button data-chart-ui onClick={() => setTab('nav')} className="absolute inset-x-3 top-[6.5rem] flex items-center gap-3 rounded-2xl bg-[#C026D3] px-3 py-2 text-start text-white shadow-lg">
                    <Navigation2 size={28} fill="#fff" className="shrink-0" style={{ transform: `rotate(${bearing(pos!, activeTarget) - (rotation ?? 0)}deg)` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-white/85"><Flag size={12} className="me-1 inline" />{activeTarget.name || t('destination')}</span>
                      <span dir="ltr" className="block text-start font-display text-xl font-semibold leading-tight tabular-nums rtl:text-end">{fmtDist(distanceNm(pos!, activeTarget))} {distUnit(distanceNm(pos!, activeTarget))} · {pad3(bearing(pos!, activeTarget))}° · {gotoEta ? et.ttg(gotoEta) : '—'}</span>
                    </span>
                  </button>
                )}

                {/* Map controls (right) */}
                <div data-chart-ui className={`absolute end-3 flex flex-col gap-2 ${showTripBar ? 'bottom-[5.75rem]' : 'bottom-24'}`}>
                  <button className={mapBtn} onClick={() => setLayersOpen(true)} aria-label={t('layers')} title={t('layers')}><Layers size={20} /></button>
                  <button className={mapBtn} onClick={() => setNav({ orient: nav.orient === 'north' ? 'course' : 'north' })} aria-label={nav.orient === 'north' ? t('north_up') : t('course_up')} title={nav.orient === 'north' ? t('north_up') : t('course_up')}>
                    <span className="relative grid place-items-center">
                      <Navigation2 size={20} className={nav.orient === 'north' ? 'text-bad' : 'text-[#0A84FF]'} fill="currentColor" style={{ transform: `rotate(${-(rotation ?? 0)}deg)` }} />
                      <span className="absolute -bottom-3 text-[9px] font-extrabold">{nav.orient === 'north' ? 'N' : 'C'}</span>
                    </span>
                  </button>
                  <button className={mapBtn} onClick={() => chart.current?.zoomBy(1)} aria-label={t('zoom_in')} title={t('zoom_in')}><Plus size={22} /></button>
                  <button className={mapBtn} onClick={() => chart.current?.zoomBy(-1)} aria-label={t('zoom_out')} title={t('zoom_out')}><Minus size={22} /></button>
                </div>

                {/* Recenter */}
                {!follow && pos && mode === 'view' && (
                  <button data-chart-ui onClick={() => { setFollow(true); chart.current?.setView({ lon: pos.lon, lat: pos.lat }); }}
                    className={`tap absolute start-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#0A84FF] px-4 text-sm font-bold text-white shadow-lg rtl:translate-x-1/2 ${showTripBar ? (sel ? 'bottom-[16.5rem]' : selWp ? 'bottom-[13.5rem]' : 'bottom-[5.75rem]') : 'bottom-24'}`}>
                    <LocateFixed size={18} /> {t('recenter')}
                  </button>
                )}

                {/* Selected location / waypoint panel */}
                {mode === 'view' && sel && (
                  <div data-chart-ui className="absolute inset-x-3 bottom-[5.25rem] rounded-2xl bg-white/97 p-3 shadow-xl dark:bg-[#0A2B40]/97">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C026D3]"><MapPin size={14} /> {t('sel_loc')}</p>
                        <p dir="ltr" className="font-display text-lg font-semibold tabular-nums">{fmtLat(sel.lat)} {fmtLon(sel.lon)}</p>
                        {fromYou(sel) && <p className="muted text-sm tabular-nums">{fromYou(sel)}</p>}
                      </div>
                      <button onClick={() => setSel(null)} aria-label={t('cancel')} className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-white/10"><X size={18} /></button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button onClick={() => { setEditWp(draftWp(sel.lat, sel.lon)); setSel(null); }} className="tap flex h-12 items-center justify-center gap-2 rounded-xl bg-abyss font-semibold text-white dark:bg-shallows dark:text-abyss"><MapPinPlus size={18} /> {t('add_wp')}</button>
                      <button onClick={() => startGoto({ lat: sel.lat, lon: sel.lon, name: t('selected_pt') })} className="tap flex h-12 items-center justify-center gap-2 rounded-xl bg-[#C026D3] font-semibold text-white"><Navigation size={18} /> {t('nav_here')}</button>
                      <button onClick={() => saveHome(sel)} className="tap col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0E9F6E]/10 text-sm font-semibold text-[#0E7A55] dark:text-[#5EE0B0]"><House size={17} /> {t('save_home')}</button>
                    </div>
                  </div>
                )}
                {mode === 'view' && selWp && (() => {
                  const k = kindOf(selWp.kind);
                  return (
                    <div data-chart-ui className="absolute inset-x-3 bottom-[5.25rem] rounded-2xl bg-white/97 p-3 shadow-xl dark:bg-[#0A2B40]/97">
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: k.color }}><k.Icon size={20} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-xl font-semibold leading-tight">{selWp.name}</p>
                          {fromYou(selWp) && <p className="text-sm font-semibold tabular-nums">{fromYou(selWp)}</p>}
                          <p dir="ltr" className="muted text-xs tabular-nums">{fmtLat(selWp.lat)} {fmtLon(selWp.lon)}</p>
                        </div>
                        <button onClick={() => setSelWp(null)} aria-label={t('close')} className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-white/10"><X size={18} /></button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <button onClick={() => startGoto({ lat: selWp.lat, lon: selWp.lon, name: selWp.name, wpId: selWp.id })} className="tap col-span-1 flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#C026D3] text-sm font-bold text-white"><Navigation size={16} /> {t('nav_here')}</button>
                        <button onClick={() => { setEditWp(selWp); setSelWp(null); }} className="tap flex h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Pencil size={16} /> {t('edit')}</button>
                        <button onClick={() => delWp(selWp)} aria-label={t('delete_wp')} className={`tap flex h-12 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${confirmDelWp ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}><Trash2 size={16} /> {confirmDelWp ? t('confirm_again') : t('delete')}</button>
                      </div>
                    </div>
                  );
                })()}

                {/* Trip bar: the main actions, always within thumb reach */}
                {showTripBar && (
                  <div data-chart-ui className="absolute inset-x-3 bottom-7 flex items-stretch gap-2">
                    {!trip ? (
                      <>
                        <button onClick={onStart} disabled={s.gps === 'denied' || s.gps === 'unsupported'}
                          className="tap flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-good text-lg font-bold uppercase tracking-wide text-white shadow-lg disabled:opacity-50">
                          <Play size={20} fill="#fff" /> {t('start_trip')}
                        </button>
                        <button onClick={markHere} disabled={!fixOk} aria-label={t('save_point')} className="tap flex h-14 w-16 flex-col items-center justify-center rounded-2xl bg-white text-[11px] font-bold text-ink shadow-lg disabled:opacity-50 dark:bg-[#0A2B40] dark:text-white">
                          <MapPinPlus size={20} /> {t('mark_btn')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={toggleReturn} className={`tap flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-lg font-bold uppercase tracking-wide shadow-lg ${s.returning ? 'bg-white text-buoy ring-2 ring-buoy dark:bg-[#0A2B40]' : 'bg-buoy text-white'} ${!start ? 'opacity-60' : ''}`}>
                          {s.returning ? <><X size={20} /> {t('stop_return')}</> : <><House size={20} /> {t('return_btn')}</>}
                        </button>
                        <button onClick={markHere} disabled={!fixOk} aria-label={t('save_point')} className="tap flex h-14 w-16 flex-col items-center justify-center rounded-2xl bg-white text-[11px] font-bold text-ink shadow-lg disabled:opacity-50 dark:bg-[#0A2B40] dark:text-white">
                          <MapPinPlus size={20} /> {t('mark_btn')}
                        </button>
                        <button onClick={() => setEndAsk(true)} aria-label={t('end_trip')} className="tap flex h-14 w-16 flex-col items-center justify-center rounded-2xl bg-white text-[11px] font-bold text-bad shadow-lg dark:bg-[#0A2B40]">
                          <Square size={18} fill="currentColor" /> {t('end_trip').split(' ')[0]}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Mode bars */}
                {mode === 'addwp' && (
                  <>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center"><Crosshair size={48} strokeWidth={1.5} className="text-[#C026D3] drop-shadow" /></div>
                    <div data-chart-ui className="absolute bottom-7 start-3 end-[4.25rem] flex flex-wrap gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-[#0A2B40]/95">
                      <button onClick={() => { const c = center(); setEditWp(draftWp(c.lat, c.lon)); setMode('view'); }} className="tap h-12 flex-1 rounded-xl bg-[#C026D3] px-3 text-sm font-bold text-white">{t('drop_here')}</button>
                      {fixOk && <button onClick={() => { setEditWp(draftWp(pos!.lat, pos!.lon)); setMode('view'); }} className="tap h-12 rounded-xl bg-slate-100 px-3 text-sm font-semibold dark:bg-white/10">{t('at_boat')}</button>}
                      <button onClick={() => setMode('view')} aria-label={t('cancel')} className="tap grid h-12 w-12 place-items-center rounded-xl bg-slate-100 dark:bg-white/10"><X size={18} /></button>
                    </div>
                  </>
                )}
                {mode === 'plan' && plan && (
                  <div data-chart-ui className="absolute bottom-7 start-3 end-[4.25rem] flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-[#0A2B40]/95">
                    <p className="min-w-0 flex-1 px-1 text-sm leading-tight">
                      <span className="block font-semibold">{t('plan_pts', { n: plan.pts.length })}</span>
                      <span className="muted tabular-nums">{fmtDist(pathNm(plan.pts))} {distUnit(pathNm(plan.pts))}</span>
                    </p>
                    <button onClick={() => setPlan({ ...plan, pts: plan.pts.slice(0, -1) })} disabled={!plan.pts.length} aria-label={t('undo')} className="tap grid h-12 w-12 place-items-center rounded-xl bg-slate-100 disabled:opacity-40 dark:bg-white/10"><Undo2 size={18} /></button>
                    <button onClick={savePlan} className="tap h-12 rounded-xl bg-[#C026D3] px-4 text-sm font-bold text-white">{t('save')}</button>
                    <button onClick={cancelPlan} aria-label={t('cancel')} className="tap grid h-12 w-12 place-items-center rounded-xl bg-slate-100 dark:bg-white/10"><X size={18} /></button>
                  </div>
                )}
                {toast && <p role="status" className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-max max-w-[85%] rounded-2xl bg-abyss/95 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"><Check size={14} className="me-1 inline" />{toast}</p>}
              </>
            }>
            {(p, v) => {
              const mpp = mPerPx(v);
              return (
                <g>
                  <TrackLine pts={s.track} p={p} color={trip ? '#E11D48' : '#0E7C86'} />
                  {ret && <DashLine pts={ret.path} p={p} />}
                  {shownRoute && <RouteLine pts={shownRoute.points} p={p} z={v.z} rot={v.rot} />}
                  {a && a.kind === 'route' && <RouteLine pts={a.pts} p={p} active={a.arrived ? -1 : a.leg} z={v.z} rot={v.rot} />}
                  {plan && <RouteLine pts={plan.pts} p={p} z={v.z} dashed rot={v.rot} />}
                  {guide.anchor && <AnchorCircle an={guide.anchor} p={p} mpp={mpp} drifted={!!pos && anchorDriftM(guide.anchor, pos) - pos.acc * 0.5 > guide.anchor.radiusM} />}
                  <WaypointMarkers wps={wps} p={p} selected={selWp?.id} z={v.z} rot={v.rot} />
                  {start && <StartMarker at={start} p={p} rot={v.rot} />}
                  {fixOk && activeTarget && !ret && <BearingLine from={pos!} to={activeTarget} p={p} />}
                  {fixOk && ret && start && <BearingLine from={pos!} to={start} p={p} />}
                  {sel && <SelectedMarker at={sel} p={p} />}
                  {pos && <g opacity={s.gps === 'lost' ? 0.45 : 1}><BoatMarker pos={pos} p={p} mpp={mpp} /></g>}
                </g>
              );
            }}
          </ChartView>
        </div>

        {/* ================= PANEL ================= */}
        <div className="space-y-3 px-4 pt-3 md:px-0 lg:col-span-4 lg:pt-0">
          <div role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
            {([['nav', 'tab_nav', Navigation], ['marks', 'tab_marks', MapPin], ['routes', 'tab_routes', RouteIcon], ['tools', 'tab_tools', Wrench]] as [Tab, Key, typeof MapPin][]).map(([id, k, I]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`tap flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold ${tab === id ? 'bg-white text-ink shadow-sm dark:bg-[#0A2B40] dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>
                <I size={17} /> {t(k)}
              </button>
            ))}
          </div>

          {/* ---------- NAV TAB ---------- */}
          {tab === 'nav' && (
            <>
              <div className="flex gap-2">
                <MicButton big className="flex-1" />
                <button onClick={() => setAskOpen(true)} aria-label={t('ai_title')} title={t('ai_title')} className="tap grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"><Keyboard size={24} /></button>
              </div>
              {(cap.reply || cap.heard || cap.error) && <CaptainPanel compact />}
              {s.storageError && <Warn tone="bad">{t('storage_err')}</Warn>}
              {!asked && (
                <section className="card p-4">
                  <p className="flex items-center gap-2 text-lg font-bold"><LocateFixed size={20} className="text-lagoon" /> {t('loc_required')}</p>
                  <p className="muted mt-1 text-sm leading-snug">{t('perm_t')}</p>
                  <button onClick={allow} className="tap mt-3 h-14 w-full rounded-2xl bg-abyss text-lg font-bold text-white">{t('perm_btn')}</button>
                </section>
              )}
              {asked && (s.gps === 'denied' || s.gps === 'unavailable' || s.gps === 'unsupported') && (
                <section className="card border-caution/40 p-4">
                  <p className="font-semibold">{s.gps === 'denied' ? t('gps_denied') : s.gps === 'unavailable' ? t('gps_unavail') : t('gps_unsupported')}</p>
                  <p className="muted mt-1 text-sm">{s.gps === 'denied' ? t('gps_denied_t') : t('gps_unavail_t')}</p>
                  {s.gps !== 'unsupported' && <button onClick={() => { releaseGps(); startGps(); }} className="tap mt-3 inline-flex h-11 items-center gap-1.5 rounded-full bg-abyss px-4 text-sm font-semibold text-white"><RefreshCw size={14} /> {t('try_again')}</button>}
                </section>
              )}
              {asked && s.gps === 'searching' && !pos && (
                <section className="card flex items-center gap-3 p-4">
                  <span className="relative grid h-10 w-10 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-caution/30" /><Satellite size={20} className="text-caution" /></span>
                  <span><span className="block font-semibold">{t('gps_search_big')}</span><span className="muted text-sm">{t('gps_searching_t')}</span></span>
                </section>
              )}
              {s.gps === 'lost' && s.lastFixAt && <Warn tone="bad">{t('gps_lost')} · {t('gps_lost_t', { t: ago(Date.now() - s.lastFixAt) })}</Warn>}
              {!online && <Warn tone="info"><WifiOff size={14} className="me-1 inline" />{t('offline_nav_t')}</Warn>}
              {s.resumed && trip && <Warn tone="info">{t('trip_resumed')}</Warn>}

              {ret && (
                <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A2E0E] to-buoy text-white shadow-lg">
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
                      <Navigation2 size={40} fill="#fff" style={{ transform: `rotate(${ret.steer - (pos?.cog != null && moving ? pos.cog : 0)}deg)` }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80"><House size={13} className="me-1 inline" />{t('return_title')}</p>
                      <p className="readout text-[40px] leading-none"><bdi>{fmtDist(ret.along)}</bdi><span className="ms-1 font-sans text-base font-medium text-white/70">{distUnit(ret.along)}</span></p>
                      <p className="mt-1 text-sm text-white/90">{t('bearing')} <b className="tabular-nums">{pad3(ret.brgStart)}°</b> · {t('ttg')} <b>{et.ttg(retEta)}</b> · {t('eta')} <b className="tabular-nums">{et.clock(retEta)}</b></p>
                      <p className="text-xs text-white/75">{t('to_start')} {fmtDist(ret.direct)} {distUnit(ret.direct)}</p>
                    </div>
                  </div>
                  <p className="bg-black/20 px-4 py-2 text-xs leading-snug text-white/90">{t('return_follow')}</p>
                </section>
              )}
              {trip && !start && <Warn tone="info"><Flag size={13} className="me-1 inline" />{t('return_no_start')}</Warn>}
              {a && <GuidanceCard a={a} pos={pos} lost={s.gps === 'lost'} />}
              {guide.anchor && <AnchorCard an={guide.anchor} pos={fixOk ? pos : null} />}

              <section className="grid grid-cols-2 gap-2">
                <Inst label={t('speed')} value={fixOk && pos!.speedKn != null ? pos!.speedKn.toFixed(1) : '—'} unit={fixOk ? t('unit_kn') : ''} big />
                <Inst label={t('cog_gps')} value={!fixOk ? '—' : moving ? `${pad3(pos!.cog!)}°` : t('cog_still')} unit="" big small={fixOk && !moving} />
                <Inst label={t('distance')} value={trip ? fmtDist(trip.distanceNm) : '0.00'} unit={trip ? distUnit(trip.distanceNm) : 'NM'} />
                <Inst label={t('elapsed')} value={trip ? fmtDuration(elapsed) : '0:00'} unit="" />
              </section>
              <section className="card flex items-center justify-between gap-3 px-4 py-3">
                <span className="eyebrow">{t('position')}</span>
                {pos ? <span dir="ltr" className={`font-display text-lg font-semibold tabular-nums ${s.gps === 'lost' ? 'opacity-50' : ''}`}>{fmtLat(pos.lat)}  {fmtLon(pos.lon)}</span> : <span className="muted text-sm">{t('em_no_fix')}</span>}
              </section>
              {trip && <p className="muted rounded-xl bg-slate-100 px-3 py-2 text-xs leading-snug dark:bg-white/5">{t('bg_warn')}</p>}

              <div className="grid grid-cols-3 gap-2">
                <QuickBtn icon={<MapPinPlus size={20} />} label={t('add_wp')} onClick={() => { setMode('addwp'); setFollow(false); setSel(null); setSelWp(null); }} />
                <QuickBtn icon={<RouteIcon size={20} />} label={t('plan_route')} onClick={() => startPlan()} />
                <QuickBtn icon={<Anchor size={20} />} label={guide.anchor ? t('anchor_on') : t('anchor_drop')} onClick={() => { if (guide.anchor) { setTab('tools'); return; } dropAnchor(20); }} />
              </div>
              <p className="muted text-center text-xs">{t('long_press_hint')}</p>
            </>
          )}

          {/* ---------- MARKS TAB ---------- */}
          {tab === 'marks' && (
            <>
              <div className="flex gap-2">
                <button onClick={() => { setMode('addwp'); setFollow(false); setSel(null); setSelWp(null); }} className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C026D3] font-semibold text-white"><MapPinPlus size={18} /> {t('add_wp')}</button>
                <button onClick={markHere} disabled={!fixOk} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 font-semibold disabled:opacity-40 dark:bg-white/10"><LocateFixed size={18} /> {t('at_boat')}</button>
              </div>
              {wps.length === 0 ? <p className="card muted p-4 text-sm">{t('no_wps')}</p> : (
                <ul className="card divide-y divide-slate-100 overflow-hidden dark:divide-white/10">
                  {wpsByDist.map((w) => {
                    const k = kindOf(w.kind);
                    return (
                      <li key={w.id} className={`flex items-center gap-2 px-3 py-2.5 ${selWp?.id === w.id ? 'bg-lagoon/5' : ''}`}>
                        <button onClick={() => { setSelWp(w); setSel(null); setFollow(false); chart.current?.setView({ lon: w.lon, lat: w.lat, z: Math.max(13, viewRef.current?.z ?? 13) }); }} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: k.color }}><k.Icon size={18} /></span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{w.name}</span>
                            <span className="muted block text-xs tabular-nums">{fromYou(w) ?? <bdi dir="ltr">{fmtLat(w.lat)} {fmtLon(w.lon)}</bdi>}</span>
                          </span>
                        </button>
                        <button onClick={() => setEditWp(w)} className="tap h-10 shrink-0 rounded-full bg-slate-100 px-3 text-xs font-semibold dark:bg-white/10">{t('edit')}</button>
                        <button onClick={() => startGoto({ lat: w.lat, lon: w.lon, name: w.name, wpId: w.id })} className="tap flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#C026D3] px-3 text-xs font-bold text-white"><Navigation size={13} /> {t('go')}</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {/* ---------- ROUTES TAB ---------- */}
          {tab === 'routes' && (
            plan ? (
              <section className="card space-y-3 p-4">
                <p className="eyebrow">{plan.id ? t('edit_route') : t('new_route')}</p>
                <input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} aria-label={t('route_name')} maxLength={50}
                  className="h-12 w-full rounded-xl border-0 bg-slate-100 px-3 font-display text-xl font-semibold dark:bg-white/10" />
                <p className="muted text-sm">{t('plan_hint')}</p>
                {fixOk && <button onClick={() => setPlan({ ...plan, pts: [...plan.pts, { lat: pos!.lat, lon: pos!.lon, name: t('my_position') }] })} className="tap inline-flex h-11 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-sm font-semibold dark:bg-white/10"><LocateFixed size={15} /> {t('add_boat_pt')}</button>}
                {plan.pts.length > 0 && <RouteTotals pts={plan.pts} />}
                {plan.pts.length > 0 && <LegsTable pts={plan.pts} onRemove={(i) => setPlan({ ...plan, pts: plan.pts.filter((_, k) => k !== i) })} />}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={savePlan} className="tap h-12 rounded-2xl bg-[#C026D3] font-semibold text-white">{t('save_route')}</button>
                  <button onClick={cancelPlan} className="tap h-12 rounded-2xl bg-slate-100 font-semibold dark:bg-white/10">{t('cancel')}</button>
                </div>
              </section>
            ) : (
              <>
                <button onClick={() => startPlan()} className="tap flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#C026D3] font-semibold text-white"><Plus size={18} /> {t('new_route')}</button>
                {routes.length === 0 ? <p className="card muted p-4 text-sm">{t('no_routes')}</p> : (
                  <ul className="space-y-2">
                    {routes.map((r) => {
                      const nm = pathNm(r.points);
                      const startD = fixOk ? distanceNm(pos!, r.points[0]) : null;
                      return (
                        <li key={r.id} className={`card flex items-center gap-3 p-3 ${selRoute?.id === r.id ? 'ring-2 ring-[#C026D3]' : ''}`}>
                          <button onClick={() => { setSelRoute(r); setFollow(false); chart.current?.fit(r.points.map((q) => [q.lon, q.lat])); }} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C026D3]/10 text-[#C026D3]"><RouteIcon size={19} /></span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{r.name}</span>
                              <span className="muted block text-xs tabular-nums">{t('n_points', { n: r.points.length })} · {fmtDist(nm)} {distUnit(nm)}{startD != null ? ` · ${t('start_away', { d: `${fmtDist(startD)} ${distUnit(startD)}` })}` : ''}</span>
                            </span>
                          </button>
                          <button onClick={() => navigateRoute(r, r.points)} className="tap flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#C026D3] px-3 text-xs font-bold text-white"><Navigation size={13} /> {t('go')}</button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )
          )}

          {/* ---------- TOOLS TAB ---------- */}
          {tab === 'tools' && (
            <>
              <section className="card p-4">
                <p className="flex items-center gap-2 font-semibold"><Anchor size={18} /> {t('anchor_alarm')}</p>
                <p className="muted mt-1 text-sm">{t('anchor_t')}</p>
                {guide.anchor ? <div className="mt-3"><AnchorCard an={guide.anchor} pos={fixOk ? pos : null} /></div> : (
                  <div className="mt-3 flex gap-1.5">
                    {[10, 20, 30, 50].map((r) => (
                      <button key={r} disabled={!fixOk} onClick={() => dropAnchor(r)} className="tap h-12 flex-1 rounded-xl bg-abyss text-sm font-semibold text-white disabled:opacity-40 dark:bg-shallows dark:text-abyss">{r} m</button>
                    ))}
                  </div>
                )}
              </section>
              <section className="card divide-y divide-slate-100 text-sm dark:divide-white/10">
                <p className="px-4 py-3 font-semibold">{t('alarms')}</p>
                <Row label={t('arrive_radius')}>
                  <Seg value={nav.arriveNm} options={[0.02, 0.05, 0.1, 0.25]} fmt={(v) => (v < 0.1 ? `${Math.round(v * 1852)} m` : `${v} NM`)} onChange={(v) => setNav({ arriveNm: v })} />
                </Row>
                <Row label={t('xte_limit')}>
                  <Seg value={nav.xteNm} options={[0.05, 0.1, 0.25, 0.5]} fmt={(v) => `${v}`} onChange={(v) => setNav({ xteNm: v })} />
                </Row>
                <Row label={t('alarm_sound')}>
                  <button role="switch" aria-checked={nav.sound} aria-label={t('alarm_sound')} onClick={() => setNav({ sound: !nav.sound })} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${nav.sound ? 'bg-good' : 'bg-slate-300 dark:bg-white/20'}`}>
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${nav.sound ? 'start-7' : 'start-1'}`} />
                  </button>
                </Row>
              </section>
              <section className="card p-4">
                <p className="font-semibold">{t('gpx_title')}</p>
                <p className="muted mt-1 text-sm">{t('gpx_t')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => fileRef.current?.click()} className="tap flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Upload size={16} /> {t('import_gpx')}</button>
                  <button onClick={() => exportAllGpx().catch(() => {})} className="tap flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Download size={16} /> {t('export_gpx')}</button>
                </div>
                <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
              </section>
              {s.rejected > 0 && <p className="muted px-1 text-xs">{t('gps_jumps', { n: s.rejected })}</p>}
              <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">{t('nav_aid')} {t('chart_note')}</p>
            </>
          )}
        </div>
      </div>

      {layersOpen && <LayerSheet layer={nav.layer} seamarks={nav.seamarks} onClose={() => setLayersOpen(false)} onChange={(p) => setNav(p)} />}
      {editWp && <WaypointSheet wp={editWp} pos={fixOk ? pos : null} onClose={() => setEditWp(null)} onGoTo={(w) => startGoto({ lat: w.lat, lon: w.lon, name: w.name, wpId: w.id })} />}
      {shownRoute && tab === 'routes' && (
        <Sheet title={t('route')} onClose={() => setSelRoute(null)} wide>
          <RouteDetail route={shownRoute} onNavigate={(pts) => navigateRoute(shownRoute, pts)} onEdit={() => startPlan(shownRoute)}
            onDeleted={() => setSelRoute(null)} onRenamed={(r) => setSelRoute(r)} />
        </Sheet>
      )}
      {endAsk && trip && (
        <Sheet title={t('end_title')} onClose={() => setEndAsk(false)}>
          <p className="text-base">{t('end_t')}</p>
          <p className="muted mt-1 text-sm tabular-nums">{fmtDist(trip.distanceNm)} {distUnit(trip.distanceNm)} · {fmtDuration(elapsed)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={doEnd} className="tap h-14 rounded-2xl bg-bad text-lg font-bold text-white">{t('end_save')}</button>
            <button onClick={() => setEndAsk(false)} className="tap h-14 rounded-2xl bg-slate-100 text-lg font-semibold dark:bg-white/10">{t('cancel')}</button>
          </div>
        </Sheet>
      )}
      <CaptainSheet open={askOpen} onClose={() => setAskOpen(false)} />
      <EmergencySheet open={sos} onClose={() => setSos(false)} pos={pos} canReturn={!!trip && !!start} onReturn={() => { if (start) { setReturning(true); setFollow(true); } }} onSave={markHere} />
      {briefing && <TripBriefing activity={activity} spotId={spot.id} onStart={reallyStart} onClose={() => setBriefing(false)} />}
      {done && <TripDone trip={done.trip} track={done.track} onClose={() => setDone(null)} onOpen={() => router.push(`/trips?trip=${done.trip.id}`)} />}
    </AppShell>
  );
}

function GpsBadge({ s, asked }: { s: TrackerState; asked: boolean }) {
  const { t } = useT();
  const g = s.gps;
  if (!asked || g === 'off') return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-600 px-2.5 py-1 text-xs font-bold text-white shadow"><Satellite size={13} /> {t('loc_required')}</span>;
  const map: Record<string, [string, string, string]> = {
    searching: ['bg-caution', t('gps_search_big'), ''],
    ok: ['bg-good', t('gps_ok'), s.pos ? t('acc_label', { m: Math.round(s.pos.acc) }) : ''],
    weak: ['bg-caution', t('gps_low'), s.pos ? t('acc_label', { m: Math.round(s.pos.acc) }) : ''],
    lost: ['bg-bad', t('gps_lost'), s.lastFixAt ? t('gps_lost_t', { t: ago(Date.now() - s.lastFixAt) }) : ''],
    denied: ['bg-bad', t('gps_denied'), ''],
    unavailable: ['bg-bad', t('gps_unavail'), ''],
    unsupported: ['bg-bad', t('gps_unsupported'), ''],
  };
  const [cls, label, sub] = map[g] ?? map.searching;
  return (
    <span role="status" className={`inline-flex max-w-[15rem] items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs font-bold text-white shadow ${cls}`}>
      {g === 'lost' || g === 'denied' ? <TriangleAlert size={14} className="shrink-0" /> : <Satellite size={14} className={`shrink-0 ${g === 'searching' ? 'animate-pulse' : ''}`} />}
      <span className="min-w-0 leading-tight"><span className="block">{label}</span>{sub && <span className="block text-[11px] font-semibold opacity-90">{sub}</span>}</span>
    </span>
  );
}

function Warn({ children, tone }: { children: React.ReactNode; tone: 'bad' | 'info' }) {
  return <p role={tone === 'bad' ? 'alert' : undefined} className={`rounded-xl px-3 py-2.5 text-sm font-medium leading-snug ${tone === 'bad' ? 'bg-bad/10 text-bad' : 'bg-sky-50 text-sky-900 dark:bg-sky-400/10 dark:text-sky-100'}`}>{children}</p>;
}

function Inst({ label, value, unit, big, small }: { label: string; value: string; unit: string; big?: boolean; small?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className={`readout mt-1 ${small ? 'text-2xl' : big ? 'text-[44px]' : 'text-[32px]'}`}><bdi>{value}</bdi>{unit && <span className="ms-1 font-sans text-sm font-medium text-slate-400">{unit}</span>}</p>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card tap flex min-h-[84px] flex-col items-center justify-center gap-1.5 p-3 text-center text-xs font-semibold">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#C026D3]/10 text-[#C026D3]">{icon}</span>{label}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3"><span className="font-medium">{label}</span>{children}</div>;
}

function Seg({ value, options, fmt, onChange }: { value: number; options: number[]; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} aria-pressed={value === o}
          className={`tap h-9 rounded-lg px-2 text-xs font-semibold tabular-nums ${value === o ? 'bg-white text-ink shadow-sm dark:bg-[#0A2B40] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{fmt(o)}</button>
      ))}
    </div>
  );
}

const LAYER_OPTS: { id: MapLayer; k: Key; sub: Key; bg: string }[] = [
  { id: 'map', k: 'ly_map', sub: 'ly_map_t', bg: 'linear-gradient(135deg,#AAD3DF 55%,#F2EFE9 55%)' },
  { id: 'sat', k: 'ly_sat', sub: 'ly_sat_t', bg: 'linear-gradient(135deg,#0B3D5C 55%,#8C7A5B 55%)' },
  { id: 'depth', k: 'ly_depth', sub: 'ly_depth_t', bg: 'linear-gradient(135deg,#9FD4F0,#3E8FC7 60%,#1B4F8A)' },
  { id: 'offline', k: 'ly_offline', sub: 'ly_offline_t', bg: 'linear-gradient(135deg,#CFEAF0 55%,#F1E9D8 55%)' },
];

function LayerSheet({ layer, seamarks, onChange, onClose }: { layer: MapLayer; seamarks: boolean; onChange: (p: { layer?: MapLayer; seamarks?: boolean }) => void; onClose: () => void }) {
  const { t } = useT();
  return (
    <Sheet title={t('layers')} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {LAYER_OPTS.map((o) => (
          <button key={o.id} onClick={() => onChange({ layer: o.id })} aria-pressed={layer === o.id}
            className={`tap overflow-hidden rounded-2xl bg-slate-50 text-start ring-2 dark:bg-white/5 ${layer === o.id ? 'ring-[#C026D3]' : 'ring-transparent'}`}>
            <span className="block h-14" style={{ background: o.bg }} />
            <span className="block px-3 pb-2.5 pt-2"><span className="block text-sm font-semibold">{t(o.k)}</span><span className="muted block text-[11px] leading-snug">{t(o.sub)}</span></span>
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
        <span><span className="block text-sm font-semibold">{t('ly_seamarks')}</span><span className="muted block text-[11px]">{t('ly_seamarks_t')}</span></span>
        <input type="checkbox" checked={seamarks} onChange={(e) => onChange({ seamarks: e.target.checked })} className="h-6 w-6 shrink-0 accent-[#C026D3]" />
      </label>
      <p className="muted mt-3 text-xs leading-relaxed">{t('chart_note')}</p>
    </Sheet>
  );
}

function TripDone({ trip, track, onClose, onOpen }: { trip: Trip; track: [number, number][]; onClose: () => void; onOpen: () => void }) {
  const { t } = useT();
  const [cur, setCur] = useState(trip);
  const [name, setName] = useState(trip.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const an = useTripAnalysis(trip);
  const saveIt = async () => { await putTrip({ ...cur, name: name.trim() || trip.name }).catch(() => {}); notifyNavData(); onOpen(); };
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    await deleteTrip(trip.id).catch(() => {});
    notifyNavData();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t('trip_complete')}>
      <div className="absolute inset-0 bg-abyss/60" />
      <div className="animate-rise relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-2xl dark:bg-[#0A2B40] md:rounded-3xl">
        <p className="flex items-center gap-2 text-good"><Check size={20} /><span className="font-display text-3xl font-bold uppercase text-ink dark:text-white">{t('trip_complete')}</span></p>
        {track.length > 1 && <div className="mt-3 overflow-hidden rounded-2xl"><MiniChart track={track} start={trip.start} className="h-48 w-full" /></div>}
        <div className="mt-3"><TripStats trip={cur} an={an} /></div>
        <div className="mt-3"><TripExtras trip={cur} an={an} onChange={setCur} /></div>
        <div className="mt-3"><CatchLog tripId={trip.id} compact /></div>
        <label className="mt-4 block text-sm font-medium">{t('trip_name')}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
        </label>
        <button onClick={saveIt} className="tap mt-4 h-14 w-full rounded-2xl bg-abyss text-lg font-bold text-white">{t('save_trip')}</button>
        <button onClick={onClose} className="tap mt-2 h-12 w-full rounded-2xl bg-slate-100 font-semibold dark:bg-white/10">{t('close')}</button>
        <button onClick={del} className={`tap mt-2 h-12 w-full rounded-2xl font-semibold ${confirmDel ? 'bg-bad text-white' : 'text-bad'}`}>{confirmDel ? t('discard_confirm') : t('discard')}</button>
      </div>
    </div>
  );
}
