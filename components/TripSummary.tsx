import { useT } from '@/lib/i18n/LangContext';
import type { Trip } from '@/lib/nav/db';
import type { TripAnalysis } from '@/lib/nav/tripstats';
import { distUnit, fmtDist, fmtDuration, fmtLat, fmtLon } from '@/lib/nav/geo';

export function tripStats(trip: Trip) {
  const dur = (trip.endedAt ?? Date.now()) - trip.startedAt;
  const avg = dur > 60e3 ? trip.distanceNm / (dur / 3600e3) : 0;
  return { dur, avg };
}

export function TripStats({ trip, an }: { trip: Trip; an?: TripAnalysis | null }) {
  const { t, lang } = useT();
  const { dur, avg } = tripStats(trip);
  const cells: [string, string, string][] = [
    [t('distance'), fmtDist(trip.distanceNm), distUnit(trip.distanceNm)],
    [t('duration'), fmtDuration(dur), ''],
    [t('max_speed'), trip.maxKn.toFixed(1), t('unit_kn')],
    // Average while moving (stops excluded) when the track is available.
    [an?.avgMovingKn != null ? t('ts_avg_moving') : t('avg_speed'), (an?.avgMovingKn ?? avg).toFixed(1), t('unit_kn')],
  ];
  if (an) {
    cells.push([t('ts_moving'), fmtDuration(an.movingMs), '']);
    cells.push([t('ts_stops'), String(an.stops.length), an.stops.length ? fmtDuration(an.stops.reduce((x, s) => x + s.end - s.start, 0)) : '']);
  }
  const fuel = trip.fuelUsedL ?? an?.fuelL ?? null;
  if (fuel != null) cells.push([t('ts_fuel_est'), `≈ ${Math.round(fuel)}`, 'L']);
  const when = new Date(trip.startedAt).toLocaleString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map(([l, v, u]) => (
          <div key={l} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <dt className="eyebrow">{l}</dt>
            <dd className="readout mt-1 text-[30px]"><bdi>{v}</bdi><span className="ms-1 font-sans text-sm font-medium text-slate-400">{u}</span></dd>
          </div>
        ))}
      </dl>
      <dl className="mt-2 grid gap-1 text-xs">
        <div className="flex justify-between gap-2"><dt className="muted">{when}</dt></div>
        {trip.start && <div className="flex justify-between gap-2"><dt className="muted">{t('start_pt')}</dt><dd dir="ltr" className="tabular-nums">{fmtLat(trip.start.lat)} {fmtLon(trip.start.lon)}</dd></div>}
        {trip.end && <div className="flex justify-between gap-2"><dt className="muted">{t('end_pt')}</dt><dd dir="ltr" className="tabular-nums">{fmtLat(trip.end.lat)} {fmtLon(trip.end.lon)}</dd></div>}
        {trip.conditions && <div className="flex justify-between gap-2"><dt className="muted">{t('ts_cond_start')}</dt><dd className="text-end tabular-nums">{trip.conditions.windKn != null ? `${Math.round(trip.conditions.windKn)} ${t('unit_kn')}` : '—'} · {trip.conditions.waveM != null ? `${trip.conditions.waveM.toFixed(1)} ${t('unit_m')}` : '—'}{trip.conditions.tide ? ` · ${t(`ct_tide_${trip.conditions.tide}`)}` : ''} <span className="muted">({t('src_forecast_short')})</span></dd></div>}
        {fuel != null && <div className="muted text-[11px]">{t('ts_fuel_note')}</div>}
      </dl>
    </div>
  );
}
