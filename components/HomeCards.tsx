// Home cards: navigation status (never starts GPS by itself), Ask Bahrna with example
// questions, and "Coming up" from the forecast model.
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Compass, LifeBuoy, Mic, TrendingUp, Wrench } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import type { Conditions } from '@/lib/marine/types';
import { outlook } from '@/lib/marine/outlook';
import { useTracker } from '@/lib/nav/tracker';
import { MIN_COG_KN } from '@/lib/nav/gpsfilter';
import { distUnit, fmtDist, fmtLat, fmtLon } from '@/lib/nav/geo';
import { ask } from '@/lib/ai/captain';
import { dueState, useMaint } from '@/lib/maintenance';
import { CaptainSheet } from './CaptainSheet';
import { SourceTag } from './ui';

const pad3 = (n: number) => String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0');

export function NavStatusCard() {
  const { t } = useT();
  const s = useTracker();
  const on = !['off', 'denied', 'unsupported', 'unavailable'].includes(s.gps);
  const p = s.pos;
  return (
    <Link href="/navigate" className="card tap block p-4 text-sm">
      <p className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold"><Compass size={18} className="text-lagoon dark:text-shallows" /> {t('hc_nav')}</span>
        <span className={`chip ${s.trip ? 'bg-good/10 text-good' : on ? 'bg-lagoon/10 text-lagoon dark:text-shallows' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>
          {s.trip ? t('hc_recording') : on ? t(`hc_gps_${s.gps}` as Key) : t('hc_gps_off')}
        </span>
      </p>
      {on && p ? (
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-3"><dt className="muted text-[11px]">{t('em_coords')}</dt><dd dir="ltr" className="font-semibold tabular-nums">{fmtLat(p.lat)} {fmtLon(p.lon)} <span className="muted text-xs">±{Math.round(p.acc)} m</span></dd></div>
          <div><dt className="muted text-[11px]">SOG</dt><dd className="font-display text-2xl font-semibold tabular-nums">{p.speedKn != null ? p.speedKn.toFixed(1) : '—'}<span className="muted ms-0.5 text-xs">{t('unit_kn')}</span></dd></div>
          <div><dt className="muted text-[11px]">COG</dt><dd className="font-display text-2xl font-semibold tabular-nums">{p.cog != null && (p.speedKn ?? 0) >= MIN_COG_KN ? `${pad3(p.cog)}°` : '—'}</dd></div>
          <div><dt className="muted text-[11px]">{t('distance')}</dt><dd className="font-display text-2xl font-semibold tabular-nums">{s.trip ? fmtDist(s.trip.distanceNm) : '—'}<span className="muted ms-0.5 text-xs">{s.trip ? distUnit(s.trip.distanceNm) : ''}</span></dd></div>
        </dl>
      ) : (
        <p className="muted mt-2">{t('hc_nav_off')}</p>
      )}
      <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-lagoon dark:text-shallows">{t('hc_open_nav')} <ChevronRight size={14} className="rtl:rotate-180" /></span>
    </Link>
  );
}

const EXAMPLES: Key[] = ['hc_ex1', 'hc_ex2', 'hc_ex3', 'hc_ex4'];

export function AskCard() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const go = (q?: string) => { setOpen(true); if (q) setTimeout(() => ask(q), 50); };
  return (
    <>
    <section className="rounded-3xl bg-abyss p-4 text-white shadow-lg">
      <button onClick={() => go()} className="tap flex w-full items-center gap-3 text-start">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-shallows text-abyss"><Mic size={24} /></span>
        <span><span className="block font-display text-2xl font-semibold leading-none">{t('ai_ask')}</span><span className="block text-xs text-white/70">{t('hc_ask_sub')}</span></span>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((k) => (
          <button key={k} onClick={() => go(t(k))} className="tap h-9 rounded-full bg-white/10 px-3 text-xs font-semibold">“{t(k)}”</button>
        ))}
      </div>
    </section>
    {/* Outside the dark card so the sheet doesn't inherit its white text */}
    <CaptainSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ComingUpCard({ data, i }: { data: Conditions; i: number }) {
  const { t, tm } = useT();
  const msgs = outlook(data, i, 12);
  return (
    <section className="card p-4 text-sm">
      <p className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold"><TrendingUp size={18} className="text-lagoon dark:text-shallows" /> {t('hc_coming')}</span>
        <SourceTag kind="live" />
      </p>
      <ul className="mt-2 space-y-1.5">{msgs.map((m, k) => <li key={k} className="flex gap-2"><span className="text-lagoon dark:text-shallows">•</span><span>{tm(m)}</span></li>)}</ul>
      <p className="muted mt-2 text-[11px]">{t('hc_coming_note')}</p>
    </section>
  );
}

export function SafetyMaintRow() {
  const { t } = useT();
  const due = useMaint().filter((m) => dueState(m) !== 'ok').length;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Link href="/safety" className="card tap flex items-center gap-4 p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bad/10 text-bad"><LifeBuoy size={24} /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">{t('sf_title')}</span><span className="muted block text-sm">{t('hc_safety_t')}</span></span>
        <ChevronRight className="shrink-0 text-slate-400 rtl:rotate-180" />
      </Link>
      {due > 0 && (
        <Link href="/settings" className="card tap flex items-center gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-caution/15 text-amber-700 dark:text-amber-300"><Wrench size={24} /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold">{t('mt_t')}</span><span className="muted block text-sm">{t('hc_maint_due', { n: due })}</span></span>
          <ChevronRight className="shrink-0 text-slate-400 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}
