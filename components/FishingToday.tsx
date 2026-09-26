import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import type { Conditions } from '@/lib/marine/types';
import { FishingHour, FishingWindow, fishingLabel } from '@/lib/marine/assess';
import { dayKey, fmtTime } from '@/lib/marine/time';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { SourceTag } from './ui';

const scoreColor = (s: number) => (s >= 75 ? '#0E9F6E' : s >= 60 ? '#0E7C86' : s >= 45 ? '#D99A0B' : '#D64545');
const FACTORS: { k: keyof FishingHour['parts']; max: number; label: Key }[] = [
  { k: 'tide', max: 35, label: 'tide' },
  { k: 'light', max: 25, label: 'f_light' },
  { k: 'wind', max: 15, label: 'wind' },
  { k: 'waves', max: 10, label: 'waves' },
  { k: 'moon', max: 10, label: 'moon' },
];

/** Answer first (score and best windows), then the factors behind it. */
export function FishingToday({ data, hours, windows, now, compact = false }:
  { data: Conditions; hours: FishingHour[]; windows: FishingWindow[]; now: number; compact?: boolean }) {
  const { t, tm } = useT();
  const top = windows.length ? windows.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const peak = top ? hours.filter((h) => h.at >= top.start && h.at < top.end).reduce((a, b) => (b.score > a.score ? b : a), hours[0]) : hours.find((h) => h.at >= now - 3600e3);
  const score = top?.score ?? peak?.score ?? 0;
  const R = 40, C = 2 * Math.PI * R;
  const pros = top?.factors.filter((f) => f.effect === 'plus').slice(0, 4) ?? [];
  void data;
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{t('fish_today')}</p>
        <SourceTag kind="calc" />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={R} fill="none" className="stroke-slate-100 dark:stroke-white/10" strokeWidth="10" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={scoreColor(score)} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * C} ${C}`} className="motion-safe:animate-[ring_1s_ease-out]" />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <span><span className="readout block text-[38px]">{score}</span><span className="muted block text-[10px] font-semibold">/ 100</span></span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[28px] font-bold uppercase leading-none" style={{ color: scoreColor(score) }}>{t(fishingLabel(score))}</p>
          <p className="eyebrow mt-3">{t('top_windows')}</p>
          {windows.length ? (
            <ul className="mt-1 space-y-0.5">
              {windows.map((w) => (
                <li key={w.start} className="readout text-[22px]">
                  <bdi>{fmtTime(w.start)}–{fmtTime(w.end)}</bdi>
                  {dayKey(w.start) !== dayKey(now) && <span className="muted ms-1 font-sans text-xs">{t('tomorrow')}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-1 text-sm">{t('no_window_today')}</p>}
        </div>
      </div>

      {peak && (
        <div className="mt-4 space-y-1.5">
          {FACTORS.map((f) => {
            const v = Math.max(0, Math.min(1, peak.parts[f.k] / f.max));
            return (
              <div key={f.k} className="flex items-center gap-2 text-xs">
                <span className="w-[4.5rem] shrink-0 font-semibold text-slate-600 dark:text-slate-300">{t(f.label)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(3, v * 100)}%`, background: v >= 0.7 ? '#0E9F6E' : v >= 0.4 ? '#0E7C86' : '#D99A0B' }} />
                </span>
              </div>
            );
          })}
        </div>
      )}
      {!compact && pros.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-white/10">
          {pros.map((f, k) => <li key={k} className="flex items-center gap-2"><Check size={15} className="shrink-0 text-good" />{f.parts.map(tm).join(' · ')}</li>)}
        </ul>
      )}
      {compact && (
        <Link href="/fishing" className="mt-3 flex items-center justify-end gap-1 text-sm font-semibold text-lagoon dark:text-shallows">
          {t('nav_fishing')} <ChevronRight size={16} className="rtl:rotate-180" />
        </Link>
      )}
    </section>
  );
}
