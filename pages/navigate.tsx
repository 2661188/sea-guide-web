import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Anchor, Check, Crosshair, Download, Flag, Layers, LifeBuoy, LocateFixed, MapPin, MapPinPlus, Minus, Navigation, Play, Plus,
  RefreshCw, Route as RouteIcon, Satellite, Square, Undo2, Upload, Wrench, X,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ChartHandle, ChartView, CView, mPerPx } from '@/components/ChartView';
import { AnchorCircle, BearingLine, BoatMarker, DashLine, RouteLine, StartMarker, TrackLine, WaypointMarkers } from '@/components/nav/ChartLayers';
import { AnchorCard, GuidanceCard } from '@/components/nav/Guidance';
import { LegsTable, RouteDetail, RouteTotals } from '@/components/nav/RouteLegs';
import { WaypointSheet } from '@/components/nav/WaypointSheet';
import { kindOf } from '@/components/nav/kinds';
import { EmergencySheet } from '@/components/EmergencySheet';
import { TripStats } from '@/components/TripSummary';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { useSpot } from '@/lib/SpotContext';
import { endTrip, releaseGps, setReturning, startGps, startTrip, useTracker } from '@/lib/nav/tracker';
import { allRoutes, allWaypoints, deleteTrip, newId, notifyNavData, onNavData, putRoute, putTrip, putWaypoint, Route, RoutePoint, Trip, Waypoint } from '@/lib/nav/db';
import { bearing, distanceNm, distUnit, fmtDist, fmtDuration, fmtLat, fmtLon, pathNm } from '@/lib/nav/geo';
import { anchorDriftM, followRoute, goTo, setAnchor, useGuide } from '@/lib/nav/guide';
import { MapLayer, useNavSettings } from '@/lib/nav/settings';
import { exportAllGpx, importGpxFile } from '@/lib/nav/transfer';
import { load, save } from '@/lib/storage';
import { untilMsg } from '@/lib/marine/time';

type Mode = 'view' | 'addwp' | 'plan';
type Tab = 'nav' | 'marks' | 'routes' | 'tools';
interface Plan { id?: string; name: string; pts: RoutePoint[] }

