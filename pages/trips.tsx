import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ChevronRight, Compass, MapPin, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ActivityIcon } from '@/components/ActivityIcon';
import { Checklist } from '@/components/Checklist';
import { TrackMap } from '@/components/TrackMap';
import { TripStats, tripStats } from '@/components/TripSummary';
import { SectionTitle, Skeleton } from '@/components/ui';
import { useT } from '@/lib/i18n/LangContext';
import { allTrips, allWaypoints, deleteTrip, deleteWaypoint, getTrip, tripPoints, Trip, Waypoint } from '@/lib/nav/db';
import { distUnit, fmtDist, fmtDuration, fmtLat, fmtLon } from '@/lib/nav/geo';
import { ACTIVITIES, ActivityId } from '@/lib/marine/activities';

export default function TripsPage() {
  const { t } = useT();
  const router = useRouter();
  const id = typeof router.query.trip === 'string' ? router.query.trip : null;
  return (
    <AppShell title={t('nav_trips')} showSpot={false}>
      {id ? <TripDetail id={id} /> : <TripsHome />}
    </AppShell>
  );
}

function TripsHome() {
  const { t, lang } = useT();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [wps, setWps] = useState<Waypoint[]>([]);
  useEffect(() => {
    allTrips().then(setTrips).catch(() => setTrips([]));
    allWaypoints().then(setWps).catch(() => {});
  }, []);
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const saved = (trips ?? []).filter((x) => x.status === 'saved');
  const active = (trips ?? []).find((x) => x.status === 'active');

  return (
    <div className="space-y-3 pb-6">
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
        <ul className="grid gap-2 md:grid-cols-2">
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

      {wps.length > 0 && (
        <>
          <SectionTitle>{t('waypoints')}</SectionTitle>
          <ul className="card divide-y divide-slate-100 dark:divide-white/10">
            {wps.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                <MapPin size={18} className="shrink-0 text-violet-600" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{w.name}</span>
                  <span dir="ltr" className="muted block text-xs tabular-nums">{fmtLat(w.lat)} {fmtLon(w.lon)}</span>
                </span>
                <a href={`https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lon}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-lagoon dark:text-shallows">{t('open_maps')}</a>
                <button onClick={() => { deleteWaypoint(w.id).catch(() => {}); setWps(wps.filter((x) => x.id !== w.id)); }} aria-label={t('delete_item', { item: w.name })} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:text-bad"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div id="readiness" className="scroll-mt-20 pt-2">
        <SectionTitle>{t('readiness')}</SectionTitle>
        <div className="mt-2"><Checklist /></div>
      </div>
    </div>
  );
}

function TripDetail({ id }: { id: string }) {
  const { t } = useT();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [track, setTrack] = useState<[number, number][]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    getTrip(id).then((x) => setTrip(x ?? null)).catch(() => setTrip(null));
    tripPoints(id).then((p) => setTrack(p.map((q) => [q.lon, q.lat]))).catch(() => {});
  }, [id]);
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500); return; }
    await deleteTrip(id).catch(() => {});
    router.replace('/trips');
  };
  if (trip === undefined) return <Skeleton className="h-96" />;
  if (trip === null) return <p className="muted p-4">{t('err_generic')}</p>;
  return (
    <div className="space-y-3 pb-6">
      <button onClick={() => router.push('/trips')} className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon dark:text-shallows"><ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}</button>
      <h2 className="font-display text-3xl font-semibold">{trip.name}</h2>
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <section className="card overflow-hidden lg:col-span-7">
          <TrackMap track={track} start={trip.start} className="h-[340px] w-full md:h-[440px]" />
        </section>
        <section className="card p-4 lg:col-span-5">
          <TripStats trip={trip} />
          <p className="muted mt-3 text-xs">{t('recorded')}: {track.length} GPS · {t('base_map')}</p>
          <button onClick={del} className={`tap mt-4 inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${confirmDel ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}>
            <Trash2 size={15} /> {confirmDel ? t('discard_confirm') : t('discard')}
          </button>
        </section>
      </div>
    </div>
  );
}
