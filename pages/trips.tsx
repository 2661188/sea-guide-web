import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ChevronRight, Compass, Download, MapPin, Navigation, Plus, Route as RouteIcon, Trash2, Upload } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ActivityIcon } from '@/components/ActivityIcon';
import { Checklist } from '@/components/Checklist';
import { MiniChart } from '@/components/nav/MiniChart';
import { RouteDetail } from '@/components/nav/RouteLegs';
import { WaypointSheet } from '@/components/nav/WaypointSheet';
import { kindOf } from '@/components/nav/kinds';
import { TripStats, tripStats } from '@/components/TripSummary';
import { SectionTitle, Skeleton } from '@/components/ui';
import { PlannedTrips } from '@/components/nav/PlannedTrips';
import { useT } from '@/lib/i18n/LangContext';
import {
  allRoutes, allTrips, allWaypoints, deleteTrip, getRoute, getTrip, newId, notifyNavData, onNavData, putRoute, Route, RoutePoint, tripPoints, Trip, TrackPoint, Waypoint,
} from '@/lib/nav/db';
import { distUnit, fmtDist, fmtDuration, fmtLat, fmtLon, pathNm, simplify } from '@/lib/nav/geo';
import { downloadText, safeName, toGpx } from '@/lib/nav/gpx';
import { followRoute, goTo } from '@/lib/nav/guide';
import { exportAllGpx, importGpxFile } from '@/lib/nav/transfer';
import { ACTIVITIES, ActivityId } from '@/lib/marine/activities';

export default function TripsPage() {
  const { t } = useT();
  const router = useRouter();
  const id = typeof router.query.trip === 'string' ? router.query.trip : null;
  const rid = typeof router.query.route === 'string' ? router.query.route : null;
  return (
    <AppShell title={t('nav_trips')} showSpot={false}>
      {id ? <TripDetail id={id} /> : rid ? <RoutePage id={rid} /> : <TripsHome />}
    </AppShell>
  );
}