export default function Navigate() {
  const { t, tm } = useT();
  const router = useRouter();
  const { activity, spot } = useSpot();
  const s = useTracker();
  const guide = useGuide();
  const [nav, setNav] = useNavSettings();
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
  const [selWp, setSelWp] = useState<string | null>(null);
  const [selRoute, setSelRoute] = useState<Route | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [sos, setSos] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [done, setDone] = useState<Trip | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, tick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstFix = useRef(true);

  const initialView = useMemo<CView>(() => load<CView | null>('navView', null) ?? { lon: spot.lon, lat: spot.lat, z: 11 }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const trip = s.trip;
  const start = trip?.start ?? null;

  // Keep the boat in view while following.
  useEffect(() => {
    if (!pos || !follow) return;
    if (firstFix.current) { firstFix.current = false; chart.current?.setView({ lon: pos.lon, lat: pos.lat, z: Math.max(13, viewRef.current?.z ?? 13) }); return; }
    chart.current?.setView({ lon: pos.lon, lat: pos.lat });
  }, [pos, follow]);

  // Deep links: /navigate?goto=<wp> · ?wp=<wp> · ?route=<id> · ?edit=<routeId> · ?plan=1
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current || !router.isReady || !loaded) return;
    handled.current = true;
    const q = router.query;
    if (!q.goto && !q.route && !q.wp && !q.edit && !q.plan) return;
    const w = wps.find((x) => x.id === (q.goto || q.wp));
    if (w && q.goto) startGoto(w);
    if (w && q.wp) { setSelWp(w.id); setFollow(false); setTab('marks'); chart.current?.setView({ lon: w.lon, lat: w.lat, z: 14 }); }
    const r = routes.find((x) => x.id === (q.route || q.edit));
    if (r && q.route) navigateRoute(r, r.points);
    if (r && q.edit) startPlan(r);
    if (q.plan) startPlan();
    router.replace('/navigate', undefined, { shallow: true });
  }, [router, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const allow = () => { save('gpsAsked', true); setAsked(true); startGps(); };

  // ---------- Return to start (follows the recorded track back) ----------
  const ret = useMemo(() => {
    if (!s.returning || !pos || !start || s.track.length < 1) return null;
    let k = 0, best = Infinity;
    s.track.forEach(([lon, lat], i) => { const d = distanceNm(pos, { lat, lon }); if (d < best) { best = d; k = i; } });
    let along = best;
    for (let i = k; i > 0; i--) along += distanceNm({ lon: s.track[i][0], lat: s.track[i][1] }, { lon: s.track[i - 1][0], lat: s.track[i - 1][1] });
    let j = k, acc = best;
    while (j > 0 && acc < 0.08) { acc += distanceNm({ lon: s.track[j][0], lat: s.track[j][1] }, { lon: s.track[j - 1][0], lat: s.track[j - 1][1] }); j--; }
    const target = { lon: s.track[j][0], lat: s.track[j][1] };
    const path: [number, number][] = [[pos.lon, pos.lat], ...s.track.slice(0, k + 1).reverse()];
    return { along, direct: distanceNm(pos, start), brgStart: bearing(pos, start), steer: bearing(pos, target), path };
  }, [s.returning, pos, start, s.track]);

  // ---------- Waypoints ----------
  const draftWp = (lat: number, lon: number): Waypoint => ({ id: '', name: t('wp_default', { n: wps.length + 1 }), kind: 'mark', lat, lon, at: 0 });
  const center = () => chart.current?.getView() ?? viewRef.current ?? initialView;
  const hitWp = (lon: number, lat: number) => {
    const v = chart.current?.getView();
    if (!v) return null;
    const m = mPerPx(v);
    let best: Waypoint | null = null, bd = 28;
    for (const w of wps) { const px = (distanceNm({ lat, lon }, w) * 1852) / m; if (px < bd) { bd = px; best = w; } }
    return best;
  };
  const quickSave = async () => {
    if (!pos) return;
    const w: Waypoint = { ...draftWp(pos.lat, pos.lon), id: newId(), at: Date.now() };
    await putWaypoint(w).catch(() => {});
    notifyNavData();
    setToast(t('point_saved'));
  };
  function startGoto(w: Waypoint) {
    if (!asked) allow();
    goTo({ lat: w.lat, lon: w.lon, name: w.name, wpId: w.id });
    setTab('nav'); setMode('view'); setSelWp(w.id);
    const p = s.pos;
    setFollow(false);
    chart.current?.fit(p ? [[w.lon, w.lat], [p.lon, p.lat]] : [[w.lon, w.lat]], 15);
  }

  // ---------- Route planning ----------
  function startPlan(r?: Route) {
    setPlan(r ? { id: r.id, name: r.name, pts: r.points } : { name: t('route_default', { n: routes.length + 1 }), pts: [] });
    setMode('plan'); setTab('routes'); setSelRoute(null); setFollow(false);
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
    if (w) { setSelWp(w.id); setEditWp(w); } else setSelWp(null);
  };
  const onLong = (lon: number, lat: number) => {
    if (mode === 'plan') { addPlanPoint(lat, lon); return; }
    setEditWp(draftWp(lat, lon));
  };

  // ---------- Trip ----------
  const onEnd = async () => {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 3500); return; }
    setConfirmEnd(false);
    setDone(await endTrip());
  };
  const onStart = () => startTrip(activity, t('trip_default', { activity: t(`act_${activity}`) }));

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await importGpxFile(f);
      setToast(t('imported', { w: r.waypoints, r: r.routes, t: r.tracks }));
    } catch { setToast(t('import_bad')); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const gpsChip = (() => {
    const g = s.gps;
    const cls = g === 'ok' ? 'bg-good text-white' : g === 'weak' || g === 'searching' ? 'bg-caution text-white' : 'bg-slate-500 text-white';
    const label = g === 'ok' ? t('gps_ok') : g === 'weak' ? t('gps_weak') : g === 'searching' ? t('gps_searching') : g === 'denied' ? t('gps_denied') : g === 'unavailable' ? t('gps_unavail') : g === 'unsupported' ? t('gps_unsupported') : t('gps_off');
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow ${cls}`}><Satellite size={13} className={g === 'searching' ? 'animate-pulse' : ''} />{label}{pos && (g === 'ok' || g === 'weak') && <span className="opacity-80">{t('gps_acc', { m: Math.round(pos.acc) })}</span>}</span>;
  })();

  const elapsed = trip ? Date.now() - trip.startedAt : 0;
  const eta = (nm: number) => (pos?.speedKn && pos.speedKn > 1 ? tm(untilMsg(Date.now() + Math.max(60e3, (nm / pos.speedKn) * 3600e3), Date.now())) : null);
  const a = guide.active;
  const activeTarget = a && !a.arrived ? a.pts[a.leg] : null;
  const shownRoute = plan ? null : selRoute;
  const wpsByDist = useMemo(() => (pos ? [...wps].sort((x, y) => distanceNm(pos, x) - distanceNm(pos, y)) : wps), [wps, pos]);

  const mapBtn = 'tap grid h-11 w-11 place-items-center rounded-xl bg-white text-ink shadow-md ring-1 ring-black/5 dark:bg-[#0A2B40] dark:text-white';

  return (
    <AppShell title={t('nav_navigate')} showSpot={false} hideCaptain>
      <div className="-mx-4 md:mx-0 lg:grid lg:grid-cols-12 lg:gap-4">
        {/* ================= CHART ================= */}
        <div className="relative lg:sticky lg:top-4 lg:col-span-8 lg:self-start">
          <ChartView ref={chart} layer={nav.layer} seamarks={nav.seamarks} initial={initialView} label={t('chart')}
            className="h-[60vh] min-h-[340px] w-full md:rounded-3xl lg:h-[calc(100vh-8rem)]"
            onTap={onTap} onLongPress={onLong} onUserMove={() => setFollow(false)} doubleTapZoom={mode !== 'plan'}
            onViewChange={(v) => { viewRef.current = v; }}
            overlay={
              <>
                <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <div className="flex flex-col items-start gap-1.5">
                    {gpsChip}
                    {trip && <span className="inline-flex items-center gap-1.5 rounded-full bg-bad px-2.5 py-1 text-[11px] font-bold text-white shadow"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />{t('tracking')} · {fmtDuration(elapsed)}</span>}
                    {guide.anchor && <span className="inline-flex items-center gap-1.5 rounded-full bg-abyss px-2.5 py-1 text-[11px] font-bold text-white shadow"><Anchor size={12} /> {pos ? `${Math.round(anchorDriftM(guide.anchor, pos))} m` : '—'} / {guide.anchor.radiusM} m</span>}
                  </div>
                  <button data-chart-ui onClick={() => setSos(true)} className="tap pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-bad px-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg ring-2 ring-white">
                    <LifeBuoy size={18} /> {t('sos')}
                  </button>
                </div>
                {a && activeTarget && pos && mode === 'view' && (
                  <button data-chart-ui onClick={() => setTab('nav')} className="absolute start-3 top-[5.5rem] flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-2xl bg-[#C026D3] px-3 py-2 text-white shadow-lg">
                    <Navigation size={16} className="shrink-0" style={{ transform: `rotate(${bearing(pos, activeTarget) - 45}deg)` }} />
                    <span className="min-w-0 truncate text-sm font-semibold">{activeTarget.name || t('next_wp')}</span>
                    <span className="shrink-0 font-display text-lg font-semibold tabular-nums">{fmtDist(distanceNm(pos, activeTarget))}<span className="text-xs"> {distUnit(distanceNm(pos, activeTarget))}</span></span>
                    <span className="shrink-0 font-display text-lg font-semibold tabular-nums">{String(Math.round(bearing(pos, activeTarget))).padStart(3, '0')}°</span>
                  </button>
                )}
                <div data-chart-ui className="absolute bottom-8 end-3 flex flex-col gap-2">
                  <button className={mapBtn} onClick={() => setLayersOpen(true)} aria-label={t('layers')} title={t('layers')}><Layers size={19} /></button>
                  <button className={mapBtn} onClick={() => chart.current?.zoomBy(1)} aria-label={t('zoom_in')} title={t('zoom_in')}><Plus size={20} /></button>
                  <button className={mapBtn} onClick={() => chart.current?.zoomBy(-1)} aria-label={t('zoom_out')} title={t('zoom_out')}><Minus size={20} /></button>
                  <button className={`${mapBtn} ${follow && pos ? '!bg-[#0A84FF] !text-white' : ''}`} onClick={() => { if (!asked) allow(); setFollow(true); if (pos) chart.current?.setView({ lon: pos.lon, lat: pos.lat }); }} aria-label={t('follow')} title={t('follow')}><LocateFixed size={19} /></button>
                </div>
                {mode === 'addwp' && (
                  <>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center"><Crosshair size={44} strokeWidth={1.5} className="text-[#C026D3] drop-shadow" /></div>
                    <div data-chart-ui className="absolute bottom-8 start-3 end-[4.25rem] flex flex-wrap gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-[#0A2B40]/95">
                      <button onClick={() => { const c = center(); setEditWp(draftWp(c.lat, c.lon)); setMode('view'); }} className="tap h-11 flex-1 rounded-xl bg-[#C026D3] px-3 text-sm font-bold text-white">{t('drop_here')}</button>
                      {pos && <button onClick={() => { setEditWp(draftWp(pos.lat, pos.lon)); setMode('view'); }} className="tap h-11 rounded-xl bg-slate-100 px-3 text-sm font-semibold dark:bg-white/10">{t('at_boat')}</button>}
                      <button onClick={() => setMode('view')} aria-label={t('cancel')} className="tap grid h-11 w-11 place-items-center rounded-xl bg-slate-100 dark:bg-white/10"><X size={18} /></button>
                    </div>
                  </>
                )}
                {mode === 'plan' && plan && (
                  <div data-chart-ui className="absolute bottom-8 start-3 end-[4.25rem] flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-[#0A2B40]/95">
                    <p className="min-w-0 flex-1 px-1 text-sm leading-tight">
                      <span className="block font-semibold">{t('plan_pts', { n: plan.pts.length })}</span>
                      <span className="muted tabular-nums">{fmtDist(pathNm(plan.pts))} {distUnit(pathNm(plan.pts))}</span>
                    </p>
                    <button onClick={() => setPlan({ ...plan, pts: plan.pts.slice(0, -1) })} disabled={!plan.pts.length} aria-label={t('undo')} className="tap grid h-11 w-11 place-items-center rounded-xl bg-slate-100 disabled:opacity-40 dark:bg-white/10"><Undo2 size={18} /></button>
                    <button onClick={savePlan} className="tap h-11 rounded-xl bg-[#C026D3] px-4 text-sm font-bold text-white">{t('save')}</button>
                    <button onClick={cancelPlan} aria-label={t('cancel')} className="tap grid h-11 w-11 place-items-center rounded-xl bg-slate-100 dark:bg-white/10"><X size={18} /></button>
                  </div>
                )}
                {toast && <p className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-max max-w-[85%] rounded-2xl bg-abyss/95 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"><Check size={14} className="me-1 inline" />{toast}</p>}
              </>
            }>
            {(p, v) => {
              const mpp = mPerPx(v);
              return (
                <g>
                  <TrackLine pts={s.track} p={p} />
                  {ret && <DashLine pts={ret.path} p={p} />}
                  {shownRoute && <RouteLine pts={shownRoute.points} p={p} z={v.z} />}
                  {a && a.kind === 'route' && <RouteLine pts={a.pts} p={p} active={a.arrived ? -1 : a.leg} z={v.z} />}
                  {plan && <RouteLine pts={plan.pts} p={p} z={v.z} dashed />}
                  {guide.anchor && <AnchorCircle an={guide.anchor} p={p} mpp={mpp} drifted={!!pos && anchorDriftM(guide.anchor, pos) > guide.anchor.radiusM} />}
                  <WaypointMarkers wps={wps} p={p} selected={selWp} z={v.z} />
                  {start && <StartMarker at={start} p={p} />}
                  {pos && activeTarget && <BearingLine from={pos} to={activeTarget} p={p} />}
                  {pos && <BoatMarker pos={pos} p={p} mpp={mpp} />}
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
              {!asked && (
                <section className="card p-4">
                  <p className="flex items-center gap-2 font-semibold"><LocateFixed size={18} className="text-lagoon" /> {t('perm_title')}</p>
                  <p className="muted mt-1 text-sm leading-snug">{t('perm_t')}</p>
                  <button onClick={allow} className="tap mt-3 h-12 w-full rounded-2xl bg-abyss font-semibold text-white">{t('perm_btn')}</button>
                </section>
              )}
              {asked && (s.gps === 'denied' || s.gps === 'unavailable' || s.gps === 'unsupported') && (
                <section className="card border-caution/40 p-4">
                  <p className="font-semibold">{s.gps === 'denied' ? t('gps_denied') : s.gps === 'unavailable' ? t('gps_unavail') : t('gps_unsupported')}</p>
                  <p className="muted mt-1 text-sm">{s.gps === 'denied' ? t('gps_denied_t') : t('gps_unavail_t')}</p>
                  {s.gps !== 'unsupported' && <button onClick={() => { releaseGps(); startGps(); }} className="tap mt-3 inline-flex items-center gap-1.5 rounded-full bg-abyss px-4 py-2 text-sm font-semibold text-white"><RefreshCw size={14} /> {t('try_again')}</button>}
                </section>
              )}
              {asked && s.gps === 'searching' && !pos && (
                <section className="card flex items-center gap-3 p-4">
                  <span className="relative grid h-10 w-10 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-caution/30" /><Satellite size={20} className="text-caution" /></span>
                  <span><span className="block font-semibold">{t('gps_searching')}</span><span className="muted text-sm">{t('gps_searching_t')}</span></span>
                </section>
              )}
              {s.resumed && trip && <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-400/10 dark:text-sky-200">{t('trip_resumed')}</p>}

              {a && <GuidanceCard a={a} pos={pos} />}
              {guide.anchor && <AnchorCard an={guide.anchor} pos={pos} />}

              {ret && (
                <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A2E0E] to-buoy text-white shadow-lg">
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
                      <Navigation size={36} fill="#fff" style={{ transform: `rotate(${ret.steer - (pos?.cog ?? 0) - 45}deg)` }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{t('along_track')}</p>
                      <p className="readout text-[40px]"><bdi>{fmtDist(ret.along)}</bdi><span className="ms-1 font-sans text-base font-medium text-white/70">{distUnit(ret.along)}</span></p>
                      <p className="text-sm text-white/85">{t('eta')}: <b>{eta(ret.along) ?? t('eta_na')}</b></p>
                      <p className="text-xs text-white/70">{t('to_start')} {fmtDist(ret.direct)} {distUnit(ret.direct)} · {t('bearing')} {Math.round(ret.brgStart)}°</p>
                    </div>
                  </div>
                  <p className="bg-black/20 px-4 py-2 text-xs leading-snug text-white/85">{t('follow_track')}</p>
                </section>
              )}

              <section className="grid grid-cols-2 gap-2">
                <Inst label={t('speed')} value={pos?.speedKn != null ? pos.speedKn.toFixed(1) : '0.0'} unit={t('unit_kn')} big />
                <Inst label={t('cog')} value={pos?.cog != null ? `${String(Math.round(pos.cog)).padStart(3, '0')}°` : '—'} unit="" big />
                <Inst label={t('distance')} value={trip ? fmtDist(trip.distanceNm) : '0.00'} unit={trip ? distUnit(trip.distanceNm) : 'NM'} />
                <Inst label={t('elapsed')} value={trip ? fmtDuration(elapsed) : '0:00'} unit="" />
              </section>
              <section className="card flex items-center justify-between gap-3 px-4 py-3">
                <span className="eyebrow">{t('position')}</span>
                {pos ? <span dir="ltr" className="font-display text-lg font-semibold tabular-nums">{fmtLat(pos.lat)}  {fmtLon(pos.lon)}</span> : <span className="muted text-sm">{t('em_no_fix')}</span>}
              </section>

              {!trip ? (
                <button onClick={onStart} disabled={!asked || s.gps === 'denied' || s.gps === 'unsupported'}
                  className="tap flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-good text-lg font-bold uppercase tracking-wide text-white shadow-lg disabled:opacity-40">
                  <Play size={20} fill="#fff" /> {t('start_trip')}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setReturning(!s.returning)} disabled={!start}
                    className={`tap col-span-2 flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold uppercase tracking-wide shadow-lg disabled:opacity-40 ${s.returning ? 'bg-white text-buoy ring-2 ring-buoy dark:bg-transparent' : 'bg-buoy text-white'}`}>
                    {s.returning ? <><X size={20} /> {t('stop_return')}</> : <><Undo2 size={20} /> {t('return_start')}</>}
                  </button>
                  <button onClick={quickSave} disabled={!pos} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold disabled:opacity-40 dark:bg-white/10"><MapPinPlus size={19} /> {t('save_point')}</button>
                  <button onClick={onEnd} className={`tap flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold ${confirmEnd ? 'bg-bad text-white' : 'bg-slate-100 text-bad dark:bg-white/10'}`}>
                    <Square size={16} fill="currentColor" /> {confirmEnd ? t('end_confirm') : t('end_trip')}
                  </button>
                </div>
              )}
              {trip && !start && <p className="muted text-center text-xs"><Flag size={12} className="me-1 inline" />{t('no_start')}</p>}

              <div className="grid grid-cols-3 gap-2">
                <QuickBtn icon={<MapPinPlus size={20} />} label={t('add_wp')} onClick={() => { setMode('addwp'); setFollow(false); }} />
                <QuickBtn icon={<RouteIcon size={20} />} label={t('plan_route')} onClick={() => startPlan()} />
                <QuickBtn icon={<Anchor size={20} />} label={guide.anchor ? t('anchor_on') : t('anchor_set')} onClick={() => { if (guide.anchor) { setTab('tools'); return; } if (!setAnchor(50)) setToast(t('em_no_fix')); }} />
              </div>
              <p className="muted text-center text-xs">{t('long_press_hint')}</p>
            </>
          )}

          {/* ---------- MARKS TAB ---------- */}
          {tab === 'marks' && (
            <>
              <div className="flex gap-2">
                <button onClick={() => { setMode('addwp'); setFollow(false); }} className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C026D3] font-semibold text-white"><MapPinPlus size={18} /> {t('add_wp')}</button>
                <button onClick={quickSave} disabled={!pos} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 font-semibold disabled:opacity-40 dark:bg-white/10"><LocateFixed size={18} /> {t('at_boat')}</button>
              </div>
              {wps.length === 0 ? <p className="card muted p-4 text-sm">{t('no_wps')}</p> : (
                <ul className="card divide-y divide-slate-100 overflow-hidden dark:divide-white/10">
                  {wpsByDist.map((w) => {
                    const k = kindOf(w.kind), d = pos ? distanceNm(pos, w) : null;
                    return (
                      <li key={w.id} className={`flex items-center gap-2 px-3 py-2.5 ${selWp === w.id ? 'bg-lagoon/5' : ''}`}>
                        <button onClick={() => { setSelWp(w.id); setFollow(false); chart.current?.setView({ lon: w.lon, lat: w.lat, z: Math.max(13, viewRef.current?.z ?? 13) }); }} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: k.color }}><k.Icon size={18} /></span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{w.name}</span>
                            <span className="muted block text-xs tabular-nums">{d != null && pos ? `${fmtDist(d)} ${distUnit(d)} · ${String(Math.round(bearing(pos, w))).padStart(3, '0')}°` : <bdi dir="ltr">{fmtLat(w.lat)} {fmtLon(w.lon)}</bdi>}</span>
                          </span>
                        </button>
                        <button onClick={() => setEditWp(w)} className="tap h-9 shrink-0 rounded-full bg-slate-100 px-3 text-xs font-semibold dark:bg-white/10">{t('edit')}</button>
                        <button onClick={() => startGoto(w)} className="tap flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#C026D3] px-3 text-xs font-bold text-white"><Navigation size={13} /> {t('go')}</button>
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
                {pos && <button onClick={() => setPlan({ ...plan, pts: [...plan.pts, { lat: pos.lat, lon: pos.lon, name: t('my_position') }] })} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-sm font-semibold dark:bg-white/10"><LocateFixed size={15} /> {t('add_boat_pt')}</button>}
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
                      const startD = pos ? distanceNm(pos, r.points[0]) : null;
                      return (
                        <li key={r.id} className={`card flex items-center gap-3 p-3 ${selRoute?.id === r.id ? 'ring-2 ring-[#C026D3]' : ''}`}>
                          <button onClick={() => { setSelRoute(r); setFollow(false); chart.current?.fit(r.points.map((q) => [q.lon, q.lat])); }} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C026D3]/10 text-[#C026D3]"><RouteIcon size={19} /></span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{r.name}</span>
                              <span className="muted block text-xs tabular-nums">{t('n_points', { n: r.points.length })} · {fmtDist(nm)} {distUnit(nm)}{startD != null ? ` · ${t('start_away', { d: `${fmtDist(startD)} ${distUnit(startD)}` })}` : ''}</span>
                            </span>
                          </button>
                          <button onClick={() => navigateRoute(r, r.points)} className="tap flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#C026D3] px-3 text-xs font-bold text-white"><Navigation size={13} /> {t('go')}</button>
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
                {guide.anchor ? <div className="mt-3"><AnchorCard an={guide.anchor} pos={pos} /></div> : (
                  <div className="mt-3 flex gap-1.5">
                    {[25, 50, 100, 200].map((r) => (
                      <button key={r} disabled={!pos} onClick={() => { setAnchor(r); setToast(t('anchor_on')); }} className="tap h-11 flex-1 rounded-xl bg-abyss text-sm font-semibold text-white disabled:opacity-40 dark:bg-shallows dark:text-abyss">{r} m</button>
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
                  <button role="switch" aria-checked={nav.sound} aria-label={t('alarm_sound')} onClick={() => setNav({ sound: !nav.sound })} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${nav.sound ? 'bg-good' : 'bg-slate-300 dark:bg-white/20'}`}>
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${nav.sound ? 'start-[22px]' : 'start-0.5'}`} />
                  </button>
                </Row>
              </section>
              <section className="card p-4">
                <p className="font-semibold">{t('gpx_title')}</p>
                <p className="muted mt-1 text-sm">{t('gpx_t')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => fileRef.current?.click()} className="tap flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Upload size={16} /> {t('import_gpx')}</button>
                  <button onClick={() => exportAllGpx().catch(() => {})} className="tap flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Download size={16} /> {t('export_gpx')}</button>
                </div>
                <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
              </section>
              <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">{t('nav_aid')} {t('chart_note')}</p>
            </>
          )}
        </div>
      </div>

      {layersOpen && <LayerSheet layer={nav.layer} seamarks={nav.seamarks} onClose={() => setLayersOpen(false)} onChange={(p) => setNav(p)} />}
      {editWp && <WaypointSheet wp={editWp} pos={pos} onClose={() => setEditWp(null)} onGoTo={startGoto} onSaved={(w) => setSelWp(w?.id ?? null)} />}
      {shownRoute && tab === 'routes' && (
        <Sheet title={t('route')} onClose={() => setSelRoute(null)} wide>
          <RouteDetail route={shownRoute} onNavigate={(pts) => navigateRoute(shownRoute, pts)} onEdit={() => startPlan(shownRoute)}
            onDeleted={() => setSelRoute(null)} onRenamed={(r) => setSelRoute(r)} />
        </Sheet>
      )}
      <EmergencySheet open={sos} onClose={() => setSos(false)} pos={pos} canReturn={!!trip && !!start} onReturn={() => setReturning(true)} onSave={quickSave} />
      {done && <TripDone trip={done} onClose={() => setDone(null)} onOpen={() => router.push(`/trips?trip=${done.id}`)} />}
    </AppShell>
  );
}

function Inst({ label, value, unit, big }: { label: string; value: string; unit: string; big?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className={`readout mt-1 ${big ? 'text-[42px]' : 'text-[30px]'}`}><bdi>{value}</bdi>{unit && <span className="ms-1 font-sans text-sm font-medium text-slate-400">{unit}</span>}</p>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card tap flex flex-col items-center gap-1.5 p-3 text-center text-xs font-semibold">
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
          className={`tap h-8 rounded-lg px-2 text-xs font-semibold tabular-nums ${value === o ? 'bg-white text-ink shadow-sm dark:bg-[#0A2B40] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{fmt(o)}</button>
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

function TripDone({ trip, onClose, onOpen }: { trip: Trip; onClose: () => void; onOpen: () => void }) {
  const { t } = useT();
  const [name, setName] = useState(trip.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const saveIt = async () => { await putTrip({ ...trip, name: name.trim() || trip.name }).catch(() => {}); onOpen(); };
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    await deleteTrip(trip.id).catch(() => {});
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t('trip_complete')}>
      <div className="absolute inset-0 bg-abyss/60" />
      <div className="animate-rise relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-2xl dark:bg-[#0A2B40] md:rounded-3xl">
        <p className="flex items-center gap-2 text-good"><Check size={20} /><span className="font-display text-3xl font-bold uppercase text-ink dark:text-white">{t('trip_complete')}</span></p>
        <div className="mt-4"><TripStats trip={trip} /></div>
        <label className="mt-4 block text-sm font-medium">{t('trip_name')}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
        </label>
        <button onClick={saveIt} className="tap mt-4 h-14 w-full rounded-2xl bg-abyss text-lg font-bold text-white">{t('save_trip')}</button>
        <button onClick={del} className={`tap mt-2 h-12 w-full rounded-2xl font-semibold ${confirmDel ? 'bg-bad text-white' : 'text-bad'}`}>{confirmDel ? t('discard_confirm') : t('discard')}</button>
      </div>
    </div>
  );
}
