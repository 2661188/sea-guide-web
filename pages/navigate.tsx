import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Check, Flag, LifeBuoy, LocateFixed, MapPin, MapPinPlus, Navigation2, Play, RefreshCw, Satellite, Square, Undo2, X } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TrackMap } from '@/components/TrackMap';
import { EmergencySheet } from '@/components/EmergencySheet';
import { TripStats } from '@/components/TripSummary';
import { useT } from '@/lib/i18n/LangContext';
import { useSpot } from '@/lib/SpotContext';
import { endTrip, releaseGps, setReturning, startGps, startTrip, useTracker } from '@/lib/nav/tracker';
import { allWaypoints, deleteTrip, newId, putTrip, putWaypoint, Trip, Waypoint } from '@/lib/nav/db';
import { bearing, distanceNm, distUnit, fmtDist, fmtDuration, fmtLat, fmtLon } from '@/lib/nav/geo';
import { load, save } from '@/lib/storage';
import { untilMsg } from '@/lib/marine/time';

export default function Navigate() {
  const { t, tm } = useT();
  const router = useRouter();
  const { activity } = useSpot();
  const s = useTracker();
  const [asked, setAsked] = useState(false);
  const [sos, setSos] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [done, setDone] = useState<Trip | null>(null);
  const [wps, setWps] = useState<Waypoint[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    setAsked(load('gpsAsked', false));
    allWaypoints().then(setWps).catch(() => {});
  }, []);
  // Start GPS automatically once the user has agreed; stop it when leaving (unless recording).
  useEffect(() => { if (asked) startGps(); return () => releaseGps(); }, [asked]);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2200); return () => clearTimeout(id); }, [toast]);

  const allow = () => { save('gpsAsked', true); setAsked(true); startGps(); };
  const pos = s.pos;
  const trip = s.trip;
  const start = trip?.start ?? null;

  // Return-to-start: follow the recorded track back from the nearest point to it.
  const ret = useMemo(() => {
    if (!s.returning || !pos || !start || s.track.length < 1) return null;
    let k = 0, best = Infinity;
    s.track.forEach(([lon, lat], i) => { const d = distanceNm(pos, { lat, lon }); if (d < best) { best = d; k = i; } });
    let along = best;
    for (let i = k; i > 0; i--) along += distanceNm({ lon: s.track[i][0], lat: s.track[i][1] }, { lon: s.track[i - 1][0], lat: s.track[i - 1][1] });
    // Steer toward a point about 150 m back along the track
    let j = k, acc = best;
    while (j > 0 && acc < 0.08) { acc += distanceNm({ lon: s.track[j][0], lat: s.track[j][1] }, { lon: s.track[j - 1][0], lat: s.track[j - 1][1] }); j--; }
    const target = { lon: s.track[j][0], lat: s.track[j][1] };
    const path: [number, number][] = [[pos.lon, pos.lat], ...s.track.slice(0, k + 1).reverse()];
    return { along, direct: distanceNm(pos, start), brgStart: bearing(pos, start), steer: bearing(pos, target), path };
  }, [s.returning, pos, start, s.track]);

  const savePoint = async () => {
    if (!pos) return;
    const w: Waypoint = { id: newId(), name: t('wp_default', { n: wps.length + 1 }), kind: 'mark', lat: pos.lat, lon: pos.lon, at: Date.now() };
    await putWaypoint(w).catch(() => {});
    setWps([w, ...wps]);
    setToast(t('point_saved'));
  };
  const onEnd = async () => {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 3500); return; }
    setConfirmEnd(false);
    setDone(await endTrip());
  };
  const onStart = () => startTrip(activity, t('trip_default', { activity: t(`act_${activity}`) }));

  const gpsChip = (() => {
    const g = s.gps;
    const cls = g === 'ok' ? 'bg-good text-white' : g === 'weak' || g === 'searching' ? 'bg-caution text-white' : 'bg-slate-500 text-white';
    const label = g === 'ok' ? t('gps_ok') : g === 'weak' ? t('gps_weak') : g === 'searching' ? t('gps_searching') : g === 'denied' ? t('gps_denied') : g === 'unavailable' ? t('gps_unavail') : g === 'unsupported' ? t('gps_unsupported') : t('gps_off');
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow ${cls}`}><Satellite size={13} className={g === 'searching' ? 'animate-pulse' : ''} />{label}{pos && (g === 'ok' || g === 'weak') && <span className="opacity-80">{t('gps_acc', { m: Math.round(pos.acc) })}</span>}</span>;
  })();

  const elapsed = trip ? Date.now() - trip.startedAt : 0;
  const eta = (nm: number) => (pos?.speedKn && pos.speedKn > 1 ? tm(untilMsg(Date.now() + Math.max(60e3, (nm / pos.speedKn) * 3600e3), Date.now())) : null);

  return (
    <AppShell title={t('nav_navigate')} showSpot={false} hideCaptain>
      <div className="-mx-4 md:mx-0">
        {/* MAP */}
        <div className="relative md:overflow-hidden md:rounded-3xl">
          <TrackMap track={s.track} start={start} pos={pos} returnPath={ret?.path ?? null} waypoints={wps} className="h-[52vh] min-h-[300px] w-full md:h-[480px]" />
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="pointer-events-auto flex flex-col items-start gap-1.5">
              {gpsChip}
              {trip && <span className="inline-flex items-center gap-1.5 rounded-full bg-bad px-2.5 py-1 text-[11px] font-bold text-white shadow"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />{t('tracking')} · {fmtDuration(elapsed)}</span>}
            </div>
            <button onClick={() => setSos(true)} className="tap pointer-events-auto flex h-12 items-center gap-1.5 rounded-full bg-bad px-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg ring-2 ring-white">
              <LifeBuoy size={18} /> {t('sos')}
            </button>
          </div>
          {toast && <p className="absolute inset-x-0 bottom-4 mx-auto w-max rounded-full bg-abyss px-4 py-2 text-sm font-semibold text-white shadow-lg"><Check size={14} className="me-1 inline" />{toast}</p>}
        </div>

        <div className="space-y-3 px-4 pt-3 md:px-0">
          {/* Permission / GPS problems */}
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

          {/* RETURN TO START panel */}
          {ret && (
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A2E0E] to-buoy text-white shadow-lg">
              <div className="flex items-center gap-4 p-4">
                <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
                  <Navigation2 size={44} style={{ transform: `rotate(${ret.steer - (pos?.cog ?? 0)}deg)` }} fill="#fff" />
                  <span className="absolute -bottom-1 rounded-full bg-white px-2 text-[10px] font-bold text-buoy">{pos?.cog != null ? `${Math.round(ret.steer)}°` : `${Math.round(ret.steer)}°T`}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{t('along_track')}</p>
                  <p className="readout text-[44px]"><bdi>{fmtDist(ret.along)}</bdi><span className="ms-1 font-sans text-base font-medium text-white/70">{distUnit(ret.along)}</span></p>
                  <p className="text-sm text-white/85">{t('eta')}: <b>{eta(ret.along) ?? t('eta_na')}</b></p>
                  <p className="text-xs text-white/70">{t('to_start')} {fmtDist(ret.direct)} {distUnit(ret.direct)} · {t('bearing')} {Math.round(ret.brgStart)}°</p>
                </div>
              </div>
              <p className="bg-black/20 px-4 py-2 text-xs leading-snug text-white/85">{t('follow_track')}</p>
            </section>
          )}

          {/* INSTRUMENTS */}
          <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Inst label={t('speed')} value={pos?.speedKn != null ? pos.speedKn.toFixed(1) : '0.0'} unit={t('unit_kn')} big />
            <Inst label={t('cog')} value={pos?.cog != null ? `${Math.round(pos.cog)}°` : '—'} unit="" big />
            <Inst label={t('distance')} value={trip ? fmtDist(trip.distanceNm) : '0.00'} unit={trip ? distUnit(trip.distanceNm) : 'NM'} />
            <Inst label={t('elapsed')} value={trip ? fmtDuration(elapsed) : '0:00'} unit="" />
          </section>
          <section className="card flex items-center justify-between gap-3 px-4 py-3">
            <span className="eyebrow">{t('position')}</span>
            {pos ? <span dir="ltr" className="font-display text-lg font-semibold tabular-nums">{fmtLat(pos.lat)}  {fmtLon(pos.lon)}</span> : <span className="muted text-sm">{t('em_no_fix')}</span>}
          </section>

          {/* CONTROLS */}
          {!trip ? (
            <button onClick={onStart} disabled={!asked || s.gps === 'denied' || s.gps === 'unsupported'}
              className="tap flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-good text-lg font-bold uppercase tracking-wide text-white shadow-lg disabled:opacity-40">
              <Play size={22} fill="#fff" /> {t('start_trip')}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setReturning(!s.returning)} disabled={!start}
                className={`tap col-span-2 flex h-16 items-center justify-center gap-2 rounded-2xl text-lg font-bold uppercase tracking-wide shadow-lg disabled:opacity-40 ${s.returning ? 'bg-white text-buoy ring-2 ring-buoy dark:bg-transparent' : 'bg-buoy text-white'}`}>
                {s.returning ? <><X size={22} /> {t('stop_return')}</> : <><Undo2 size={22} /> {t('return_start')}</>}
              </button>
              <button onClick={savePoint} disabled={!pos} className="tap flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold disabled:opacity-40 dark:bg-white/10">
                <MapPinPlus size={20} /> {t('save_point')}
              </button>
              <button onClick={onEnd} className={`tap flex h-14 items-center justify-center gap-2 rounded-2xl font-semibold ${confirmEnd ? 'bg-bad text-white' : 'bg-slate-100 text-bad dark:bg-white/10'}`}>
                <Square size={18} fill="currentColor" /> {confirmEnd ? t('end_confirm') : t('end_trip')}
              </button>
            </div>
          )}
          {trip && !start && <p className="muted text-center text-xs"><Flag size={12} className="me-1 inline" />{t('no_start')}</p>}
          {trip && <p className="muted text-center text-xs">{t('keep_open')}</p>}

          <button onClick={() => router.push('/map')} className="card tap flex w-full items-center gap-3 p-4 text-start">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lagoon/10 text-lagoon dark:text-shallows"><MapPin size={20} /></span>
            <span><span className="block font-semibold">{t('stations_link')}</span><span className="muted text-sm">{t('stations_t')}</span></span>
          </button>
          <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">{t('nav_aid')} {t('base_map')}</p>
        </div>
      </div>

      <EmergencySheet open={sos} onClose={() => setSos(false)} pos={pos} canReturn={!!trip && !!start} onReturn={() => setReturning(true)} onSave={savePoint} />
      {done && <TripDone trip={done} onClose={() => setDone(null)} onOpen={() => router.push(`/trips?trip=${done.id}`)} />}
    </AppShell>
  );
}

function Inst({ label, value, unit, big }: { label: string; value: string; unit: string; big?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className={`readout mt-1 ${big ? 'text-[46px]' : 'text-[34px]'}`}><bdi>{value}</bdi>{unit && <span className="ms-1 font-sans text-sm font-medium text-slate-400">{unit}</span>}</p>
    </div>
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