function TripsHome() {
  const { t, lang } = useT();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [wps, setWps] = useState<Waypoint[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [editWp, setEditWp] = useState<Waypoint | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reload = useCallback(() => {
    allTrips().then(setTrips).catch(() => setTrips([]));
    allWaypoints().then(setWps).catch(() => {});
    allRoutes().then(setRoutes).catch(() => {});
  }, []);
  useEffect(() => { reload(); return onNavData(reload); }, [reload]);
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const saved = (trips ?? []).filter((x) => x.status === 'saved');
  const active = (trips ?? []).find((x) => x.status === 'active');
  const onImport = async (f?: File) => {
    if (!f) return;
    try { const r = await importGpxFile(f); setMsg(t('imported', { w: r.waypoints, r: r.routes, t: r.tracks })); } catch { setMsg(t('import_bad')); }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-3 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="muted flex-1 px-1 text-sm">{t('nav_registry')}</p>
        <button onClick={() => fileRef.current?.click()} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold shadow-sm dark:bg-white/10"><Upload size={15} /> {t('import_gpx')}</button>
        <button onClick={() => exportAllGpx().catch(() => {})} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold shadow-sm dark:bg-white/10"><Download size={15} /> {t('export_gpx')}</button>
        <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
      </div>
      {msg && <p className="rounded-xl bg-lagoon/10 px-3 py-2 text-sm font-semibold text-lagoon dark:text-shallows">{msg}</p>}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-4">
        <div className="space-y-3">
          <PlannedTripsSection />
          <SectionTitle>{t('my_trips')}</SectionTitle>
          {active && (
            <Link href="/navigate" className="tap flex items-center gap-3 rounded-2xl bg-bad px-4 py-3 text-white shadow">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
              <span className="flex-1 font-semibold">{t('tracking')} · {active.name}</span>
              <ChevronRight className="rtl:rotate-180" />
            </Link>
          )}
          {trips == null ? <Skeleton className="h-24" /> : saved.length === 0 ? (
            <Link href="/navigate" className="card tap flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lagoon/10 text-lagoon dark:text-shallows"><Compass size={24} /></span>
              <span className="muted flex-1 text-sm">{t('no_trips')}</span>
              <ChevronRight className="shrink-0 text-slate-400 rtl:rotate-180" />
            </Link>
          ) : (
            <ul className="grid gap-2">
              {saved.map((trip) => (
                <li key={trip.id}>
                  <Link href={`/trips?trip=${trip.id}`} className="card tap flex items-center gap-3 p-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-abyss text-shallows">
                      {(ACTIVITIES as string[]).includes(trip.activity) ? <ActivityIcon id={trip.activity as ActivityId} size={20} /> : <Compass size={20} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{trip.name}</span>
                      <span className="muted block text-xs">{date(trip.startedAt)}</span>
                    </span>
                    <span className="text-end">
                      <span className="readout block text-xl"><bdi>{fmtDist(trip.distanceNm)}</bdi> <span className="font-sans text-xs text-slate-400">{distUnit(trip.distanceNm)}</span></span>
                      <span className="muted block text-xs tabular-nums">{fmtDuration(tripStats(trip).dur)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <SectionTitle right={<Link href="/navigate?plan=1" className="inline-flex items-center gap-1 text-sm font-semibold text-[#C026D3]"><Plus size={15} /> {t('new_route')}</Link>}>{t('routes_reg')}</SectionTitle>
          {routes.length === 0 ? <p className="card muted p-4 text-sm">{t('no_routes')}</p> : (
            <ul className="grid gap-2">
              {routes.map((r) => {
                const nm = pathNm(r.points);
                return (
                  <li key={r.id} className="card flex items-center gap-3 p-3">
                    <Link href={`/trips?route=${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#C026D3]/10 text-[#C026D3]"><RouteIcon size={20} /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.name}</span>
                        <span className="muted block text-xs tabular-nums">{t('n_points', { n: r.points.length })} · {fmtDist(nm)} {distUnit(nm)}</span>
                      </span>
                    </Link>
                    <button onClick={() => { followRoute(r.id, r.name, r.points); router.push('/navigate'); }} className="tap flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#C026D3] px-3 text-xs font-bold text-white"><Navigation size={13} /> {t('go')}</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <SectionTitle right={<Link href="/navigate" className="inline-flex items-center gap-1 text-sm font-semibold text-[#C026D3]"><Plus size={15} /> {t('add_wp')}</Link>}>{t('waypoints')}</SectionTitle>
          {wps.length === 0 ? <p className="card muted p-4 text-sm">{t('no_wps')}</p> : (
            <ul className="card divide-y divide-slate-100 overflow-hidden dark:divide-white/10">
              {wps.map((w) => {
                const k = kindOf(w.kind);
                return (
                  <li key={w.id} className="flex items-center gap-2 px-3 py-2.5">
                    <button onClick={() => setEditWp(w)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: k.color }}><k.Icon size={18} /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{w.name}</span>
                        <span dir="ltr" className="muted block text-xs tabular-nums">{fmtLat(w.lat)} {fmtLon(w.lon)}</span>
                      </span>
                    </button>
                    <Link href={`/navigate?wp=${w.id}`} aria-label={t('open_on_chart')} title={t('open_on_chart')} className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-white/10"><MapPin size={16} /></Link>
                    <button onClick={() => { goTo({ lat: w.lat, lon: w.lon, name: w.name, wpId: w.id }); router.push('/navigate'); }} className="tap flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#C026D3] px-3 text-xs font-bold text-white"><Navigation size={13} /> {t('go')}</button>
                  </li>
                );
              })}
            </ul>
          )}

          <div id="readiness" className="scroll-mt-20 pt-2">
            <SectionTitle>{t('readiness')}</SectionTitle>
            <div className="mt-2"><Checklist /></div>
          </div>
        </div>
      </div>
      {editWp && <WaypointSheet wp={editWp} pos={null} onClose={() => setEditWp(null)} onGoTo={(w) => { goTo({ lat: w.lat, lon: w.lon, name: w.name, wpId: w.id }); router.push('/navigate'); }} />}
    </div>
  );
}

function RoutePage({ id }: { id: string }) {
  const { t } = useT();
  const router = useRouter();
  const [route, setRoute] = useState<Route | null | undefined>(undefined);
  useEffect(() => { getRoute(id).then((r) => setRoute(r ?? null)).catch(() => setRoute(null)); }, [id]);
  if (route === undefined) return <Skeleton className="h-96" />;
  if (route === null) return <p className="muted p-4">{t('err_generic')}</p>;
  const nav = (pts: RoutePoint[]) => { followRoute(route.id, route.name, pts); router.push('/navigate'); };
  return (
    <div className="space-y-3 pb-6">
      <button onClick={() => router.push('/trips')} className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon dark:text-shallows"><ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}</button>
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <section className="card overflow-hidden lg:col-span-7">
          <MiniChart route={route.points} className="h-[340px] w-full md:h-[460px]" />
        </section>
        <section className="card p-4 lg:col-span-5">
          <RouteDetail route={route} onNavigate={nav} onEdit={() => router.push(`/navigate?edit=${route.id}`)} onDeleted={() => router.replace('/trips')} onRenamed={setRoute} />
        </section>
      </div>
    </div>
  );
}

function TripDetail({ id }: { id: string }) {
  const { t } = useT();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    getTrip(id).then((x) => setTrip(x ?? null)).catch(() => setTrip(null));
    tripPoints(id).then(setPoints).catch(() => {});
  }, [id]);
  const track = points.map((q) => [q.lon, q.lat] as [number, number]);
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500); return; }
    await deleteTrip(id).catch(() => {});
    notifyNavData();
    router.replace('/trips');
  };
  const asRoute = async () => {
    if (!trip || points.length < 2) return;
    let tol = 0.01, pts = simplify(points, tol);
    while (pts.length > 60) { tol *= 1.6; pts = simplify(points, tol); }
    const now = Date.now();
    const r: Route = { id: newId(), name: trip.name, points: pts.map((p) => ({ lat: p.lat, lon: p.lon })), createdAt: now, updatedAt: now };
    await putRoute(r).catch(() => {});
    notifyNavData();
    setMsg(t('route_from_track'));
  };
  if (trip === undefined) return <Skeleton className="h-96" />;
  if (trip === null) return <p className="muted p-4">{t('err_generic')}</p>;
  return (
    <div className="space-y-3 pb-6">
      <button onClick={() => router.push('/trips')} className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon dark:text-shallows"><ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}</button>
      <h2 className="font-display text-3xl font-semibold">{trip.name}</h2>
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <section className="card overflow-hidden lg:col-span-7">
          <MiniChart track={track} start={trip.start} className="h-[340px] w-full md:h-[460px]" />
        </section>
        <section className="card p-4 lg:col-span-5">
          <TripStats trip={trip} />
          <p className="muted mt-3 text-xs">{t('recorded')}: {points.length} GPS</p>
          {msg && <p className="mt-2 text-sm font-semibold text-lagoon dark:text-shallows">{msg}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={asRoute} disabled={points.length < 2} className="tap inline-flex h-11 items-center gap-2 rounded-full bg-[#C026D3] px-4 text-sm font-semibold text-white disabled:opacity-40"><RouteIcon size={15} /> {t('save_as_route')}</button>
            <button onClick={() => downloadText(`${safeName(trip.name)}.gpx`, toGpx({ tracks: [{ trip, points }] }))} className="tap inline-flex h-11 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold dark:bg-white/10"><Download size={15} /> GPX</button>
            <button onClick={del} className={`tap inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${confirmDel ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}>
              <Trash2 size={15} /> {confirmDel ? t('discard_confirm') : t('discard')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function PlannedTripsSection() {
  const { t } = useT();
  const [has, setHas] = useState(false);
  useEffect(() => {
    const f = () => import('@/lib/nav/db').then((m) => m.allPlans()).then((l) => setHas(l.length > 0)).catch(() => {});
    f(); return onNavData(f);
  }, []);
  if (!has) return null;
  return (<><SectionTitle>{t('ai_planned')}</SectionTitle><PlannedTrips /></>);
}
