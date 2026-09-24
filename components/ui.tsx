import { ReactNode } from 'react';
import { RefreshCw, TriangleAlert, WifiOff } from 'lucide-react';
import type { Tone } from '@/lib/marine/assess';
import type { Key } from '@/lib/i18n/strings';
import { useT } from '@/lib/i18n/LangContext';

// Every number in the app is labelled with where it came from.
export type SourceKind = 'live' | 'calc' | 'info';
const SOURCE: Record<SourceKind, { label: Key; title: Key; cls: string }> = {
  live: { label: 'src_live', title: 'src_live_t', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200' },
  calc: { label: 'src_calc', title: 'src_calc_t', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200' },
  info: { label: 'src_info', title: 'src_info_t', cls: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300' },
};

export function SourceTag({ kind, className = '' }: { kind: SourceKind; className?: string }) {
  const { t } = useT();
  const s = SOURCE[kind];
  return <span title={t(s.title)} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls} ${className}`}>{t(s.label)}</span>;
}

export const toneText: Record<Tone, string> = {
  good: 'text-good', ok: 'text-lagoon dark:text-shallows', caution: 'text-caution', bad: 'text-bad', unknown: 'text-slate-400',
};
export const toneDot: Record<Tone, string> = {
  good: 'bg-good', ok: 'bg-lagoon', caution: 'bg-caution', bad: 'bg-bad', unknown: 'bg-slate-400',
};

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10 ${className}`} />;
}

export function LoadingScreen() {
  const { t } = useT();
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t('loading')}>
      <Skeleton className="h-64" />
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
    </div>
  );
}

export function ErrorState({ errorKey, onRetry }: { errorKey: string | null; onRetry: () => void }) {
  const { t } = useT();
  const key = (errorKey?.startsWith('err_') ? errorKey : 'err_generic') as Key;
  return (
    <div className="card p-5 text-center">
      <TriangleAlert className="mx-auto text-caution" />
      <p className="mt-2 font-semibold">{t('err_title')}</p>
      <p className="muted mt-1 text-sm">{t(key)}. {t(key === 'err_no_internet' ? 'err_hint_net' : 'err_hint_wait')}</p>
      <button onClick={onRetry} className="tap mt-4 inline-flex items-center gap-2 rounded-full bg-abyss px-5 py-2.5 text-sm font-semibold text-white">
        <RefreshCw size={15} /> {t('try_again')}
      </button>
    </div>
  );
}

export function OfflineBanner({ savedAt }: { savedAt: string }) {
  const { t, lang } = useT();
  const label = new Date(savedAt).toLocaleString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <WifiOff size={14} className="shrink-0" /> {t('offline', { time: label })}
    </div>
  );
}

/** Value or a clear "no data" dash. */
export function Val({ v, children }: { v: unknown; children: ReactNode }) {
  return v == null || (typeof v === 'number' && Number.isNaN(v)) ? <span className="text-slate-400">—</span> : <>{children}</>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1 pt-2">
      <h2 className="font-display text-xl font-semibold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

export function Planned({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="card flex gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="muted mt-0.5 text-sm leading-snug">{text}</p>
      </div>
    </div>
  );
}
