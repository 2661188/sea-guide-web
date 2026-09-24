import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Phone, ShipWheel, X } from 'lucide-react';
import { useSpot } from '@/lib/SpotContext';
import { useConditions } from '@/lib/useConditions';
import { useT } from '@/lib/i18n/LangContext';
import { contactLabel, spotName } from '@/lib/i18n/place';
import { findExtremes, hourIndex, tideTrend, trendKey } from '@/lib/marine/tides';
import { fishingHours, fishingWindows, seaSummary } from '@/lib/marine/assess';
import { nowLocalMs, dayKey, fmtTime, untilMsg } from '@/lib/marine/time';
import { SourceTag } from './ui';

// Phase 1: answers built only from live app data (no AI model yet, no invented facts).
// Phase 6 adds a real AI chat behind /api/captain once an API key is configured.
export function CaptainSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { spot, region } = useSpot();
  const { data } = useConditions(spot.id);
  const { t, tm, lang } = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const answers = useMemo(() => {
    if (!data) return null;
    const now = nowLocalMs(data.utcOffsetSeconds);
    const i = hourIndex(data.hourly.time, now);
    const next = findExtremes(data.hourly.time, data.hourly.seaLevel).filter((e) => e.at > now).slice(0, 2);
    const trend = tideTrend(data.hourly.seaLevel, i);
    const s = seaSummary(data, i);
    const win = fishingWindows(data, fishingHours(data), dayKey(now), now, 1)[0];
    const sep = lang === 'ar' ? '، ' : ', ';
    return {
      tide: trend
        ? t('a_tide', {
          trend: t(trendKey(trend)),
          events: next.map((e) => t('a_event', {
            type: t(e.type === 'high' ? 'high_tide' : 'low_tide'), time: fmtTime(e.at), h: e.height.toFixed(2), until: tm(untilMsg(e.at, now)),
          })).join(lang === 'ar' ? '؛ ' : '; '),
        })
        : t('a_tide_na'),
      sea: `${t(s.level)}. ${s.reasons.map(tm).join('. ')}.`,
      fish: win
        ? t('a_fish', {
          from: fmtTime(win.start), to: fmtTime(win.end), label: t(win.label),
          factors: win.factors.slice(0, 3).map((f) => f.parts.map(tm).join(' ')).join(sep),
        })
        : t('a_fish_none'),
    };
  }, [data, t, tm, lang]);

  if (!open) return null;
  const coastGuard = region.emergency.find((e) => /coast/i.test(e.label));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('captain')}>
      <button className="absolute inset-0 bg-abyss/50 backdrop-blur-[2px]" aria-label={t('close')} onClick={onClose} />
      <div className="animate-rise relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40]">
        <div className="sticky top-0 flex items-center justify-between bg-inherit px-5 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-abyss text-shallows"><ShipWheel size={20} /></span>
            <div>
              <h2 className="font-display text-2xl font-semibold leading-none">{t('captain')}</h2>
              <p className="muted text-xs">{t('captain_sub', { spot: spotName(spot, lang) })}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t('close')}><X size={20} /></button>
        </div>

        <div className="space-y-3 px-5 pb-5">
          {!answers && <p className="muted py-6 text-center text-sm">{t('waiting')}</p>}
          {answers && ([
            ['q_tide', answers.tide, 'live'],
            ['q_sea', answers.sea, 'calc'],
            ['q_fish', answers.fish, 'calc'],
          ] as const).map(([q, a, kind]) => (
            <div key={q} className="rounded-2xl bg-salt p-4 dark:bg-white/5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{t(q)}</p>
                <SourceTag kind={kind} className="shrink-0" />
              </div>
              <p className="mt-1.5 text-[15px] leading-snug">{a}</p>
            </div>
          ))}
          <Link href="/trips" onClick={onClose} className="block rounded-2xl bg-salt p-4 text-sm font-semibold dark:bg-white/5">
            {t('q_check')} <span className="text-lagoon">{t('checklist_link')}</span>
          </Link>

          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm dark:border-white/15">
            <p className="font-semibold">{t('ask_title')}</p>
            <p className="muted mt-1">{t('ask_body')}</p>
          </div>

          {coastGuard && (
            <a href={`tel:${coastGuard.number}`} className="tap flex items-center justify-between rounded-2xl bg-bad/10 p-4 text-bad">
              <span className="font-semibold">{t('emergency_call', { label: contactLabel(coastGuard, lang) })}</span>
              <span className="flex items-center gap-1.5 font-display text-2xl font-bold"><Phone size={18} />{coastGuard.number}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
