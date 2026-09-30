// "Your trip briefing" — shown when you press START TRIP. Summarises what the app knows
// (forecast, tide, fishing window, fuel, checklist) and then starts recording.
// Everything is labelled by source; nothing here says "safe".
import { useMemo } from 'react';
import Link from 'next/link';
import { CheckSquare, Fuel, Play, Waves, Wind } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import type { ActivityId } from '@/lib/marine/activities';
import { useConditions } from '@/lib/useConditions';
import { findExtremes, hourIndex, tideTrend, trendKey } from '@/lib/marine/tides';
import { fishingHours, fishingWindows, seaSummary } from '@/lib/marine/assess';
import { outlook } from '@/lib/marine/outlook';
import { dayKey, fmtTime, nowLocalMs } from '@/lib/marine/time';
import { loadList } from '@/lib/checklists';
import { useNavSettings } from '@/lib/nav/settings';
import { rangeNm } from '@/lib/nav/fuel';
import { Sheet } from '../Sheet';

export function TripBriefing({ activity, spotId, onStart, onClose }: { activity: ActivityId; spotId: string; onStart: () => void; onClose: () => void }) {
  const { t, tm } = useT();
  const { data } = useConditions(spotId);
  const [nav] = useNavSettings();
  const list = useMemo(() => loadList(activity), [activity]);
  const done = list.items.filter((x) => list.done[x.id]).length;

  const b = useMemo(() => {
    if (!data) return null;
    const now = nowLocalMs(data.utcOffsetSeconds), i = hourIndex(data.hourly.time, now);
    const h = data.hourly;
    const next = findExtremes(h.time, h.seaLevel).find((e) => e.at > now) ?? null;
    const hrs = fishingHours(data);
    const win = fishingWindows(data, hrs, dayKey(now), now, 1)[0] ?? null;
    return {
      now, sum: seaSummary(data, i, 4), wind: h.windSpeed[i], gust: h.windGusts[i], wave: h.waveHeight[i],
      trend: tideTrend(h.seaLevel, i), next, win, coming: outlook(data, i, 6),
    };
  }, [data]);

  const range = rangeNm(nav.fuelL, nav);
  const row = 'flex items-start justify-between gap-3 py-2.5';
  return (
    <Sheet title={t('br_title')} onClose={onClose}>
      <div className="text-sm">
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          <div className={row}><span className="muted">{t('br_departure')}</span><b className="tabular-nums">{b ? fmtTime(b.now) : new Date().toTimeString().slice(0, 5)}</b></div>
          {b ? (
            <>
              <div className={row}><span className="muted">{t('br_conditions')}</span><b className="text-end">{t(b.sum.level)}</b></div>
              <div className={row}><span className="muted flex items-center gap-1.5"><Wind size={14} /> {t('wind')}</span><b className="tabular-nums">{b.wind != null ? `${Math.round(b.wind)} ${t('unit_kn')}` : '—'}{b.gust != null ? ` · ${t('wb_gusts')} ${Math.round(b.gust)}` : ''}</b></div>
              <div className={row}><span className="muted flex items-center gap-1.5"><Waves size={14} /> {t('waves')}</span><b className="tabular-nums">{b.wave != null ? `${b.wave.toFixed(1)} ${t('unit_m')}` : '—'}</b></div>
              <div className={row}><span className="muted">{t('br_tide')}</span><b className="text-end">{b.trend ? t(trendKey(b.trend)) : '—'}{b.next ? ` · ${t(b.next.type === 'high' ? 'br_high_at' : 'br_low_at', { t: fmtTime(b.next.at) })}` : ''}</b></div>
              {b.win && <div className={row}><span className="muted">{t('br_fishing')}</span><b className="tabular-nums">{fmtTime(b.win.start)}–{fmtTime(b.win.end)}</b></div>}
              <div className="py-2.5">
                <p className="muted">{t('br_coming')}</p>
                <ul className="mt-1 space-y-0.5">{b.coming.map((m, k) => <li key={k} className="font-medium">• {tm(m)}</li>)}</ul>
              </div>
            </>
          ) : <p className="muted py-2.5">{t('br_no_forecast')}</p>}
          <div className={row}>
            <span className="muted flex items-center gap-1.5"><Fuel size={14} /> {t('br_fuel')}</span>
            {nav.fuelL != null ? <b dir="ltr" className="text-end tabular-nums">{Math.round(nav.fuelL)} L{range != null ? ` · ≈ ${Math.round(range)} NM` : ''}</b>
              : <Link href="/settings" className="font-semibold text-lagoon underline dark:text-shallows">{t('br_fuel_set')}</Link>}
          </div>
          <div className={row}>
            <span className="muted flex items-center gap-1.5"><CheckSquare size={14} /> {t('br_checklist')}</span>
            <Link href="/safety#checklist" className={`font-bold tabular-nums underline ${done === list.items.length ? 'text-good' : 'text-amber-600 dark:text-amber-300'}`}>{done}/{list.items.length}</Link>
          </div>
        </div>
        <p className="muted mt-2 text-[11px] leading-snug">{t('br_note')}</p>
        <button onClick={onStart} className="tap mt-4 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-good text-xl font-bold uppercase tracking-wide text-white shadow-lg">
          <Play size={22} fill="#fff" /> {t('start_trip')}
        </button>
        <button onClick={onClose} className="tap mt-2 h-12 w-full rounded-2xl bg-slate-100 font-semibold dark:bg-white/10">{t('cancel')}</button>
      </div>
    </Sheet>
  );
}

